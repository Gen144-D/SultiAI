import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'SultiAI Admin',
    template: '%s · SultiAI Admin',
  },
  description: 'Administration dashboard for the SultiAI platform.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#050814' },
    { media: '(prefers-color-scheme: light)', color: '#f3f5fb' },
  ],
};

/**
 * Applies the stored theme before first paint.
 *
 * The palette is defined in CSS on `[data-theme="..."]`, so React only needs
 * to set the attribute. Doing it here rather than in an effect avoids a flash
 * of the default theme for returning admins.
 */
const themeBootstrap = `(function(){try{
var t=localStorage.getItem('sultiai_admin_theme');
if(t!=='warmCyberSunset'&&t!=='obsidianEmerald'&&t!=='softAcademicLight'){t='midnightTeal';}
var d=document.documentElement;
d.setAttribute('data-theme',t);
d.setAttribute('data-theme-family',t==='softAcademicLight'?'light':'dark');
}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
