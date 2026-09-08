'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { sessionMock, useSession } from '@/lib/mock/session';
import { useToast } from './Toast';
import { Avatar } from './ui';

const nav = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/lessons', label: 'Lessons', icon: '📚' },
  { href: '/admin/community', label: 'Community', icon: '💬' },
  { href: '/admin/ai', label: 'AI Usage', icon: '🤖' },
  { href: '/admin/xp', label: 'XP & Rewards', icon: '⚡' },
  { href: '/admin/feedback', label: 'Feedback', icon: '📝' },
  { href: '/admin/preservation', label: 'Preservation', icon: '🏛' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const isLogin = pathname === '/admin/login';

  async function handleSignOut() {
    await sessionMock.signOut();
    toast.push('info', 'Signed out.');
    router.push('/admin/login');
  }

  if (isLogin) return <>{children}</>;

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
        <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-lg font-bold text-white">
            S
          </span>
          <h1 className="mt-5 text-lg font-bold text-ink">Admins only</h1>
          <p className="mt-2 text-sm text-ink-soft">
            You need admin access to view this dashboard.
          </p>
          <Link
            href="/admin/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-brand to-brand-dark px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white">
            S
          </span>
          <div>
            <p className="text-sm font-bold text-ink">SultiAI Admin</p>
            <p className="text-[10px] text-ink-faint">sultiai.com/admin</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {nav.map((item) => {
              const active =
                item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-brand-light text-brand-dark'
                        : 'text-ink-soft hover:bg-surface hover:text-ink'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-line p-4">
          <div className="flex items-center gap-3">
            <Avatar name={session.name} className="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{session.name}</p>
              <p className="truncate text-xs text-ink-faint">Administrator</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-xs font-bold text-white">
            S
          </span>
          <p className="text-sm font-bold text-ink">SultiAI Admin</p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="fixed inset-x-0 top-14 z-40 border-b border-line bg-white px-4 pb-4 pt-2 lg:hidden">
          <ul className="space-y-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface"
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-semibold text-ink"
          >
            Sign out
          </button>
        </div>
      )}

      {/* Main */}
      <div className="min-w-0 flex-1 lg:ml-60">
        <main className="px-4 pb-10 pt-20 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}
