import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Space_Grotesk, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';

/**
 * Typefaces. Two for the landing page plus a Devanagari face.
 *
 * `system-ui` is deliberately not used anywhere: it is the "gave up on
 * typography" signal, and this page is read by people judging the work.
 *
 * Noto Sans Devanagari is loaded globally because the app renders Marathi and
 * Hindi on every screen, and the landing page quotes that UI copy directly.
 */
const display = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '600', '800'],
  variable: '--font-deva',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kabadiwala Connect',
  description:
    'Fair price discovery, verified handovers and direct access to authorized recyclers for informal e-waste collectors.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kabadiwala',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zoom stays enabled deliberately — the users who most need this app are the
  // ones most likely to need to pinch-zoom. Locking it would be an
  // accessibility regression dressed up as polish.
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1d7c50' },
    { media: '(prefers-color-scheme: dark)', color: '#090d14' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="mr"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${devanagari.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
