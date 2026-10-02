import path from 'node:path';
import type { NextConfig } from 'next';

const isExport = Boolean(process.env.NETLIFY);

const nextConfig: NextConfig = {
  output: isExport ? 'export' : (process.env.VERCEL ? undefined : 'standalone'),
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.join(__dirname),
  },
  headers: isExport ? undefined : async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        { key: 'Pragma', value: 'no-cache' },
      ],
    },
    {
      source: '/_next/static/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/images/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
      ],
    },
    {
      source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
      ],
    },
  ],
};

export default nextConfig;
