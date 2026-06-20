/**
 * OfflineIndicator
 * ----------------
 * Renders a fixed bottom banner whenever the browser reports it is offline.
 *
 * Loaded in `_app.tsx` via `next/dynamic(..., { ssr: false })`, so React
 * never tries to hydrate this with a server-rendered tree — the only
 * worry would be the very first client paint, where `useNetworkStatus`
 * has already attached the `online`/`offline` listeners and is in sync
 * with `navigator.onLine`. No extra mount guard needed.
 *
 * Visual style matches the platform's Tailwind design tokens. Inline SVG
 * is used instead of an icon library to keep the bundle small and the
 * component library-free.
 */

import { useState } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

// Component is loaded via `next/dynamic({ ssr: false })` from `_app.tsx`,
// so the first render always happens on the client. No SSR guard needed.

const readDismissed = (storageKey: string): boolean => {
  try {
    return window.localStorage.getItem(storageKey) === 'true';
  } catch {
    // localStorage can throw in private / sandboxed contexts — treat
    // as "not dismissed" so the banner still surfaces.
    return false;
  }
};

interface OfflineIndicatorProps {
  /**
   * Optional override for the dismissal state — useful for tests. The
   * component reads & writes a `localStorage` flag under this key so
   * end-users don't see a banner they already dismissed.
   */
  storageKey?: string;
}

export function OfflineIndicator({ storageKey = 'aethermint-offline-banner-dismissed' }: OfflineIndicatorProps) {
  const { isOnline } = useNetworkStatus();
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed(storageKey));

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(storageKey, 'true');
    } catch {
      /* localStorage may be disabled in private mode — ignore. */
    }
    setDismissed(true);
  };

  if (isOnline || dismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 transform bg-amber-500 text-amber-950 shadow-lg transition-transform duration-200 ease-out"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 flex-shrink-0"
            aria-hidden="true"
          >
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
          <span className="truncate text-sm font-medium sm:text-base">
            You&rsquo;re offline. Cached content will load and progress will sync automatically when you&rsquo;re back online.
          </span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss offline banner"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-amber-900 transition hover:bg-amber-600/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default OfflineIndicator;
