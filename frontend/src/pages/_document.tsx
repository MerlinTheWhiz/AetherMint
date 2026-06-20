/**
 * Custom Document
 * ---------------
 * Adds the platform-wide `<meta name="theme-color">` and
 * `<link rel="apple-touch-icon">` tags that Lighthouse's PWA audit
 * expects to find at the document level rather than on a per-page basis.
 *
 * Keep this file minimal — anything dynamic belongs in `_app.tsx` or in
 * per-page `<Head>` exports.
 */

import { Html, Head, Main, NextScript } from 'next/document';

const THEME_COLOR = '#3b82f6';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="theme-color" content={THEME_COLOR} />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
