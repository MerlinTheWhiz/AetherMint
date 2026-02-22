/**
 * Conflict Resolution Service
 * Handles detection and resolution of data synchronization conflicts
 */

import { 
  SyncConflict, 
  ConflictResolutionStrategy,
  SyncQueueItem 
} from '../models/SyncStatus';

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  resolvedData: any;
  requiresUserInput: boolean;
  message?: string;
}

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflict?: SyncConflict;
  resolution?: ConflictResolution;
}

export class ConflictResolutionService {
  private conflictHistory: Map<string, SyncConflict[]> = new Map();

  /**
   * Detect conflicts between local and remote data
   */
  async detectConflict(item: SyncQueueItem): Promise<ConflictDetectionResult> {
    try {
      // Get remote version of the data
      const remoteData = await this.getRemoteData(item.entityType, item.entityId);
      
      if (!remoteData) {
        // No remote data, no conflict for create operations
        if (item.operation === 'create') {
          return { hasConflict: false };
        }
        // Conflict for update/delete on non-existent remote data
        return this.createConflict(item, remoteData, 'delete_conflict');
      }

      // Compare timestamps and versions
      const localTimestamp = new Date(item.timestamp);
      const remoteTimestamp = new Date(remoteData.updatedAt || remoteData.createdAt);
      
      if (item.operation === 'delete') {
        if (remoteData.deletedAt) {
          return { hasConflict: false }; // Both deleted
        }
        return this.createConflict(item, remoteData, 'delete_conflict');
      }

      if (item.operation === 'update') {
        if (this.hasDataChanged(item.data, remoteData)) {
          if (localTimestamp > remoteTimestamp) {
            // Local is newer, but still check for concurrent modifications
            return this.createConflict(item, remoteData, 'concurrent_update');
          } else {
            // Remote is newer
            return this.createConflict(item, remoteData, 'version_conflict');
          }
        }
      }

      return { hasConflict: false };

    } catch (error) {
      console.error(`Error detecting conflict for item ${item.id}:`, error);
      return { hasConflict: false }; // Proceed on error to avoid blocking
    }
  }

  /**
   * Resolve a conflict using the specified strategy
   */
  async resolveConflict(
    conflict: SyncConflict, 
    strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolution | null> {
    switch (strategy) {
      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        return this.resolveLastWriteWins(conflict);
      
      case ConflictResolutionStrategy.FIRST_WRITE_WINS:
        return this.resolveFirstWriteWins(conflict);
      
      case ConflictResolutionStrategy.MANUAL:
        return this.resolveManual(conflict);
      
      case ConflictResolutionStrategy.MERGE:
        return this.resolveMerge(conflict);
      
      default:
        return null;
    }
  }

  /**
   * Apply conflict resolution
   */
  async applyResolution(conflict: SyncConflict, resolution: ConflictResolution): Promise<void> {
    try {
      // Apply the resolved data to the remote storage
      await this.applyResolvedData(conflict.entityType, conflict.entityId, resolution.resolvedData);
      
      // Store conflict resolution in history
      this.storeConflictResolution(conflict, resolution);
      
    } catch (error) {
      console.error(`Error applying conflict resolution for ${conflict.id}:`, error);
      throw error;
    }
  }

  /**
   * Get conflict history for an entity
   */
  getConflictHistory(entityType: string, entityId: string): SyncConflict[] {
    const key = `${entityType}:${entityId}`;
    return this.conflictHistory.get(key) || [];
  }

  /**
   * Resolve conflict using last-write-wins strategy
   */
  private resolveLastWriteWins(conflict: SyncConflict): ConflictResolution {
    const localTimestamp = new Date(conflict.timestamp);
    const remoteTimestamp = new Date(conflict.remoteData.updatedAt || conflict.remoteData.createdAt);
    
    const resolvedData = localTimestamp > remoteTimestamp ? conflict.localData : conflict.remoteData;
    const winner = localTimestamp > remoteTimestamp ? 'local' : 'remote';
    
    return {
      strategy: ConflictResolutionStrategy.LAST_WRITE_WINS,
      resolvedData,
      requiresUserInput: false,
      message: `Resolved using last-write-wins: ${winner} version selected`
    };
  }

  /**
   * Resolve conflict using first-write-wins strategy
   */
  private resolveFirstWriteWins(conflict: SyncConflict): ConflictResolution {
    const localTimestamp = new Date(conflict.timestamp);
    const remoteTimestamp = new Date(conflict.remoteData.updatedAt || conflict.remoteData.createdAt);
    
    const resolvedData = localTimestamp < remoteTimestamp ? conflict.localData : conflict.remoteData;
    const winner = localTimestamp < remoteTimestamp ? 'local' : 'remote';
    
    return {
      strategy: ConflictResolutionStrategy.FIRST_WRITE_WINS,
      resolvedData,
      requiresUserInput: false,
      message: `Resolved using first-write-wins: ${winner} version selected`
    };
  }

  /**
   * Resolve conflict requiring manual user input
   */
  private resolveManual(conflict: SyncConflict): ConflictResolution {
    return {
      strategy: ConflictResolutionStrategy.MANUAL,
      resolvedData: null, // Will be set by user
      requiresUserInput: true,
      message: 'Manual resolution required - user input needed'
    };
  }

  /**
   * Resolve conflict by merging data
   */
  private resolveMerge(conflict: SyncConflict): ConflictResolution {
    try {
      const mergedData = this.mergeData(conflict.localData, conflict.remoteData);
      
      return {
        strategy: ConflictResolutionStrategy.MERGE,
        resolvedData: mergedData,
        requiresUserInput: false,
        message: 'Resolved by merging local and remote data'
      };
    } catch (error) {
      // If merge fails, fall back to manual resolution
      return this.resolveManual(conflict);
    }
  }

  /**
   * Create a conflict object
   */
  private createConflict(
    item: SyncQueueItem, 
    remoteData: any, 
    conflictType: 'concurrent_update' | 'version_conflict' | 'delete_conflict'
  ): ConflictDetectionResult {
    const conflict: SyncConflict = {
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entityType: item.entityType,
      entityId: item.entityId,
      deviceId: item.deviceId,
      localData: item.data,
      remoteData,
      conflictType: item.operation === 'delete' ? 'delete' : 'update',
      timestamp: new Date()
    };

    return {
      hasConflict: true,
      conflict
    };
  }

  /**
   * Get remote data for comparison
   */
  private async getRemoteData(entityType: string, entityId: string): Promise<any> {
    // This would integrate with your data storage layer
    // For now, return null to simulate no remote data
    // In a real implementation, this would query your database or API
    return null;
  }

  /**
   * Check if data has changed
   */
  private hasDataChanged(localData: any, remoteData: any): boolean {
    // Simple comparison - in a real implementation, this would be more sophisticated
    return JSON.stringify(localData) !== JSON.stringify(remoteData);
  }

  /**
   * Merge two data objects
   */
  private mergeData(localData: any, remoteData: any): any {
    // Simple merge strategy - in a real implementation, this would be more sophisticated
    // and handle different data types and structures
    const merged = { ...remoteData };
    
    for (const key in localData) {
      if (localData.hasOwnProperty(key)) {
        if (typeof localData[key] === 'object' && typeof remoteData[key] === 'object') {
          merged[key] = this.mergeData(localData[key], remoteData[key]);
        } else {
          merged[key] = localData[key];
        }
      }
    }
    
    return merged;
  }

  /**
   * Apply resolved data to storage
   */
  private async applyResolvedData(entityType: string, entityId: string, data: any): Promise<void> {
    // This would integrate with your data storage layer
    // In a real implementation, this would update your database or API
    console.log(`Applying resolved data for ${entityType}:${entityId}`, data);
  }

  /**
   * Store conflict resolution in history
   */
  private storeConflictResolution(conflict: SyncConflict, resolution: ConflictResolution): void {
    const key = `${conflict.entityType}:${conflict.entityId}`;
    const history = this.conflictHistory.get(key) || [];
    
    // Add resolution info to conflict
    const resolvedConflict = {
      ...conflict,
      resolution: resolution.strategy,
      resolvedAt: new Date(),
      resolvedBy: 'system'
    };
    
    history.push(resolvedConflict);
    
    // Keep only last 10 conflicts per entity
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
    
    this.conflictHistory.set(key, history);
  }
}
