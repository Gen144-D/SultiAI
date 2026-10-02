import path from 'node:path';
import type { NextConfig } from 'next';

const isExport = process.env.NETLIFY === 'true';

const nextConfig: NextConfig = {
  output: process.env.NETLIFY ? 'export' : (process.env.VERCEL ? undefined : 'standalone'),
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.join(__dirname),
  },
  // Skip custom headers during static export to prevent build warnings
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
