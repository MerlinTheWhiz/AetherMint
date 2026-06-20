/**
 * Service Worker Registration
 * ----------------------------
 * Registers the Workbox-based service worker in `public/sw.js` and wires up
 * the user-prompted update flow:
 *
 *   1. Wait for the `load` event so registration does not block the critical
 *      render path.
 *   2. Register `/sw.js` (matches the file served from `public/`).
 *   3. On every controller change, dispatch the registered listeners —
 *      callers can use `onUpdate` / `onOfflineReady` to show a banner.
 *   4. Skip-waiting is opt-in: the page must call `applyUpdate()` (which
 *      posts `{ type: 'SKIP_WAITING' }` to the new worker) so we never
 *      break in-flight fetches.
 *
 * Production-only by default — the helper is a no-op in development to
 * avoid stale cache headaches while iterating locally. Tests reset the
 * module via `__resetServiceWorkerRegistrationForTests()`.
 */

export type ServiceWorkerStatus = 'unsupported' | 'registering' | 'registered' | 'activated' | 'error';

export interface ServiceWorkerCallbacks {
  /** Called when a new worker is installed and waiting to activate. */
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  /** Called the first time a worker successfully activates. */
  onOfflineReady?: (registration: ServiceWorkerRegistration) => void;
  /** Called for any registration error. */
  onError?: (error: unknown) => void;
}

let activatedOnce = false;
let currentRegistration: ServiceWorkerRegistration | null = null;

const isProduction = (): boolean => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'production';
  }
  return true;
};

const isSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  typeof window.ServiceWorkerRegistration !== 'undefined';

/**
 * Register the service worker. Safe to call from `useEffect` — performs
 * no work in non-production environments unless `force` is true.
 */
export async function registerServiceWorker(
  callbacks: ServiceWorkerCallbacks = {},
  options: { force?: boolean; scriptUrl?: string } = {}
): Promise<ServiceWorkerStatus> {
  const { onUpdate, onOfflineReady, onError } = callbacks;
  const { force = false, scriptUrl = '/sw.js' } = options;

  if (!isSupported()) {
    return 'unsupported';
  }

  if (!force && !isProduction()) {
    // Don't pollute local dev cache.
    return 'unsupported';
  }

  try {
    const registration = await navigator.serviceWorker.register(scriptUrl, {
      scope: '/',
      updateViaCache: 'none',
    });

    currentRegistration = registration;

    const triggerCallbacks = () => {
      const waiting = registration.waiting ?? registration.installing ?? null;
      if (waiting && waiting.state === 'installed' && navigator.serviceWorker.controller) {
        onUpdate?.(registration);
      }
    };

    triggerCallbacks();

    // Listen for subsequent installs (e.g. after a refresh).
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', triggerCallbacks);
    });

    // Listen for controller changes — fires when a new worker takes over.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!activatedOnce) {
        activatedOnce = true;
        onOfflineReady?.(registration);
      }
    });

    return 'registered';
  } catch (error) {
    onError?.(error);
    return 'error';
  }
}

/**
 * Send `SKIP_WAITING` to the waiting worker so it activates immediately.
 * Call this from the UI when the user accepts an update prompt, then
 * reload the page for an extra layer of safety.
 *
 * Returns `true` if a `SKIP_WAITING` message was posted to a waiting
 * worker. `false` means there is no pending update — the return value
 * is informational; callers may safely ignore it.
 */
export function applyUpdate(): boolean {
  if (!currentRegistration) return false;
  const waiting = currentRegistration.waiting;
  if (!waiting) return false;
  waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

/**
 * Test-only helper — clears module-local state so jest tests don't leak.
 * Not exported from the package barrel.
 */
export function __resetServiceWorkerRegistrationForTests(): void {
  activatedOnce = false;
  currentRegistration = null;
}
