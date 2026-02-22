/**
 * Sync Status Model
 * Defines the structure and interfaces for data synchronization status tracking
 */

export enum SyncState {
  IDLE = 'idle',
  SYNCING = 'syncing',
  CONFLICT = 'conflict',
  OFFLINE = 'offline',
  ERROR = 'error',
  COMPLETED = 'completed'
}

export enum ConflictResolutionStrategy {
  LAST_WRITE_WINS = 'last_write_wins',
  FIRST_WRITE_WINS = 'first_write_wins',
  MANUAL = 'manual',
  MERGE = 'merge'
}

export interface Device {
  id: string;
  userId: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  platform: string;
  lastActive: Date;
  isOnline: boolean;
  syncVersion: number;
  registeredAt: Date;
}

export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  deviceId: string;
  localData: any;
  remoteData: any;
  conflictType: 'update' | 'delete' | 'create';
  timestamp: Date;
  resolution?: ConflictResolutionStrategy;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface SyncQueueItem {
  id: string;
  deviceId: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface SyncSession {
  id: string;
  deviceId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: SyncState;
  itemsProcessed: number;
  totalItems: number;
  conflicts: SyncConflict[];
  errors: string[];
  lastSyncTimestamp?: Date;
}

export interface SyncStatus {
  userId: string;
  deviceId: string;
  state: SyncState;
  lastSyncTime: Date;
  nextSyncTime?: Date;
  pendingItems: number;
  failedItems: number;
  conflicts: number;
  syncVersion: number;
  isOnline: boolean;
  batteryLevel?: number;
  networkType?: 'wifi' | 'cellular' | 'none';
  storageUsage?: {
    used: number;
    total: number;
  };
}

export interface SyncConfiguration {
  autoSync: boolean;
  syncInterval: number; // in minutes
  maxRetries: number;
  conflictResolution: ConflictResolutionStrategy;
  syncOnWifiOnly: boolean;
  syncOnBatteryOnly: boolean;
  maxStorageUsage: number; // in MB
  batchSize: number;
  enableRealTimeSync: boolean;
}

export interface SyncEvent {
  id: string;
  type: 'sync_started' | 'sync_completed' | 'sync_failed' | 'conflict_detected' | 'device_registered';
  deviceId: string;
  userId: string;
  timestamp: Date;
  data?: any;
  message?: string;
}

export interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncTime: number; // in seconds
  totalDataTransferred: number; // in bytes
  conflictsResolved: number;
  lastSyncTime: Date;
  devicesActive: number;
}
