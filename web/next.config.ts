import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Vercel builds and runs Next.js through its own adapter and does not need
  // the standalone server; on 16.3 keeping `standalone` enabled there fails the
  // build with "ENOENT: .next/next-server.js.nft.json" (nextjs/next#96646).
  // The Dockerfile still needs standalone, and Vercel sets VERCEL=1 for us.
  output: process.env.VERCEL ? undefined : 'standalone',
  turbopack: {
    root: path.join(__dirname),
  },
  headers: async () => [
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
