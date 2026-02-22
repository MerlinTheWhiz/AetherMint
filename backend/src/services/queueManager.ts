/**
 * Queue Manager Service
 * Handles offline data queuing and processing for synchronization
 */

import { EventEmitter } from 'events';
import { SyncQueueItem } from '../models/SyncStatus';

export interface QueueStats {
  totalItems: number;
  pendingItems: number;
  processingItems: number;
  failedItems: number;
  completedItems: number;
}

export interface QueueFilter {
  deviceId?: string;
  entityType?: string;
  status?: SyncQueueItem['status'];
  priority?: SyncQueueItem['priority'];
  olderThan?: Date;
}

export class QueueManager extends EventEmitter {
  private queues: Map<string, SyncQueueItem[]> = new Map();
  private processing: Set<string> = new Set();
  private retryTimers: Map<string, any> = new Map();

  constructor() {
    super();
  }

  /**
   * Add an item to the sync queue
   */
  async enqueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<SyncQueueItem> {
    const queueItem: SyncQueueItem = {
      ...item,
      id: this.generateItemId(),
      timestamp: new Date(),
      retryCount: 0
    };

    const deviceQueue = this.queues.get(item.deviceId) || [];
    deviceQueue.push(queueItem);
    this.queues.set(item.deviceId, deviceQueue);

    // Sort by priority and timestamp
    deviceQueue.sort((a, b) => {
      const priorityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    this.emit('itemQueued', queueItem);
    return queueItem;
  }

  /**
   * Get queued items for a device
   */
  async getQueuedItems(deviceId: string, limit?: number): Promise<SyncQueueItem[]> {
    const queue = this.queues.get(deviceId) || [];
    const pendingItems = queue.filter(item => item.status === 'pending');
    
    if (limit) {
      return pendingItems.slice(0, limit);
    }
    
    return pendingItems;
  }

  /**
   * Get count of pending items for a device
   */
  async getPendingCount(deviceId: string): Promise<number> {
    const queue = this.queues.get(deviceId) || [];
    return queue.filter(item => item.status === 'pending').length;
  }

  /**
   * Process a queue item
   */
  async processItem(item: SyncQueueItem): Promise<void> {
    if (this.processing.has(item.id)) {
      throw new Error(`Item ${item.id} is already being processed`);
    }

    this.processing.add(item.id);
    item.status = 'processing';

    try {
      // Simulate processing - in real implementation, this would sync with backend
      await this.simulateSyncOperation(item);
      
      item.status = 'completed';
      this.emit('itemProcessed', item);
      
    } catch (error) {
      item.retryCount++;
      
      if (item.retryCount < item.maxRetries) {
        item.status = 'pending';
        this.scheduleRetry(item);
        this.emit('itemRetryScheduled', item);
      } else {
        item.status = 'failed';
        this.emit('itemFailed', item);
      }
    } finally {
      this.processing.delete(item.id);
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(deviceId?: string): QueueStats {
    let allItems: SyncQueueItem[] = [];
    
    if (deviceId) {
      allItems = this.queues.get(deviceId) || [];
    } else {
      for (const queue of this.queues.values()) {
        allItems = allItems.concat(queue);
      }
    }

    return {
      totalItems: allItems.length,
      pendingItems: allItems.filter(item => item.status === 'pending').length,
      processingItems: allItems.filter(item => item.status === 'processing').length,
      failedItems: allItems.filter(item => item.status === 'failed').length,
      completedItems: allItems.filter(item => item.status === 'completed').length
    };
  }

  /**
   * Filter queue items
   */
  filterQueue(filter: QueueFilter): SyncQueueItem[] {
    let items: SyncQueueItem[] = [];
    
    if (filter.deviceId) {
      items = this.queues.get(filter.deviceId) || [];
    } else {
      for (const queue of this.queues.values()) {
        items = items.concat(queue);
      }
    }

    return items.filter(item => {
      if (filter.entityType && item.entityType !== filter.entityType) return false;
      if (filter.status && item.status !== filter.status) return false;
      if (filter.priority && item.priority !== filter.priority) return false;
      if (filter.olderThan && new Date(item.timestamp) >= filter.olderThan) return false;
      return true;
    });
  }

  /**
   * Retry failed items
   */
  async retryFailedItems(deviceId?: string): Promise<number> {
    let retriedCount = 0;
    
    const queues = deviceId ? [deviceId] : Array.from(this.queues.keys());
    
    for (const queueId of queues) {
      const queue = this.queues.get(queueId) || [];
      const failedItems = queue.filter(item => item.status === 'failed');
      
      for (const item of failedItems) {
        item.status = 'pending';
        item.retryCount = 0;
        retriedCount++;
      }
    }
    
    this.emit('itemsRetried', retriedCount);
    return retriedCount;
  }

  /**
   * Clear completed items from queue
   */
  clearCompletedItems(deviceId?: string): number {
    let clearedCount = 0;
    
    const queues = deviceId ? [deviceId] : Array.from(this.queues.keys());
    
    for (const queueId of queues) {
      const queue = this.queues.get(queueId) || [];
      const originalLength = queue.length;
      
      const filteredQueue = queue.filter(item => item.status !== 'completed');
      this.queues.set(queueId, filteredQueue);
      
      clearedCount += originalLength - filteredQueue.length;
    }
    
    this.emit('itemsCleared', clearedCount);
    return clearedCount;
  }

  /**
   * Get item by ID
   */
  getItem(itemId: string): SyncQueueItem | undefined {
    for (const queue of this.queues.values()) {
      const item = queue.find(i => i.id === itemId);
      if (item) return item;
    }
    return undefined;
  }

  /**
   * Update item status
   */
  updateItemStatus(itemId: string, status: SyncQueueItem['status']): boolean {
    const item = this.getItem(itemId);
    if (item) {
      item.status = status;
      this.emit('itemUpdated', item);
      return true;
    }
    return false;
  }

  /**
   * Remove item from queue
   */
  removeItem(itemId: string): boolean {
    for (const [deviceId, queue] of this.queues.entries()) {
      const index = queue.findIndex(item => item.id === itemId);
      if (index !== -1) {
        const removedItem = queue.splice(index, 1)[0];
        this.queues.set(deviceId, queue);
        this.emit('itemRemoved', removedItem);
        return true;
      }
    }
    return false;
  }

  /**
   * Schedule retry for failed item
   */
  private scheduleRetry(item: SyncQueueItem): void {
    const delay = Math.min(Math.pow(2, item.retryCount) * 1000, 30000); // Exponential backoff, max 30s
    
    const timer = setTimeout(async () => {
      try {
        await this.processItem(item);
      } catch (error) {
        console.error(`Retry failed for item ${item.id}:`, error);
      }
    }, delay);
    
    this.retryTimers.set(item.id, timer);
  }

  /**
   * Simulate sync operation (replace with actual implementation)
   */
  private async simulateSyncOperation(item: SyncQueueItem): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // Simulate occasional failures (10% chance)
    if (Math.random() < 0.1) {
      throw new Error('Simulated sync failure');
    }
    
    console.log(`Processed ${item.operation} for ${item.entityType}:${item.entityId}`);
  }

  /**
   * Generate unique item ID
   */
  private generateItemId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear all retry timers
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();
    
    // Clear queues
    this.queues.clear();
    this.processing.clear();
    
    // Remove all listeners
    this.removeAllListeners();
  }
}
