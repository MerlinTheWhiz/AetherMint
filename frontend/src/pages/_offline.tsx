/**
 * Offline Fallback Page
 * ----------------------
 * Served by the Workbox `setCatchHandler` in `public/sw.js` whenever a
 * navigation request fails (no network AND no matching cache entry). It's
 * also pre-cached on SW install so it works on the very first offline
 * load. The page must remain dependency-light — it cannot assume any
 * client-side data or context provider — because it runs in the most
 * constrained scenario.
 */

import { useEffect } from 'react';
import Head from 'next/head';

interface OfflineFeature {
  title: string;
  description: string;
}

const OFFLINE_FEATURES: OfflineFeature[] = [
  {
    title: 'Cached courses',
    description:
      'Any course you opened at least once stays available, including lessons and reading material.',
  },
  {
    title: 'Background sync',
    description:
      'Quizzes, progress updates, and payments are queued locally and replay automatically when you reconnect.',
  },
  {
    title: 'Pinned install',
    description:
      'Install AetherMint to your home screen to launch offline even with no prior visits.',
  },
];

const STATUS_CHECK_INTERVAL_MS = 5000;

const redirectHome = () => {
  window.location.href = '/';
};

export default function OfflinePage() {
  // Auto-redirect when connectivity returns. useEffect never runs on the
  // server, so the listeners are added exactly once per mount and torn
  // down on unmount.
  useEffect(() => {
    window.addEventListener('online', redirectHome);

    const intervalId = window.setInterval(() => {
      if (navigator.onLine) {
        window.clearInterval(intervalId);
        redirectHome();
      }
    }, STATUS_CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', redirectHome);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Offline · AetherMint</title>
        <meta
          name="description"
          content="AetherMint is currently offline. Cached content remains available."
        />
        <meta name="robots" content="noindex" />
        <meta name="theme-color" content="#0f172a" />
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-400/40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10 text-amber-300"
              aria-hidden="true"
            >
              <path d="M18.364 5.636a9 9 0 0 1 0 12.728" />
              <path d="M15.536 8.464a5 5 0 0 1 0 7.072" />
              <path d="M2 8.82a15 15 0 0 1 20 0" />
              <path d="M5 12.859a10 10 0 0 1 14 0" />
              <path d="M8.5 16.429a5 5 0 0 1 7 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
              <line x1="3" y1="3" x2="21" y2="21" />
            </svg>
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold mb-3">
            You&rsquo;re offline
          </h1>

          <p className="text-slate-300 text-base sm:text-lg mb-8">
            AetherMint can&rsquo;t reach the network right now. Don&rsquo;t worry &mdash; cached courses
            and queued progress will continue to work, and we&rsquo;ll resync everything as soon as
            you&rsquo;re back online.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <button
              type="button"
              onClick={redirectHome}
              className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800/60 px-5 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
            >
              Go to home
            </a>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-left">
            {OFFLINE_FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="rounded-xl border border-slate-700 bg-slate-800/40 p-4"
              >
                <h2 className="text-sm font-semibold text-sky-300 mb-1">
                  {feature.title}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>

          <p className="mt-10 text-xs text-slate-500">
            Connection status is monitored automatically. You&rsquo;ll be redirected as soon as the
            network comes back &mdash; no need to refresh.
          </p>
        </div>
      </main>
    </>
  );
}
