import Link from 'next/link';
import ApkButton from './ApkButton';
import Icon from './Icon';
import { Container, GlassCard } from './ui';
import { getApkRelease } from '@/lib/apk';

/**
 * The closing call to action.
 *
 * Presented as a glass panel rather than a solid brand gradient: on a dark page
 * the brightest element should be the button, not the container behind it.
 */
export default async function CTASection() {
  const release = await getApkRelease();

  return (
    <Container width="wide" className="py-16 sm:py-20">
      <GlassCard
        level={3}
        sheen
        className="anim-pop overflow-hidden px-6 py-14 text-center sm:px-12 sm:py-18"
      >
        {/* Warm bloom from below, so the panel has a light source and the mint
            button does not float on a dead surface. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[36rem] max-w-full -translate-x-1/2 rounded-full blur-3xl"
          style={{
            backgroundImage: 'radial-gradient(closest-side, var(--nebula-1), transparent 70%)',
          }}
        />

        <p className="relative text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Free to download
        </p>

        <h2 className="relative mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-balance text-ink sm:text-4xl">
          Start your Bisaya learning journey today
        </h2>

        <p className="relative mx-auto mt-4 max-w-xl text-base leading-relaxed text-pretty text-ink-soft">
          Join the first generation of Bisaya AI learners. Download the app and start a real Bisaya
          conversation in minutes.
        </p>

        <div className="relative mt-9 flex justify-center">
          <ApkButton release={release} />
        </div>

        <ul className="relative mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-soft">
          <li className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/5 px-3 py-1.5">
            <Icon name="check" className="h-3 w-3 text-success" strokeWidth={2.5} />
            Free
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/5 px-3 py-1.5">
            <Icon name="check" className="h-3 w-3 text-success" strokeWidth={2.5} />
            No subscription required
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/5 px-3 py-1.5">
            <Icon name="phone" className="h-3 w-3 text-brand" strokeWidth={2} />
            Android 8.0+ support
          </li>
        </ul>

        <p className="relative mt-6 text-xs text-ink-faint">
          Questions before you install?{' '}
          <Link href="/download#install" className="link-brand">
            See the install steps
          </Link>
          <span aria-hidden="true" className="mx-1.5 inline-flex translate-y-0.5">
            <Icon name="arrow" className="h-3 w-3" strokeWidth={2.25} />
          </span>
        </p>
      </GlassCard>
    </Container>
  );
}
