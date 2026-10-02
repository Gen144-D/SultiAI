'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon';
import Logo from './Logo';

/**
 * Floating glass site header. All motion is CSS (transitions + keyframes):
 * no motion library is loaded for what amounts to underlines, a drawer and
 * a glow — the whole interaction budget stays under a kilobyte of CSS.
 */

interface NavItem {
  label: string;
  href: string;
  /** Homepage section id, when the item is an anchor rather than a page. */
  sectionId?: string;
  /** Exact page path, when the item is a page rather than an anchor. */
  page?: string;
}

const DESKTOP_LINKS: NavItem[] = [
  { label: 'Features', href: '/features', page: '/features' },
  { label: 'How It Works', href: '/#how-it-works', sectionId: 'how-it-works' },
  { label: 'Modules', href: '/#modules', sectionId: 'modules' },
  { label: 'AI Technology', href: '/#technology', sectionId: 'technology' },
  { label: 'Community', href: '/#community', sectionId: 'community' },
  { label: 'FAQ', href: '/#faq', sectionId: 'faq' },
  { label: 'Pricing', href: '/pricing', page: '/pricing' },
  { label: 'API', href: '/api', page: '/api' },
];

// The drawer mirrors the desktop row exactly: one menu, no surprises.
const DRAWER_LINKS: NavItem[] = DESKTOP_LINKS;

export default function Navbar({ hasRelease }: { hasRelease: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const close = useCallback(() => setOpen(false), []);

  // Shrink + deepen the header once the page moves.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Active-section indicator for the homepage anchors. Off `/` no section
  // can be active, and `isActive` already requires `pathname === '/'`, so
  // there is nothing to reset when navigating away.
  useEffect(() => {
    if (pathname !== '/') return;
    const ids = DESKTOP_LINKS.map((l) => l.sectionId).filter(
      (id): id is string => typeof id === 'string'
    );
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: 0 }
    );
    for (const s of sections) observer.observe(s);
    return () => observer.disconnect();
  }, [pathname]);

  // Drawer open: lock background scroll, close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isActive = (item: NavItem) =>
    item.page ? pathname === item.page : activeSection === item.sectionId && pathname === '/';

  const cta = hasRelease
    ? { label: 'Download App', href: '/download', icon: 'download' as const }
    : { label: 'Join Early Access', href: '/contact', icon: 'mail' as const };

  return (
    <>
      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
        <nav
          aria-label="Main"
          className={`site-header relative mx-auto flex max-w-[76rem] items-center justify-between px-3 transition-all duration-300 sm:px-5 ${
            scrolled ? 'site-header-scrolled h-14' : 'h-16'
          }`}
        >
          <Logo size="sm" />

          <ul className="hidden items-center gap-0.5 xl:flex">
            {DESKTOP_LINKS.map((l) => {
              const active = isActive(l);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? 'page' : undefined}
                    className={`nav-link relative block rounded-control px-3 py-2 text-sm font-medium transition-colors ${
                      active ? 'text-brand' : 'text-ink-soft hover:bg-white/6 hover:text-ink'
                    }`}
                  >
                    {l.label}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-3 -bottom-px h-0.5 origin-left rounded-full bg-gradient-to-r from-brand to-brand-solid transition-transform duration-300 ${
                        active ? 'scale-x-100' : 'scale-x-0'
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <Link href={cta.href} className="btn-primary btn-cta hidden px-5 py-2.5 sm:inline-flex">
              <Icon name={cta.icon} className="h-4 w-4" strokeWidth={2} />
              {cta.label}
            </Link>

            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
              className="press grid h-11 w-11 place-items-center rounded-control text-ink-soft transition-colors hover:bg-white/6 hover:text-ink xl:hidden"
            >
              {open ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer: dimmed blurred backdrop + glass panel sliding from top. */}
      {open && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <div
            aria-hidden="true"
            className="drawer-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />
          <div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="drawer-panel glass-2 glass-sheen absolute inset-x-3 top-20 rounded-card p-3 sm:inset-x-4"
          >
            <ul className="flex flex-col gap-1">
              {DRAWER_LINKS.map((l, i) => {
                const active = isActive(l);
                return (
                  <li
                    key={l.href}
                    className="drawer-item"
                    style={{ animationDelay: `${0.05 + i * 0.05}s` }}
                  >
                    <Link
                      href={l.href}
                      onClick={close}
                      aria-current={active ? 'page' : undefined}
                      className={`press flex min-h-[48px] items-center rounded-control px-4 text-base font-medium transition-colors ${
                        active
                          ? 'bg-brand-light text-brand'
                          : 'text-ink-soft hover:bg-white/6 hover:text-ink'
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div
              className="drawer-item mt-2 border-t border-line pt-3"
              style={{ animationDelay: '0.4s' }}
            >
              <Link href={cta.href} onClick={close} className="btn-primary btn-cta w-full py-3.5">
                <Icon name={cta.icon} className="h-4 w-4" strokeWidth={2} />
                {cta.label}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
