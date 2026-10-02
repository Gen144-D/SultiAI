import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'sultiai_admin_session';

/**
 * Redirects unauthenticated visitors away from the admin console.
 *
 * This is a UX redirect, not the security boundary: the cookie is written by
 * client JS and is not signed, so it only hides the routes from someone who has
 * not signed in. The real gate is `requireRole('admin')` on the API server,
 * which verifies the JWT signature. Do not rely on this file to protect data.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login' || pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  let role: string | undefined;
  try {
    role = (JSON.parse(decodeURIComponent(raw)) as { role?: string }).role;
  } catch {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  if (role !== 'admin') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
