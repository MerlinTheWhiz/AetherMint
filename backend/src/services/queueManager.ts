/**
 * Offline sync queue manager
 * Queues changes when offline; processes queue when online.
 * GIVEN offline changes, WHEN online, THEN sync processes queue.
 */

import logger from '../utils/logger';
import type { SyncEntityType } from '../models/SyncStatus';

export type QueuedOperationType = 'create' | 'update' | 'delete';

export interface QueuedItem {
  id: string;
  userId: string;
  deviceId: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: QueuedOperationType;
  payload?: Record<string, unknown>;
  version: number;
  queuedAt: Date;
  retryCount: number;
  lastError?: string;
}

export type ProcessItemHandler = (item: QueuedItem) => Promise<void>;

interface QueueManagerOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  maxQueueSize?: number;
}

const defaultOptions: Required<QueueManagerOptions> = {
  maxRetries: 3,
  retryDelayMs: 1000,
  maxQueueSize: 1000
};

/**
 * In-memory queue for offline sync operations.
 * Processes items in order (FIFO) when processQueue() is called (e.g. when device comes online).
 */
class QueueManager {
  private queue: QueuedItem[] = [];
  private processing = false;
  private processHandler: ProcessItemHandler | null = null;
  private options: Required<QueueManagerOptions>;
  private idCounter = 0;

  constructor(options: QueueManagerOptions = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Set the handler that will be invoked for each item when processing the queue.
   */
  setProcessHandler(handler: ProcessItemHandler): void {
    this.processHandler = handler;
  }

  /**
   * Add an item to the queue. Rejects if queue is full.
   */
  enqueue(item: Omit<QueuedItem, 'id' | 'queuedAt' | 'retryCount'>): string {
    if (this.queue.length >= this.options.maxQueueSize) {
      throw new Error(`Sync queue full (max ${this.options.maxQueueSize})`);
    }

    const id = `q_${Date.now()}_${++this.idCounter}`;
    const queuedItem: QueuedItem = {
      ...item,
      id,
      queuedAt: new Date(),
      retryCount: 0
    };
    this.queue.push(queuedItem);
    logger.debug(`Sync queue: enqueued ${item.operation} ${item.entityType}/${item.entityId}, queue size=${this.queue.length}`);
    return id;
  }

  /**
   * Number of items pending in the queue.
   */
  getPendingCount(): number {
    return this.queue.length;
  }

  /**
   * Get all pending items (read-only snapshot).
   */
  getPendingItems(): ReadonlyArray<QueuedItem> {
    return [...this.queue];
  }

  /**
   * Remove items that have been successfully processed (called internally after processItem succeeds).
   */
  removeProcessed(id: string): void {
    this.queue = this.queue.filter((item) => item.id !== id);
  }

  /**
   * Mark item as failed and optionally re-queue for retry.
   */
  private markFailed(item: QueuedItem, error: string): void {
    const index = this.queue.findIndex((q) => q.id === item.id);
    if (index === -1) return;

    const next = { ...item, retryCount: item.retryCount + 1, lastError: error };
    if (next.retryCount >= this.options.maxRetries) {
      this.queue.splice(index, 1);
      logger.warn(`Sync queue: dropped item ${item.id} after ${this.options.maxRetries} retries: ${error}`);
    } else {
      this.queue[index] = next;
      logger.debug(`Sync queue: will retry item ${item.id}, retry ${next.retryCount}/${this.options.maxRetries}`);
    }
  }

  /**
   * Process the queue: for each item, call the process handler. Runs sequentially.
   * Returns number of successfully processed items.
   */
  async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.processing) {
      logger.debug('Sync queue: process already in progress, skipping');
      return { processed: 0, failed: 0 };
    }

    if (!this.processHandler) {
      logger.warn('Sync queue: no process handler set');
      return { processed: 0, failed: 0 };
    }

    this.processing = true;
    let processed = 0;
    let failed = 0;

    try {
      while (this.queue.length > 0) {
        const item = this.queue[0];
        try {
          await this.processHandler(item);
          this.removeProcessed(item.id);
          processed++;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.markFailed(item, message);
          failed++;
          await this.delay(this.options.retryDelayMs);
        }
      }
      if (processed > 0) {
        logger.info(`Sync queue: processed ${processed} items, ${failed} failed`);
      }
    } finally {
      this.processing = false;
    }

    return { processed, failed };
  }

  /**
   * Process queue only for a specific user (e.g. when that user's device comes online).
   */
  async processQueueForUser(userId: string): Promise<{ processed: number; failed: number }> {
    if (this.processing) return { processed: 0, failed: 0 };
    if (!this.processHandler) return { processed: 0, failed: 0 };

    const userItems = this.queue.filter((q) => q.userId === userId);
    if (userItems.length === 0) return { processed: 0, failed: 0 };

    this.processing = true;
    let processed = 0;
    let failed = 0;

    try {
      for (const item of userItems) {
        try {
          await this.processHandler(item);
          this.removeProcessed(item.id);
          processed++;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.markFailed(item, message);
          failed++;
          await this.delay(this.options.retryDelayMs);
        }
      }
    } finally {
      this.processing = false;
    }

    return { processed, failed };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear all items (e.g. for testing or reset).
   */
  clear(): void {
    this.queue = [];
    logger.debug('Sync queue: cleared');
  }

  /**
   * Whether the queue is currently being processed.
   */
  isProcessing(): boolean {
    return this.processing;
  }
}

let queueManagerInstance: QueueManager | null = null;

export function getQueueManager(options?: QueueManagerOptions): QueueManager {
  if (!queueManagerInstance) {
    queueManagerInstance = new QueueManager(options);
  }
  return queueManagerInstance;
}

export default QueueManager;
