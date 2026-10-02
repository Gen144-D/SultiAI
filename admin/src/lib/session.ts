'use client';

import { useSyncExternalStore } from 'react';

export interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  signedInAt: string;
  token: string;
  refreshToken?: string;
}

interface SignInResponse {
  data?: {
    user?: { id?: number; fullname?: string; email?: string; role?: string };
    accessToken?: string;
    refreshToken?: string;
  };
}

const STORAGE_KEY = 'sultiai_admin_session';
const COOKIE_KEY = 'sultiai_admin_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

let currentSession: AdminSession | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function readFromStorage(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}

function ensureInit() {
  if (!initialized) {
    currentSession = readFromStorage();
    initialized = true;
  }
}

function subscribe(listener: () => void) {
  ensureInit();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  ensureInit();
  return currentSession;
}

function getServerSnapshot() {
  return null;
}

/**
 * The proxy on `/admin/:path*` gates the routes, but it only needs to know that a
 * signed-in admin exists — never the token itself. Keeping the cookie down to the
 * role means the ~600 byte JWT is not attached to every admin request.
 *
 * The value MUST be percent-encoded: RFC 6265 rejects `"` in a cookie value, and
 * an unencoded JSON payload is silently dropped, which sends the browser back to
 * the login page in a loop right after a successful sign-in.
 */
function writeCookie(role: string) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const value = encodeURIComponent(JSON.stringify({ role }));
  document.cookie = `${COOKIE_KEY}=${value}; path=/admin; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function clearCookie() {
  document.cookie = `${COOKIE_KEY}=; path=/admin; max-age=0; SameSite=Lax`;
}

function commit(session: AdminSession | null) {
  currentSession = session;
  if (typeof window !== 'undefined') {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      writeCookie(session.role);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      clearCookie();
    }
  }
  listeners.forEach((l) => l());
}

export const adminSession = {
  getSession(): AdminSession | null {
    ensureInit();
    return currentSession;
  },

  async signIn(email: string, password: string): Promise<AdminSession> {
    const health = await fetch(`${API_BASE}/api/health`).catch(() => null);
    if (!health?.ok) {
      throw new Error('Cannot reach the API server. Make sure it is running on port 3001.');
    }

    const res = await fetch(`${API_BASE}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
        message?: string;
      };
      const message =
        err.error?.message ||
        err.message ||
        (res.status === 401 ? 'Invalid email or password.' : '');
      throw new Error(message || `Sign in failed (${res.status}).`);
    }

    const payload = (await res.json()) as SignInResponse;
    const d = payload.data ?? {};
    const user = d.user;

    if (user?.role !== 'admin') {
      throw new Error('Access denied. This account does not have admin privileges.');
    }

    const name = user?.fullname || 'Admin';
    const session: AdminSession = {
      id: String(user?.id ?? ''),
      name,
      email: user?.email || email,
      role: 'admin',
      avatar: name.charAt(0).toUpperCase(),
      signedInAt: new Date().toISOString(),
      token: d.accessToken ?? '',
      refreshToken: d.refreshToken,
    };
    commit(session);
    return session;
  },

  async signOut(): Promise<void> {
    const session = currentSession;
    if (session?.refreshToken) {
      try {
        await fetch(`${API_BASE}/api/auth/signout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
      } catch {
        // Never block sign-out on a network failure — the local session clears regardless.
      }
    }
    commit(null);
  },
};

export function useSession() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Bearer token for API calls, or '' when signed out. */
export function getAccessToken(): string {
  ensureInit();
  return currentSession?.token ?? '';
}
