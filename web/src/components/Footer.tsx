import Link from 'next/link';

const columns = [
  {
    title: 'Product',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/how-it-works', label: 'How it Works' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/download', label: 'Download' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/culture', label: 'Culture' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white">
                S
              </span>
              <span className="text-lg font-bold tracking-tight text-ink">
                Sulti<span className="text-brand">AI</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
              Learn Bisaya with AI. A language-learning companion built to keep Cebuano alive for
              the next generation.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-ink">{col.title}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-ink-soft transition-colors hover:text-brand"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 sm:flex-row">
          <p className="text-xs text-ink-faint">
            &copy; {new Date().getFullYear()} SultiAI. Made with love for the Bisaya community.
          </p>
          <p className="text-xs text-ink-faint">
            Inipit nga awit, padayon — the language lives on.
          </p>
        </div>
      </div>
    </footer>
  );
}
