import Link from 'next/link';
import ApkButton from './ApkButton';
import Icon, { type IconName } from './Icon';
import Logo from './Logo';
import { getApkRelease } from '@/lib/apk';
import { APP } from '@/lib/site';

/**
 * Premium product footer. Every link resolves to a real route or homepage
 * section — there are no social icons because no social accounts are
 * configured, no download statistics because none are published, and no
 * unpublished-state text. The download CTA adapts the same way the header
 * does: direct download when a build exists, early access via contact when
 * it does not.
 */

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/how-it-works', label: 'AI Tutor' },
      { href: '/#how-it-works', label: 'Voice Practice' },
      { href: '/features', label: 'Lessons' },
      { href: '/#phrasebook', label: 'Phrasebook' },
      { href: '/#community', label: 'Community' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/how-it-works', label: 'How It Works' },
      { href: '/#technology', label: 'AI Technology' },
      { href: '/faq', label: 'FAQ' },
      { href: '/api', label: 'Documentation' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About SultiAI' },
      { href: '/contact', label: 'Contact' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
    ],
  },
];

const HIGHLIGHTS: { icon: IconName; label: string }[] = [
  { icon: 'phone', label: 'Android 8.0+' },
  { icon: 'shield', label: 'No Play Store needed' },
  { icon: 'bolt', label: 'Free to start' },
];

export default async function Footer() {
  const release = await getApkRelease();

  return (
    <footer className="mt-10 border-t border-line bg-[#050A10]">
      <div className="mx-auto max-w-[76rem] px-4 py-14 sm:px-6">
        {/* Compact download CTA */}
        <div className="glass-3 glass-sheen flex flex-col items-start gap-6 rounded-card p-7 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-balance text-ink sm:text-2xl">
              Ready to start speaking Bisaya?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {release
                ? 'Free download for Android. No account, no Play Store needed.'
                : 'Be among the first to learn Bisaya with an AI tutor.'}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2.5">
            {release ? (
              <ApkButton release={release} />
            ) : (
              <Link href="/contact" className="btn-primary btn-cta px-6 py-3">
                <Icon name="mail" className="h-4 w-4" strokeWidth={2} />
                Join Early Access
              </Link>
            )}
            <p className="text-xs text-ink-faint">Android &middot; Free</p>
          </div>
        </div>

        {/* Link grid */}
        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
              An AI-powered language companion helping you learn and practice Bisaya through real
              conversations.
            </p>

            {/* Real contact channel, not a placeholder social icon. Social
                icons appear here once social URLs are configured — no fake
                links are rendered in the meantime. */}
            <ul className="mt-6 flex flex-wrap gap-2">
              <li>
                <a
                  href={`mailto:${APP.contactEmail}`}
                  aria-label={`Email ${APP.contactEmail}`}
                  className="press inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-line bg-white/5 px-3 text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
                >
                  <Icon name="mail" className="h-4 w-4" strokeWidth={2} />
                </a>
              </li>
            </ul>

            <ul className="mt-4 flex flex-wrap gap-2">
              {HIGHLIGHTS.map((h) => (
                <li
                  key={h.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/5 px-2.5 py-1 text-[11px] text-ink-soft"
                >
                  <Icon name={h.icon} className="h-3 w-3 text-brand" strokeWidth={2} />
                  {h.label}
                </li>
              ))}
            </ul>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={`Footer — ${col.title}`}>
              <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
                {col.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={`${l.href}-${l.label}`}>
                    <Link
                      href={l.href}
                      className="footer-link text-sm text-ink-soft transition-colors hover:text-brand"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-faint">
            &copy; {new Date().getFullYear()} SultiAI. All rights reserved.
          </p>
          {/* Closing line in Cebuano on purpose: the product exists to keep
              the language, so the site should not hide it. */}
          <p className="font-mono text-xs text-brand/80">Inipit nga awit, padayon.</p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {[
              { href: '/privacy', label: 'Privacy' },
              { href: '/terms', label: 'Terms' },
              { href: '/contact', label: 'Contact' },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="footer-link text-xs text-ink-faint transition-colors hover:text-brand"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
