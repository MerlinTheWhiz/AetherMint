import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// Importing env triggers Zod validation at startup — throws with a clear message if vars are missing/invalid.
import '@/lib/env';
// Importing performanceMonitor instantiates the singleton, which (when
// `window` exists) registers Web-Vitals observers. This is an intentional
// import-side-effect — do not remove the import even if the symbol is
// otherwise unused.
import { performanceMonitor } from '@/lib/performance-monitor';

// PWAClientShell lazily loads the service-worker manager, the offline
// indicator, and the react-hot-toast portal with `ssr: false` so they
// never run during SSR. Without this, `useOfflineSync` (which reads
// `navigator.onLine` on first render) would throw on the server.
import PWAClientShell from '@/components/PWA/PWAClientShell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AetherMint Education - Decentralized Learning Platform',
  description: 'Learn blockchain development with courses powered by Stellar',
};

// `themeColor` lives under `viewport` in Next.js 14 to avoid the
// "deprecated top-level themeColor" warning. Keeping the manifest URL
// off of `metadata` because it is already wired by `next.config.js`
// (the SW precache references `/manifest.json` directly).
export const viewport: Viewport = {
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The `performanceMonitor` import above registers Web-Vitals observers
  // on construction (via its module-level singleton). The original
  // `if (typeof window !== 'undefined') { void performanceMonitor }`
  // guard is unnecessary because the constructor already no-ops during
  // SSR — explicitly touching the singleton was dead code.
  void performanceMonitor;

  return (
    <html lang="en">
      <body className={inter.className}>
        <a
          href="#main-content"
          className="skip-to-content"
        >
          Skip to main content
        </a>
        {/* PWA wiring (service worker, offline banner, toaster) — all
            client-only so SSR never accesses `navigator`/`localStorage`. */}
        <PWAClientShell />
        <main id="main-content" role="main" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
