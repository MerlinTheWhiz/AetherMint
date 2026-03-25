/**
 * Service Worker for AetherMint PWA
 * Handles offline caching, background sync, and push notifications
 */

const CACHE_NAME = 'aethermint-education-v1';
const STATIC_CACHE_NAME = 'aethermint-static-v1';
const DYNAMIC_CACHE_NAME = 'aethermint-dynamic-v1';
const API_CACHE_NAME = 'aethermint-api-v1';

// Cache URLs
const STATIC_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/js/',
  '/icons/',
  '/images/'
];

const API_URLS = [
  '/api/courses',
  '/api/user/profile',
  '/api/analytics',
  '/api/content'
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    (async () => {
      try {
        // Create caches
        const staticCache = await caches.open(STATIC_CACHE_NAME);
        const dynamicCache = await caches.open(DYNAMIC_CACHE_NAME);
        const apiCache = await caches.open(API_CACHE_NAME);
        
        // Cache static assets
        console.log('📦 Caching static assets...');
        await staticCache.addAll(STATIC_URLS);
        
        // Cache essential API responses
        console.log('🌐 Pre-caching essential API data...');
        await cacheEssentialData(apiCache);
        
        console.log('✅ Service Worker installed successfully');
      } catch (error) {
        console.error('❌ Service Worker installation failed:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...');
  
  event.waitUntil(
    (async () => {
      try {
        // Get all cache names
        const cacheNames = await caches.keys();
        
        // Delete old caches
        const oldCaches = cacheNames.filter(name => 
          name !== STATIC_CACHE_NAME && 
          name !== DYNAMIC_CACHE_NAME && 
          name !== API_CACHE_NAME
        );
        
        await Promise.all(
          oldCaches.map(name => {
            console.log('🗑️ Deleting old cache:', name);
            return caches.delete(name);
          })
        );
        
        console.log('✅ Service Worker activated successfully');
      } catch (error) {
        console.error('❌ Service Worker activation failed:', error);
      }
    })()
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different request types
  if (isStaticAsset(request.url)) {
    event.respondWith(handleStaticRequest(request));
  } else if (isAPIRequest(request.url)) {
    event.respondWith(handleAPIRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Handle static asset requests
async function handleStaticRequest(request) {
  return cacheWithStrategy(request, CACHE_STRATEGIES.CACHE_FIRST, STATIC_CACHE_NAME);
}

// Handle API requests
async function handleAPIRequest(request) {
  // Try network first for API requests
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('🌐 Network failed, trying cache for:', request.url);
  }
  
  // Fallback to cache
  return cacheWithStrategy(request, CACHE_STRATEGIES.CACHE_ONLY, API_CACHE_NAME);
}

// Handle dynamic page requests
async function handleDynamicRequest(request) {
  return cacheWithStrategy(request, CACHE_STRATEGIES.STALE_WHILE_REVALIDATE, DYNAMIC_CACHE_NAME);
}

// Cache strategy implementation
async function cacheWithStrategy(request, strategy, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      if (cachedResponse) {
        return cachedResponse;
      }
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        return cachedResponse || new Response('Offline', { status: 503 });
      }
      
    case CACHE_STRATEGIES.NETWORK_FIRST:
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        return cachedResponse || new Response('Offline', { status: 503 });
      }
      
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      // Return cached version immediately
      if (cachedResponse) {
        // Revalidate in background
        fetch(request).then(networkResponse => {
          if (networkResponse.ok) {
            cache.put(request, networkResponse);
          }
        }).catch(() => {
          // Ignore network errors for revalidation
        });
        return cachedResponse;
      }
      
      // No cache, fetch from network
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        return new Response('Offline', { status: 503 });
      }
      
    case CACHE_STRATEGIES.CACHE_ONLY:
      return cachedResponse || new Response('Not found', { status: 404 });
      
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);
      
    default:
      return fetch(request);
  }
}

// Check if request is for static asset
function isStaticAsset(url) {
  return STATIC_URLS.some(staticUrl => url.includes(staticUrl)) ||
         url.includes('/_next/static/') ||
         url.includes('/icons/') ||
         url.includes('/images/') ||
         url.endsWith('.css') ||
         url.endsWith('.js') ||
         url.endsWith('.png') ||
         url.endsWith('.jpg') ||
         url.endsWith('.jpeg') ||
         url.endsWith('.gif') ||
         url.endsWith('.svg') ||
         url.endsWith('.woff') ||
         url.endsWith('.woff2');
}

// Check if request is for API
function isAPIRequest(url) {
  return API_URLS.some(apiUrl => url.includes(apiUrl)) ||
         url.includes('/api/');
}

// Cache essential data for offline use
async function cacheEssentialData(apiCache) {
  try {
    // Cache user profile if available
    const profileResponse = await fetch('/api/user/profile');
    if (profileResponse.ok) {
      apiCache.put('/api/user/profile', profileResponse);
    }
    
    // Cache enrolled courses
    const coursesResponse = await fetch('/api/courses');
    if (coursesResponse.ok) {
      apiCache.put('/api/courses', coursesResponse);
    }
    
    // Cache basic analytics
    const analyticsResponse = await fetch('/api/analytics/summary');
    if (analyticsResponse.ok) {
      apiCache.put('/api/analytics/summary', analyticsResponse);
    }
  } catch (error) {
    console.log('⚠️ Failed to cache essential data:', error);
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  try {
    // Get queued actions from IndexedDB
    const queuedActions = await getQueuedActions();
    
    for (const action of queuedActions) {
      try {
        // Retry the failed request
        const response = await fetch(action.url, action.options);
        
        if (response.ok) {
          // Remove from queue on success
          await removeQueuedAction(action.id);
          console.log('✅ Background sync completed for:', action.type);
        }
      } catch (error) {
        console.error('❌ Background sync failed for:', action.type, error);
      }
    }
  } catch (error) {
    console.error('❌ Background sync error:', error);
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received:', event);
  
  const options = {
    body: event.data?.text() || 'You have a new notification from AetherMint',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: event.data?.json() || {},
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('AetherMint', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// IndexedDB helpers for offline queue
async function getQueuedActions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AetherMintOfflineQueue', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['actions'], 'readonly');
      const store = transaction.objectStore('actions');
      const getAll = store.getAll();
      
      getAll.onsuccess = () => resolve(getAll.result || []);
      getAll.onerror = () => reject(getAll.error);
    };
  });
}

async function removeQueuedAction(actionId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AetherMintOfflineQueue', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      const deleteRequest = store.delete(actionId);
      
      deleteRequest.onsuccess = () => resolve(deleteRequest.result);
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('📨 Message received in service worker:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    // Update specific cache
    updateCache(event.data.url, event.data.data);
  }
});

async function updateCache(url, data) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(url, response);
    console.log('✅ Cache updated for:', url);
  } catch (error) {
    console.error('❌ Failed to update cache:', error);
  }
}
