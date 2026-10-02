'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useState, useSyncExternalStore } from 'react';
import type { ReactNode, SVGProps } from 'react';
import { adminSession, useSession } from '@/lib/session';
import { useToast } from './Toast';
import { ThemeToggle } from './ThemeToggle';
import { CosmicBackground } from './background/CosmicBackground';
import { SultiMark } from './sulti/SultiOrb';
import { Avatar, iconBtn, primaryBtn } from './ui';

type Icon = (props: SVGProps<SVGSVGElement>) => ReactNode;

// The session lives in localStorage, so it is unknown during SSR/prerender.
// Without this guard the shell renders the "Admins only" screen first and then
// swaps to the dashboard on hydration, flashing a false auth failure.
const subscribeToNothing = () => () => {};
const getHydrated = () => true;
const getServerHydrated = () => false;

const nav: { href: string; label: string; icon: Icon }[] = [
  { href: '/admin', label: 'Dashboard', icon: GridIcon },
  { href: '/admin/users', label: 'Users', icon: UsersIcon },
  { href: '/admin/lessons', label: 'Lessons', icon: BookIcon },
  { href: '/admin/community', label: 'Community', icon: ChatIcon },
  { href: '/admin/ai', label: 'AI Usage', icon: SparkIcon },
  { href: '/admin/xp', label: 'XP & Rewards', icon: BoltIcon },
  { href: '/admin/feedback', label: 'Feedback', icon: InboxIcon },
  { href: '/admin/preservation', label: 'Preservation', icon: ArchiveIcon },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const hydrated = useSyncExternalStore(subscribeToNothing, getHydrated, getServerHydrated);
  const isLogin = pathname === '/admin/login';

  // The drawer is dismissed by its own links and the backdrop rather than by a
  // route-watching effect, so a tap closes it in the same tick as navigation.
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  async function handleSignOut() {
    await adminSession.signOut();
    toast.push('info', 'Signed out.');
    router.push('/admin/login');
  }

  if (isLogin) return <>{children}</>;

  if (!hydrated) {
    return (
      <>
        <CosmicBackground />
        <div className="flex min-h-screen items-center justify-center px-4">
          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand"
            role="status"
            aria-label="Loading admin console"
          />
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <CosmicBackground />
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="glass-3 glass-sheen glass-shadow anim-enter w-full max-w-sm rounded-hero p-8 text-center">
            <SultiMark className="mx-auto" />
            <h1 className="mt-6 text-lg font-semibold tracking-tight text-ink">Admins only</h1>
            <p className="mt-2 text-sm text-ink-soft">
              You need admin access to view this dashboard.
            </p>
            <Link href="/admin/login" className={`${primaryBtn} mt-7 w-full py-2.5`}>
              Sign in
            </Link>
          </div>
        </div>
      </>
    );
  }

  const renderNav = (onNavigate?: () => void) => (
    <ul className="space-y-1">
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
              className={`press group relative flex items-center gap-2.5 rounded-control px-3 py-2.5 text-sm font-medium ${
                active ? 'text-brand-ink' : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {/* The mint rail is the only persistent active indicator, so the
                  current destination reads at a glance without a heavy fill. */}
              <span
                aria-hidden="true"
                className={`absolute top-1/2 -left-3 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-brand to-brand-solid transition-opacity duration-300 ${
                  active ? 'opacity-100 shadow-[0_0_12px_var(--brand)]' : 'opacity-0'
                }`}
              />
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  active ? 'text-brand' : 'text-ink-faint group-hover:text-ink-soft'
                }`}
              />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-screen">
      <CosmicBackground />

      {/* Desktop: floating glass rail, inset from the viewport edge. */}
      <aside className="fixed top-4 bottom-4 left-4 z-40 hidden w-64 flex-col overflow-hidden rounded-card glass-1 glass-sheen glass-shadow lg:flex">
        <div className="flex items-center gap-3 border-b border-line px-4 py-4">
          <SultiMark />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-ink">SultiAI Admin</p>
            <p className="truncate text-[10px] text-ink-faint">sultiai.com/admin</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-6 py-4">{renderNav()}</nav>

        <div className="border-t border-line p-3">
          <Link
            href="/admin/settings"
            className={`press mb-3 flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium ${
              pathname.startsWith('/admin/settings')
                ? 'text-brand-ink'
                : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
            }`}
          >
            <CogIcon className="h-4 w-4 shrink-0" />
            Settings
          </Link>

          <ThemeToggle className="mb-3 w-full justify-center" />

          <div className="flex items-center gap-2.5 rounded-control px-1.5 py-1.5">
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
              <span className="sr-only">Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="sticky top-0 z-40 px-3 pt-3 lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 rounded-card glass-1 glass-sheen glass-shadow px-3">
          <div className="flex items-center gap-2.5">
            <SultiMark size="sm" />
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
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="anim-pop sticky top-[76px] z-40 px-3 pt-3 lg:hidden">
          <div className="rounded-card glass-1 glass-sheen glass-shadow px-6 py-4">
            {renderNav(closeMenu)}
            <Link
              href="/admin/settings"
              onClick={closeMenu}
              className="press mt-1 flex items-center gap-2.5 rounded-control px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface-2 hover:text-ink"
            >
              <CogIcon className="h-4 w-4 shrink-0" />
              Settings
            </Link>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                void handleSignOut();
              }}
              className="press mt-3 w-full rounded-control border border-line px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-surface-2"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-80">
        {/* Keyed on the route so navigation reads as movement, not a cut. */}
        <main key={pathname} className="anim-enter px-4 pt-6 pb-12 sm:px-6 lg:px-8 lg:pt-8">
          {children}
        </main>
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
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a1.7 1.7 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
