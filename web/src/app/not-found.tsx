import Link from 'next/link';
import Icon from '@/components/Icon';
import { Container, GlassCard } from '@/components/ui';

const SUGGESTIONS = [
  { href: '/features', label: 'Features', icon: 'layers' as const },
  { href: '/download', label: 'Download', icon: 'download' as const },
  { href: '/culture', label: 'Culture', icon: 'heart' as const },
  { href: '/faq', label: 'FAQ', icon: 'chatbubbles' as const },
];

export default function NotFound() {
  return (
    <Container width="narrow" className="flex justify-center py-24 sm:py-32">
      <div className="flex flex-col items-center text-center">
        {/* The Bisaya line stays: a 404 in the site's own language is the point. */}
        <p className="font-mono text-7xl font-semibold tracking-tight text-gradient sm:text-8xl">
          404
        </p>

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
          Wala nakaplagi
        </h1>
        <p className="mt-3.5 max-w-md text-base leading-relaxed text-ink-soft">
          That page could not be found. It may have moved, or the link may be wrong.
        </p>

        <Link href="/" className="btn-primary mt-9 px-6 py-3">
          Back to home
        </Link>

        <GlassCard level={1} className="mt-14 w-full p-6">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
            Or try one of these
          </p>
          <ul className="mt-5 grid grid-cols-2 gap-3">
            {SUGGESTIONS.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="press flex items-center gap-2.5 rounded-control border border-line bg-white/[0.04] px-4 py-3 text-sm font-medium text-ink-soft transition-colors hover:border-brand/30 hover:text-brand"
                >
                  <Icon name={s.icon} className="h-4 w-4 shrink-0" />
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </Container>
  );
}
