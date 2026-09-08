import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import QueryProvider from '@/components/QueryProvider';
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
    default: 'SultiAI — Learn Bisaya with AI',
    template: '%s · SultiAI',
  },
  description:
    'SultiAI is an AI-powered language partner for learning Bisaya (Cebuano) — with an AI tutor, voice practice, AR cultural discovery, and a community that keeps the language alive.',
  keywords: ['Bisaya', 'Cebuano', 'learn language', 'AI tutor', 'Filipino', 'SultiAI'],
  openGraph: {
    title: 'SultiAI — Learn Bisaya with AI',
    description:
      'An AI-powered language partner for learning Bisaya (Cebuano). Download on Google Play.',
    type: 'website',
    locale: 'en_PH',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ClerkProvider>
          <QueryProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
