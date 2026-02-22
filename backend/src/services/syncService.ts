/**
 * Data Synchronization Service
 * Handles device registration, sync coordination, and status tracking
 */

import { EventEmitter } from 'events';
import { 
  Device, 
  SyncStatus, 
  SyncSession, 
  SyncConfiguration,
  SyncEvent,
  SyncState,
  SyncMetrics,
  ConflictResolutionStrategy
} from '../models/SyncStatus';
import { ConflictResolutionService } from './conflictResolution';
import { QueueManager } from './queueManager';
import logger from '../utils/logger';

export class SyncService extends EventEmitter {
  private devices: Map<string, Device> = new Map();
  private syncStatuses: Map<string, SyncStatus> = new Map();
  private activeSessions: Map<string, SyncSession> = new Map();
  private configurations: Map<string, SyncConfiguration> = new Map();
  private metrics: SyncMetrics;
  private syncInterval: any = null;

  constructor(
    private conflictResolution: ConflictResolutionService,
    private queueManager: QueueManager
  ) {
    super();
    this.metrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncTime: 0,
      totalDataTransferred: 0,
      conflictsResolved: 0,
      lastSyncTime: new Date(),
      devicesActive: 0
    };
  }

  /**
   * Register a new device for synchronization
   */
  async registerDevice(deviceData: Omit<Device, 'id' | 'registeredAt' | 'syncVersion'>): Promise<Device> {
    const device: Device = {
      ...deviceData,
      id: this.generateDeviceId(),
      registeredAt: new Date(),
      syncVersion: 1
    };

    this.devices.set(device.id, device);
    
    // Initialize sync status for the device
    const syncStatus: SyncStatus = {
      userId: device.userId,
      deviceId: device.id,
      state: SyncState.IDLE,
      lastSyncTime: new Date(),
      pendingItems: 0,
      failedItems: 0,
      conflicts: 0,
      syncVersion: 1,
      isOnline: device.isOnline
    };
    this.syncStatuses.set(device.id, syncStatus);

    // Set default configuration
    const config: SyncConfiguration = {
      autoSync: true,
      syncInterval: 5,
      maxRetries: 3,
      conflictResolution: ConflictResolutionStrategy.LAST_WRITE_WINS,
      syncOnWifiOnly: false,
      syncOnBatteryOnly: false,
      maxStorageUsage: 100,
      batchSize: 50,
      enableRealTimeSync: true
    };
    this.configurations.set(device.id, config);

    this.emitEvent('device_registered', device.userId, device);
    logger.info(`Device registered: ${device.id} for user: ${device.userId}`);
    
    return device;
  }

  /**
   * Start synchronization for a device
   */
  async startSync(deviceId: string): Promise<SyncSession> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const syncStatus = this.syncStatuses.get(deviceId);
    if (!syncStatus) {
      throw new Error(`Sync status for device ${deviceId} not found`);
    }

    if (syncStatus.state === SyncState.SYNCING) {
      throw new Error(`Sync already in progress for device ${deviceId}`);
    }

    const session: SyncSession = {
      id: this.generateSessionId(),
      deviceId,
      userId: device.userId,
      startTime: new Date(),
      status: SyncState.SYNCING,
      itemsProcessed: 0,
      totalItems: await this.queueManager.getPendingCount(deviceId),
      conflicts: [],
      errors: []
    };

    this.activeSessions.set(session.id, session);
    syncStatus.state = SyncState.SYNCING;
    
    this.emitEvent('sync_started', device.userId, { sessionId: session.id, deviceId });
    logger.info(`Sync started for device: ${deviceId}, session: ${session.id}`);

    // Process sync in background
    this.processSync(session).catch((error: Error) => {
      logger.error(`Sync failed for device ${deviceId}:`, error);
      this.handleSyncError(session, error);
    });

    return session;
  }

  /**
   * Process synchronization session
   */
  private async processSync(session: SyncSession): Promise<void> {
    const startTime = Date.now();
    const deviceId = session.deviceId;
    const config = this.configurations.get(deviceId);

    try {
      // Get queued items
      const items = await this.queueManager.getQueuedItems(deviceId, config?.batchSize || 50);
      
      for (const item of items) {
        try {
          await this.processSyncItem(item, session);
          session.itemsProcessed++;
        } catch (error: any) {
          session.errors.push(`Failed to process item ${item.id}: ${error.message}`);
          logger.error(`Failed to process sync item ${item.id}:`, error);
        }
      }

      // Handle conflicts
      if (session.conflicts.length > 0) {
        await this.resolveConflicts(session);
      }

      // Complete session
      session.endTime = new Date();
      session.status = SyncState.COMPLETED;
      
      const syncTime = (Date.now() - startTime) / 1000;
      this.updateMetrics(session, syncTime, true);

      // Update sync status
      const syncStatus = this.syncStatuses.get(deviceId);
      if (syncStatus) {
        syncStatus.state = SyncState.COMPLETED;
        syncStatus.lastSyncTime = new Date();
        syncStatus.pendingItems = await this.queueManager.getPendingCount(deviceId);
        syncStatus.conflicts = session.conflicts.length;
      }

      this.emitEvent('sync_completed', session.userId, { sessionId: session.id, syncTime });
      logger.info(`Sync completed for device: ${deviceId}, session: ${session.id}`);

    } catch (error) {
      this.handleSyncError(session, error);
    } finally {
      this.activeSessions.delete(session.id);
    }
  }

  /**
   * Process individual sync item
   */
  private async processSyncItem(item: any, session: SyncSession): Promise<void> {
    // Check for conflicts
    const conflictResult = await this.conflictResolution.detectConflict(item);
    if (conflictResult.hasConflict && conflictResult.conflict) {
      session.conflicts.push(conflictResult.conflict);
      return;
    }

    // Apply the sync operation
    await this.queueManager.processItem(item);
  }

  /**
   * Resolve conflicts in a sync session
   */
  private async resolveConflicts(session: SyncSession): Promise<void> {
    const config = this.configurations.get(session.deviceId);
    
    for (const conflict of session.conflicts) {
      const resolution = await this.conflictResolution.resolveConflict(
        conflict, 
        config?.conflictResolution || ConflictResolutionStrategy.LAST_WRITE_WINS
      );
      
      if (resolution) {
        conflict.resolution = resolution.strategy;
        conflict.resolvedAt = new Date();
        conflict.resolvedBy = 'system';
        
        // Apply the resolution
        await this.conflictResolution.applyResolution(conflict, resolution);
        this.metrics.conflictsResolved++;
      }
    }
  }

  /**
   * Handle sync errors
   */
  private handleSyncError(session: SyncSession, error: any): void {
    session.endTime = new Date();
    session.status = SyncState.ERROR;
    session.errors.push(error.message || 'Unknown error');

    const syncTime = (Date.now() - session.startTime.getTime()) / 1000;
    this.updateMetrics(session, syncTime, false);

    const syncStatus = this.syncStatuses.get(session.deviceId);
    if (syncStatus) {
      syncStatus.state = SyncState.ERROR;
      syncStatus.failedItems++;
    }

    this.emitEvent('sync_failed', session.userId, { sessionId: session.id, error: error.message || 'Unknown error' });
    logger.error(`Sync failed for device: ${session.deviceId}, error: ${error.message || 'Unknown error'}`);
  }

  /**
   * Get sync status for a device
   */
  getSyncStatus(deviceId: string): SyncStatus | undefined {
    return this.syncStatuses.get(deviceId);
  }

  /**
   * Get active sync sessions
   */
  getActiveSessions(): SyncSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get registered devices for a user
   */
  getUserDevices(userId: string): Device[] {
    return Array.from(this.devices.values()).filter(device => device.userId === userId);
  }

  /**
   * Update device online status
   */
  updateDeviceStatus(deviceId: string, isOnline: boolean): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.isOnline = isOnline;
      device.lastActive = new Date();
      
      const syncStatus = this.syncStatuses.get(deviceId);
      if (syncStatus) {
        syncStatus.isOnline = isOnline;
      }

      // Trigger sync if device comes online and has pending items
      if (isOnline && syncStatus && syncStatus.pendingItems > 0) {
        this.startSync(deviceId).catch((error: Error) => {
          logger.error(`Failed to start sync for device ${deviceId}:`, error);
        });
      }
    }
  }

  /**
   * Configure sync settings for a device
   */
  configureSync(deviceId: string, config: Partial<SyncConfiguration>): void {
    const existingConfig = this.configurations.get(deviceId);
    if (existingConfig) {
      this.configurations.set(deviceId, { ...existingConfig, ...config });
    }
  }

  /**
   * Get sync metrics
   */
  getMetrics(): SyncMetrics {
    this.metrics.devicesActive = Array.from(this.devices.values()).filter(d => d.isOnline).length;
    return { ...this.metrics };
  }

  /**
   * Start automatic sync scheduler
   */
  startScheduler(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      const onlineDevices = Array.from(this.devices.values()).filter(device => {
        const config = this.configurations.get(device.id);
        return device.isOnline && config?.autoSync;
      });

      for (const device of onlineDevices) {
        const syncStatus = this.syncStatuses.get(device.id);
        if (syncStatus?.state === SyncState.IDLE && syncStatus.pendingItems > 0) {
          try {
            await this.startSync(device.id);
          } catch (error) {
            logger.error(`Failed to start scheduled sync for device ${device.id}:`, error);
          }
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop automatic sync scheduler
   */
  stopScheduler(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Update sync metrics
   */
  private updateMetrics(session: SyncSession, syncTime: number, success: boolean): void {
    this.metrics.totalSyncs++;
    this.metrics.lastSyncTime = new Date();
    
    if (success) {
      this.metrics.successfulSyncs++;
    } else {
      this.metrics.failedSyncs++;
    }

    // Update average sync time
    const totalTime = this.metrics.averageSyncTime * (this.metrics.totalSyncs - 1) + syncTime;
    this.metrics.averageSyncTime = totalTime / this.metrics.totalSyncs;

    // Update data transferred (estimated)
    this.metrics.totalDataTransferred += session.itemsProcessed * 1024; // 1KB per item estimate
  }

  /**
   * Emit sync events
   */
  private emitEvent(type: string, userId: string, data: any): void {
    const event: SyncEvent = {
      id: this.generateEventId(),
      type: type as any,
      deviceId: data.deviceId,
      userId,
      timestamp: new Date(),
      data
    };

    this.emit('syncEvent', event);
  }

  /**
   * Generate unique IDs
   */
  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
