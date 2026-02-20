import { useState, useEffect, useCallback } from 'react';

export type NotificationCategory = 'course' | 'message' | 'system' | 'achievement';

export interface Notification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  isRead: boolean;
  timestamp: Date;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface NotificationPreferences {
  categories: {
    [key in NotificationCategory]: {
      enabled: boolean;
      sound: boolean;
      desktop: boolean;
    };
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

const defaultPreferences: NotificationPreferences = {
  categories: {
    course: { enabled: true, sound: true, desktop: true },
    message: { enabled: true, sound: true, desktop: true },
    system: { enabled: true, sound: false, desktop: true },
    achievement: { enabled: true, sound: true, desktop: false },
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all');

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem('notificationPreferences');
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences));
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }, [preferences]);

  // Mock real-time notification generation for demo
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every 10 seconds
        const categories: NotificationCategory[] = ['course', 'message', 'system', 'achievement'];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        
        addNotification({
          title: `New ${randomCategory} update`,
          message: `This is a sample ${randomCategory} notification for demonstration.`,
          category: randomCategory,
          priority: Math.random() > 0.5 ? 'medium' : 'low',
        });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      isRead: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Check if notification should be shown based on preferences
    const categoryPrefs = preferences.categories[notification.category];
    if (!categoryPrefs.enabled) return;

    // Check quiet hours
    if (preferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const { start, end } = preferences.quietHours;
      
      if (currentTime >= start || currentTime <= end) {
        return; // During quiet hours, don't show notifications
      }
    }

    // Play sound if enabled
    if (categoryPrefs.sound) {
      // In a real app, you would play a sound here
      console.log('Playing notification sound');
    }

    // Show desktop notification if enabled and permitted
    if (categoryPrefs.desktop && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
      });
    }
  }, [preferences]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      ...newPreferences,
      categories: {
        ...prev.categories,
        ...(newPreferences.categories || {}),
      },
      quietHours: {
        ...prev.quietHours,
        ...(newPreferences.quietHours || {}),
      },
    }));
  }, []);

  const filteredNotifications = notifications.filter(notification => {
    if (selectedCategory === 'all') return true;
    return notification.category === selectedCategory;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return {
    notifications: filteredNotifications,
    allNotifications: notifications,
    unreadCount,
    preferences,
    isOpen,
    selectedCategory,
    setIsOpen,
    setSelectedCategory,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    updatePreferences,
  };
};
