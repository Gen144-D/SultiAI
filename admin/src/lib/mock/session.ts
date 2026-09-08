import { useSyncExternalStore } from 'react';

export interface AdminSession {
  id: string;
  name: string;
  email: string;
  provider: 'google' | 'email';
  role: string;
  avatar: string;
  signedInAt: string;
  token: string;
}

const SESSION_KEY = 'sultiai_admin_session';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

let currentSession: AdminSession | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function readFromStorage(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
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

function commit(session: AdminSession | null) {
  currentSession = session;
  if (typeof window !== 'undefined') {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      // Also set a cookie for Next.js middleware to read
      document.cookie = `${SESSION_KEY}=${JSON.stringify({ token: session.token, role: session.role })}; path=/admin; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    } else {
      localStorage.removeItem(SESSION_KEY);
      // Clear the cookie
      document.cookie = `${SESSION_KEY}=; path=/admin; max-age=0`;
    }
  }
  listeners.forEach((l) => l());
}

export const sessionMock = {
  getSession(): AdminSession | null {
    ensureInit();
    return currentSession;
  },

  async signIn(email: string, password: string): Promise<AdminSession> {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) {
      throw new Error('Cannot reach the server. Make sure it is running on port 3001.');
    }

    const loginRes = await fetch(`${API_BASE}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!loginRes.ok) {
      const err = await loginRes.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid email or password.');
    }

    const signinData = await loginRes.json();
    const d = signinData.data || signinData;

    if (d.user?.role !== 'admin') {
      throw new Error('Access denied. This account does not have admin privileges.');
    }

    const session: AdminSession = {
      id: String(d.user?.id ?? '1'),
      name: d.user?.fullname ?? 'Admin',
      email: d.user?.email ?? email,
      provider: 'email',
      role: d.user?.role ?? 'admin',
      avatar: (d.user?.fullname ?? 'A').charAt(0).toUpperCase(),
      signedInAt: new Date().toISOString(),
      token: d.accessToken,
    };
    commit(session);
    return session;
  },

  async signOut(): Promise<void> {
    const session = currentSession;
    if (session?.token) {
      try {
        await fetch(`${API_BASE}/api/auth/signout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({ refreshToken: (session as any).refreshToken }),
        });
      } catch {
        // Ignore signout errors — clear local session regardless
      }
    }
    commit(null);
  },
};

export function useSession() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
