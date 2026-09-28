'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode, SVGProps } from 'react';
import { sessionMock, useSession } from '@/lib/mock/session';
import { useToast } from './Toast';
import { ThemeToggle } from './ThemeToggle';
import { Avatar, iconBtn, primaryBtn } from './ui';

type Icon = (props: SVGProps<SVGSVGElement>) => ReactNode;

const nav: { href: string; label: string; icon: Icon }[] = [
  { href: '/admin', label: 'Dashboard', icon: GridIcon },
  { href: '/admin/users', label: 'Users', icon: UsersIcon },
  { href: '/admin/lessons', label: 'Lessons', icon: BookIcon },
  { href: '/admin/community', label: 'Community', icon: ChatIcon },
  { href: '/admin/ai', label: 'AI Usage', icon: SparkIcon },
  { href: '/admin/xp', label: 'XP & Rewards', icon: BoltIcon },
  { href: '/admin/feedback', label: 'Feedback', icon: InboxIcon },
  { href: '/admin/preservation', label: 'Preservation', icon: ArchiveIcon },
  { href: '/admin/settings', label: 'Settings', icon: CogIcon },
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
        <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 text-center shadow-card">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-solid text-base font-semibold text-on-brand">
            S
          </span>
          <h1 className="mt-5 text-base font-semibold tracking-tight text-ink">Admins only</h1>
          <p className="mt-2 text-sm text-ink-soft">
            You need admin access to view this dashboard.
          </p>
          <Link href="/admin/login" className={`${primaryBtn} mt-6 w-full`}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const renderNav = (onNavigate?: () => void) => (
    <ul className="space-y-0.5">
      {nav.map((item) => {
        const active =
          item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-soft text-brand-ink'
                  : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-line px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-solid text-xs font-semibold text-on-brand">
            S
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-ink">SultiAI Admin</p>
            <p className="truncate text-[10px] text-ink-faint">sultiai.com/admin</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">{renderNav()}</nav>
        <div className="border-t border-line p-3">
          <div className="mb-3 px-0.5">
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-2.5 rounded-lg px-1 py-1">
            <Avatar name={session.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{session.name}</p>
              <p className="truncate text-[11px] text-ink-faint">Administrator</p>
            </div>
            <button type="button" onClick={handleSignOut} title="Sign out" className={iconBtn}>
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

      <div className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-solid text-[11px] font-semibold text-on-brand">
            S
          </span>
          <p className="text-sm font-semibold tracking-tight text-ink">SultiAI Admin</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className={iconBtn}
          >
            <svg
              width="18"
              height="18"
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
      </div>

      {menuOpen && (
        <div className="sticky top-14 z-40 border-b border-line bg-surface px-3 py-3 lg:hidden">
          {renderNav(() => setMenuOpen(false))}
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink-soft"
          >
            Sign out
          </button>
        </div>
      )}

      <div className="lg:pl-60">
        <main className="px-4 pt-6 pb-10 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function base(props: SVGProps<SVGSVGElement>) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  };
}

function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z" />
    </svg>
  );
}

function SparkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 2.5l1.9 5.1 5.1 1.9-5.1 1.9L12 16.5l-1.9-5.1L5 9.5l5.1-1.9z" />
      <path d="M18.5 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </svg>
  );
}

function BoltIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12z" />
    </svg>
  );
}

function InboxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M21 12h-6l-2 3h-2l-2-3H3" />
      <path d="M5.5 5h13l2.5 7v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z" />
    </svg>
  );
}

function ArchiveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

function CogIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
