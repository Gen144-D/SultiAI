import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'sultiai_admin_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page, API routes, and static assets
  if (
    pathname === '/admin/login' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Validate cookie is not empty
  try {
    const session = JSON.parse(sessionCookie.value);
    if (!session?.token || !session?.role || session.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
