'use client';

import Link from 'next/link';
import { useState } from 'react';

const links = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it Works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white">
            S
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">
            Sulti<span className="text-brand">AI</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-brand"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:block">
          <Link
            href="/download"
            className="rounded-full bg-gradient-to-r from-brand to-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            Download
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink md:hidden"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t border-line bg-white px-4 pb-6 pt-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-brand-light hover:text-brand-dark"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/download"
              onClick={() => setOpen(false)}
              className="mt-3 rounded-full bg-gradient-to-r from-brand to-brand-dark px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Download
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
