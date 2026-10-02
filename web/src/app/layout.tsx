import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import SiteHeader from '@/components/SiteHeader';
import Footer from '@/components/Footer';
import QueryProvider from '@/components/QueryProvider';
import CosmicBackground from '@/components/CosmicBackground';
import { APP, SITE_URL } from '@/lib/site';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const TITLE = `${APP.name} — Learn Bisaya with AI`;
const DESCRIPTION =
  'SultiAI is an AI-powered language partner for learning Bisaya (Cebuano) — an AI tutor, voice practice, AR cultural discovery, and a community that keeps the language alive. Download the Android APK directly.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s · SultiAI',
  },
  description: DESCRIPTION,
  applicationName: 'SultiAI',
  keywords: [
    'Bisaya',
    'Cebuano',
    'learn Bisaya',
    'AI tutor',
    'Filipino language',
    'SultiAI',
    'Android APK',
  ],
  authors: [{ name: APP.name }],
  creator: APP.name,
  // No global canonical here: a single root-level canonical would be inherited
  // by every page and tell search engines they are all duplicates of `/`.
  // Each route declares its own `alternates.canonical`.
  openGraph: {
    type: 'website',
    siteName: APP.name,
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_PH',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export const viewport: Viewport = {
  themeColor: '#050814',
  width: 'device-width',
  initialScale: 1,
};

/**
 * Marks the document as script-capable before first paint.
 *
 * The scroll-reveal animation starts elements at `opacity: 0`, gated behind
 * `.has-js`. Without this flag the page renders fully visible, so a visitor
 * with JavaScript disabled — or a crawler reading the prerendered HTML — never
 * gets a blank page. Running it inline avoids the flash of visible-then-hidden
 * content that a deferred script would cause.
 */
const jsBootstrap = 'document.documentElement.classList.add("has-js");';

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      // The inline bootstrap above appends `has-js` to <html> before React
      // hydrates, so the server HTML can never match the client DOM here.
      // Suppressing the warning is correct: the difference is intentional
      // and the reveal CSS keeps content visible either way.
      suppressHydrationWarning
      // Tells Next's router that the global `scroll-behavior: smooth` is
      // intentional, silencing the route-transition warning in dev.
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: jsBootstrap }} />
      </head>
      <body className="flex min-h-full flex-col">
        <CosmicBackground />
        <QueryProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <Footer />
        </QueryProvider>
      </body>
    </html>
  );
}
