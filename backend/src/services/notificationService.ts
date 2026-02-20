import { Notification, INotification } from '../models/Notification';
import { getWebsocketService } from './websocketService';
import { logger } from '../utils/logger';

interface NotificationFilter {
  userId?: string;
  category?: 'course' | 'message' | 'system' | 'achievement';
  isRead?: boolean;
  priority?: 'low' | 'medium' | 'high';
  limit?: number;
  skip?: number;
}

interface NotificationPreference {
  userId: string;
  enabledCategories: string[];
  deliveryMethods: ('email' | 'push' | 'websocket')[];
  quietHours?: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

class NotificationService {
  private preferencesMap: Map<string, NotificationPreference> = new Map();

  constructor() {
    // Load preferences from database or cache
    this.loadPreferences();
  }

  private async loadPreferences(): Promise<void> {
    try {
      // In a real implementation, this would load preferences from a database
      // For now, we'll initialize with default preferences
      logger.info('Loading notification preferences...');
    } catch (error) {
      logger.error('Error loading notification preferences:', error);
    }
  }

  public async createNotification(
    userId: string,
    title: string,
    message: string,
    category: 'course' | 'message' | 'system' | 'achievement',
    options?: {
      priority?: 'low' | 'medium' | 'high';
      deliveryMethods?: ('email' | 'push' | 'websocket')[];
      actionUrl?: string;
      metadata?: Record<string, any>;
      scheduledTime?: Date;
    }
  ): Promise<INotification> {
    try {
      const notification = new Notification({
        userId,
        title,
        message,
        category,
        priority: options?.priority || 'medium',
        deliveryMethods: options?.deliveryMethods || ['websocket'],
        actionUrl: options?.actionUrl,
        metadata: options?.metadata,
        scheduledTime: options?.scheduledTime
      });

      await notification.save();

      // Check if user has preferences that allow this notification
      const preferences = await this.getUserPreferences(userId);
      if (this.shouldSendNotification(userId, category, preferences)) {
        // Deliver based on user preferences
        await this.deliverNotification(notification, preferences);
      }

      logger.info(`Notification created for user ${userId}: ${title}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  private async deliverNotification(
    notification: INotification,
    preferences: NotificationPreference
  ): Promise<void> {
    try {
      // Update notification status to indicate it's being delivered
      notification.isDelivered = true;
      notification.sentTime = new Date();
      await notification.save();

      // Deliver via each specified method
      if (preferences.deliveryMethods.includes('websocket')) {
        // Deliver via websocket if user is online
        const websocketService = getWebsocketService();
        websocketService.sendNotification(notification.userId, notification);
      }

      if (preferences.deliveryMethods.includes('email')) {
        // Queue email delivery
        await this.queueEmailDelivery(notification);
      }

      if (preferences.deliveryMethods.includes('push')) {
        // Queue push notification delivery
        await this.queuePushDelivery(notification);
      }
    } catch (error) {
      logger.error('Error delivering notification:', error);
      throw error;
    }
  }

  private async queueEmailDelivery(notification: INotification): Promise<void> {
    // In a real implementation, this would queue the email for delivery
    // using a service like SendGrid, AWS SES, etc.
    logger.info(`Queued email delivery for notification ${notification._id} to user ${notification.userId}`);
  }

  private async queuePushDelivery(notification: INotification): Promise<void> {
    // In a real implementation, this would queue the push notification for delivery
    // using a service like Firebase Cloud Messaging, OneSignal, etc.
    logger.info(`Queued push delivery for notification ${notification._id} to user ${notification.userId}`);
  }

  public async getNotifications(
    filter: NotificationFilter
  ): Promise<{ notifications: INotification[]; totalCount: number }> {
    try {
      const query: any = {};
      
      if (filter.userId) query.userId = filter.userId;
      if (filter.category) query.category = filter.category;
      if (filter.isRead !== undefined) query.isRead = filter.isRead;
      if (filter.priority) query.priority = filter.priority;

      const limit = filter.limit || 20;
      const skip = filter.skip || 0;

      const [notifications, totalCount] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        Notification.countDocuments(query)
      ]);

      return { notifications, totalCount };
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      throw error;
    }
  }

  public async getNotificationById(id: string): Promise<INotification | null> {
    try {
      return await Notification.findById(id).exec();
    } catch (error) {
      logger.error('Error fetching notification by ID:', error);
      throw error;
    }
  }

  public async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await Notification.updateOne(
        { _id: notificationId, userId },
        { isRead: true }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  public async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true }
      );
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  public async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await Notification.deleteOne({ _id: notificationId, userId });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  public async clearAllNotifications(userId: string): Promise<number> {
    try {
      const result = await Notification.deleteMany({ userId });
      return result.deletedCount;
    } catch (error) {
      logger.error('Error clearing all notifications:', error);
      throw error;
    }
  }

  public async setNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreference>
  ): Promise<void> {
    try {
      // In a real implementation, this would save to a database
      // For now, we'll store in memory
      const existingPrefs = await this.getUserPreferences(userId);
      
      const newPrefs: NotificationPreference = {
        userId,
        enabledCategories: preferences.enabledCategories || existingPrefs.enabledCategories || [],
        deliveryMethods: preferences.deliveryMethods || existingPrefs.deliveryMethods || ['websocket'],
        quietHours: preferences.quietHours || existingPrefs.quietHours
      };

      this.preferencesMap.set(userId, newPrefs);
      logger.info(`Updated notification preferences for user ${userId}`);
    } catch (error) {
      logger.error('Error setting notification preferences:', error);
      throw error;
    }
  }

  public async getUserPreferences(userId: string): Promise<NotificationPreference> {
    // In a real implementation, this would fetch from a database
    // Return cached preferences if available
    if (this.preferencesMap.has(userId)) {
      return this.preferencesMap.get(userId)!;
    }

    // Return default preferences
    const defaultPrefs: NotificationPreference = {
      userId,
      enabledCategories: ['course', 'message', 'system', 'achievement'], // Enable all categories by default
      deliveryMethods: ['websocket'], // Default to websocket only
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };

    this.preferencesMap.set(userId, defaultPrefs);
    return defaultPrefs;
  }

  private shouldSendNotification(
    userId: string,
    category: string,
    preferences: NotificationPreference
  ): boolean {
    // Check if category is enabled
    if (!preferences.enabledCategories.includes(category)) {
      return false;
    }

    // Check if currently in quiet hours
    if (preferences.quietHours?.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const { start, end } = preferences.quietHours;
      
      // Simple check for quiet hours - assumes start/end don't cross midnight
      if (start <= end) {
        // Same day quiet hours (e.g., 22:00 to 08:00 is not same day)
        if (currentTime >= start && currentTime <= end) {
          return false;
        }
      } else {
        // Cross midnight quiet hours (e.g., 22:00 to 08:00)
        if (currentTime >= start || currentTime <= end) {
          return false;
        }
      }
    }

    return true;
  }

  public async sendBulkNotification(
    userIds: string[],
    title: string,
    message: string,
    category: 'course' | 'message' | 'system' | 'achievement',
    options?: {
      priority?: 'low' | 'medium' | 'high';
      deliveryMethods?: ('email' | 'push' | 'websocket')[];
      actionUrl?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ success: number; failed: number }> {
    let successCount = 0;
    let failedCount = 0;

    for (const userId of userIds) {
      try {
        await this.createNotification(userId, title, message, category, options);
        successCount++;
      } catch (error) {
        logger.error(`Failed to send notification to user ${userId}:`, error);
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount };
  }
}

export const notificationService = new NotificationService();