import type { MetadataRoute } from 'next';
import { APP } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP.name} — ${APP.tagline}`,
    short_name: APP.name,
    description:
      'AI-powered Bisaya (Cebuano) learning: an AI tutor, voice practice, AR cultural discovery, and a community keeping the language alive.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#1e6f9f',
    categories: ['education', 'productivity'],
    icons: [
      { src: '/app-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/app-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
