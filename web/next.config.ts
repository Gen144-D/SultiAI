import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Vercel and Netlify both build and run Next.js through their own adapters
  // and do not need the standalone server; on 16.3 keeping `standalone` enabled
  // there fails the build with "ENOENT: .next/next-server.js.nft.json"
  // (nextjs/next#96646), because the standalone path adds an extra
  // nodeFileTrace() over the jest-worker child entries in
  // dist/build/collect-build-traces.js.
  // The Dockerfile still needs standalone, and those platforms set VERCEL=1 /
  // NETLIFY=true for us.
  output: process.env.VERCEL || process.env.NETLIFY ? undefined : 'standalone',
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
