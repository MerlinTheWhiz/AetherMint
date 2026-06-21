/**
 * AetherMint Service Worker
 * --------------------------------
 * Implements a Workbox-based caching strategy with:
 *   • CacheFirst for static assets (JS, CSS, images, fonts) – long-lived, immutable.
 *   • StaleWhileRevalidate for read-only API content (courses, lessons,
 *     progress) so previously viewed courses are available offline.
 *   • NetworkFirst with a 3s timeout for /api GET requests – fresh by default,
 *     cache-only fallback when the network is slow or unavailable.
 *   • NetworkOnly + BackgroundSync (24h retention) for mutating API calls so
 *     offline progress/quiz submissions replay automatically.
 *   • StaleWhileRevalidate for navigations so subsequent loads are instant
 *     while a fresh copy is fetched in the background.
 *   • An explicit offline fallback page (`/offline`) served from Workbox's
 *     `setCatchHandler` so the app still boots when fully disconnected.
 *   • A `skipWaiting` update flow driven by a `SKIP_WAITING` message from the
 *     client (no automatic activation on install) to avoid breaking
 *     in-flight requests.
 *
 * Source for the Workbox runtime: Google's CDN, pinned to v6.4.1.
 */

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

const SW_VERSION = 'v3';
const IS_DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// Workbox sets `workbox` on `self` after the CDN script is evaluated.
// Anything that uses it must be guarded so we never throw in older browsers.
if (self.workbox) {
  const { routing, strategies, backgroundSync, expiration, precaching } = self.workbox;

  // Avoid polluting caches during development.
  if (IS_DEV) {
    console.log('[AetherMint SW] Development build detected – caching disabled.');
  } else {
    console.log(`[AetherMint SW] AetherMint service worker ${SW_VERSION} activating.`);

    // Use the documented Workbox debug switch only when explicitly enabled.
    if (self.location.search.includes('workbox-debug')) {
      self.workbox.setConfig({ debug: true });
    }

    // -----------------------------------------------------------------
    // Precache — versioned app shell + offline fallback page.
    // -----------------------------------------------------------------
    // The `/offline` URL must correspond to a real navigable route on the
    // server (see frontend/src/pages/_offline.tsx). Workbox will populate
    // the cache during install so it is available even before the user
    // has ever visited the page.
    precaching.precacheAndRoute([
      { url: '/offline', revision: SW_VERSION },
    ]);

    // -----------------------------------------------------------------
    // Background Sync — queue mutating requests when offline.
    // -----------------------------------------------------------------
    const bgSyncPlugin = new backgroundSync.BackgroundSyncPlugin('aethermint-offline-queue', {
      maxRetentionTime: 24 * 60, // Retry for up to 24 hours (Workbox uses minutes here).
      onSync: async ({ queue }) => {
        try {
          console.log('[AetherMint SW] Replaying queued offline requests…');
          await queue.replayRequests();
        } catch (error) {
          console.error('[AetherMint SW] Background sync replay failed:', error);
        }
      },
    });

    routing.registerRoute(
      ({ url, request }) =>
        url.pathname.startsWith('/api/') &&
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method),
      new strategies.NetworkOnly({ plugins: [bgSyncPlugin] }),
      'POST'
    );

    // -----------------------------------------------------------------
    // Read-only API content (courses/lessons/progress) — stale-while-
    // revalidate so previously viewed pages remain available offline.
    // IMPORTANT: registered BEFORE the broader /api NetworkFirst route so
    // Workbox matches these first.
    // -----------------------------------------------------------------
    const READ_ONLY_API_PATTERN = /^\/api\/(courses|lessons|progress|analytics)(\/|$|\?)/;

    routing.registerRoute(
      ({ url, request }) =>
        request.method === 'GET' && READ_ONLY_API_PATTERN.test(url.pathname),
      new strategies.StaleWhileRevalidate({
        cacheName: `aethermint-api-readonly-${SW_VERSION}`,
        plugins: [
          new expiration.ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
            purgeOnQuotaError: true,
          }),
        ],
      })
    );

    // -----------------------------------------------------------------
    // Other /api GET requests — network first, fall back to cache after
    // 3s timeout so user/auth/profile endpoints stay fresh.
    // -----------------------------------------------------------------
    routing.registerRoute(
      ({ url, request }) => url.pathname.startsWith('/api/') && request.method === 'GET',
      new strategies.NetworkFirst({
        cacheName: `aethermint-api-${SW_VERSION}`,
        networkTimeoutSeconds: 3,
        plugins: [
          new expiration.ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
            purgeOnQuotaError: true,
          }),
        ],
      })
    );

    // -----------------------------------------------------------------
    // Static assets — cache first with a long expiration.
    // -----------------------------------------------------------------
    routing.registerRoute(
      ({ request }) =>
        request.destination === 'image' ||
        request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'font' ||
        request.destination === 'manifest',
      new strategies.CacheFirst({
        cacheName: `aethermint-static-${SW_VERSION}`,
        plugins: [
          new expiration.ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            purgeOnQuotaError: true,
          }),
        ],
      })
    );

    // -----------------------------------------------------------------
    // Next.js static build artefacts — immutable, cache first.
    // -----------------------------------------------------------------
    routing.registerRoute(
      ({ url }) => url.pathname.startsWith('/_next/static/'),
      new strategies.CacheFirst({
        cacheName: `aethermint-next-static-${SW_VERSION}`,
        plugins: [
          new expiration.ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
            purgeOnQuotaError: true,
          }),
        ],
      })
    );

    // -----------------------------------------------------------------
    // Navigations (HTML pages) — stale-while-revalidate so the app loads
    // instantly while a fresh copy is fetched in the background.
    // -----------------------------------------------------------------
    routing.registerRoute(
      ({ request }) => request.mode === 'navigate',
      new strategies.StaleWhileRevalidate({
        cacheName: `aethermint-pages-${SW_VERSION}`,
        plugins: [
          new expiration.ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 7 * 24 * 60 * 60,
            purgeOnQuotaError: true,
          }),
        ],
      })
    );

    // -----------------------------------------------------------------
    // Offline fallback for navigation + same-origin asset requests when
    // the network AND the SW cache both fail.
    // -----------------------------------------------------------------
    const OFFLINE_FALLBACK_URL = '/offline';

    self.workbox.routing.setCatchHandler(async ({ event, request }) => {
      // Always respond to 3rd-party requests with a generic error so we
      // don't accidentally cache cross-origin responses.
      if (request.url.startsWith(self.location.origin) === false) {
        return Response.error();
      }

      const accept = request.headers.get('accept') || '';
      const url = new URL(request.url);

      // 1. Document / navigation requests return the precached shell.
      if (event.request.destination === 'document' || request.mode === 'navigate') {
        const cached = await caches.match(OFFLINE_FALLBACK_URL);
        if (cached) {
          return cached;
        }
        return Response.error();
      }

      // 2. Next.js pages router fetches page-data JSON
      //    (`/_next/data/<buildId>/<page>.json`). Never return an HTML
      //    shell for these — the client will `res.json()` and crash if
      //    Content-Type isn't application/json. Return a 503 sentinel
      //    soReact Query / SWR can short-circuit cleanly.
      if (
        url.pathname.startsWith('/_next/data/') ||
        accept.includes('application/json')
      ) {
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        return new Response(
          JSON.stringify({ offline: true, message: 'Network unavailable' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 3. HTML responses (e.g. prefetch hints) — serve the shell.
      if (accept.includes('text/html')) {
        const cached = await caches.match(OFFLINE_FALLBACK_URL);
        if (cached) {
          return cached;
        }
      }

      // 4. Images when offline — return an empty pixel so the page keeps
      //    a consistent layout. Most icons are already in the static cache.
      if (request.destination === 'image') {
        return new Response('', { status: 504 });
      }

      return Response.error();
    });
  }
} else {
  console.log('[AetherMint SW] Workbox failed to load – falling back to passthrough.');
}

// -----------------------------------------------------------------
// Update flow — the page calls postMessage({ type: 'SKIP_WAITING' }) to
// activate a new SW without surprising active tabs.
// -----------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[AetherMint SW] SKIP_WAITING requested – activating new version.');
    self.skipWaiting();
  }
});

// After activation, take control of all open clients immediately so users
// see the new version on the next interaction.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up caches from previous SW versions to prevent stale assets
      // from accumulating.
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('aethermint-') && !name.endsWith(SW_VERSION))
          .map((name) => {
            console.log('[AetherMint SW] Deleting outdated cache:', name);
            return caches.delete(name);
          })
      );

      if (self.clients && self.clients.claim) {
        await self.clients.claim();
      }
    })()
  );
});

// -----------------------------------------------------------------
// Background sync trigger from IndexedDB writes (see useOfflineSync).
// -----------------------------------------------------------------
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-progress' || event.tag === 'background-sync') {
    console.log('[AetherMint SW] Custom background sync triggered:', event.tag);
    // Workbox handles queued network requests automatically via the
    // BackgroundSyncPlugin registered above. Hooks for custom IndexedDB
    // replay can be added here.
  }
});

// -----------------------------------------------------------------
// Push notifications.
// -----------------------------------------------------------------
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'AetherMint', body: event.data.text() };
  }

  const options = {
    body: payload.body || 'You have a new notification from AetherMint',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: payload,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(payload.title || 'AetherMint', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') {
    return;
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
      return null;
    })
  );
});
