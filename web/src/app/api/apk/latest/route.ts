import { NextResponse } from 'next/server';
import { getApkRelease } from '@/lib/apk';

export const dynamic = 'force-dynamic';

/**
 * Redirects to the APK hosted on Supabase Storage rather than streaming it
 * through this function.
 *
 * The file is ~76 MB. Proxying it through a Vercel function would consume
 * bandwidth on every download, buffer through a serverless instance with a
 * hard response limit, and lose range/resume support. A redirect hands the
 * client straight to Storage's CDN, which supports byte ranges — so a download
 * interrupted on mobile data resumes instead of restarting.
 *
 * `?download=<name>` makes Storage send `Content-Disposition: attachment`, so
 * the browser saves the file instead of navigating to it.
 */
export async function GET() {
  const release = await getApkRelease();

  if (!release) {
    return NextResponse.json({ error: 'No APK build has been published yet.' }, { status: 404 });
  }

  const target = `${release.objectUrl}?download=${encodeURIComponent(release.filename)}`;

  return NextResponse.redirect(target, {
    status: 302,
    headers: {
      // Never let a CDN or browser pin an old build behind a redirect.
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
