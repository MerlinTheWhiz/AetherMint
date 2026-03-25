import { useState, useEffect } from 'react';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncs, setPendingSyncs] = useState<number>(0);

  useEffect(() => {
    // Initial check
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      syncPendingData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncPendingData = async () => {
    // Logic to sync data stored in IndexedDB or localStorage while offline
    console.log('Restored connection. Syncing data...');
    // Placeholder for actual sync logic
    setPendingSyncs(0);
  };

  const queueAction = (action: any) => {
    if (!isOnline) {
      setPendingSyncs(prev => prev + 1);
      // Save action to local storage/IndexedDB
      console.log('Offline: Action queued', action);
    }
  };

  return { isOnline, pendingSyncs, queueAction };
};