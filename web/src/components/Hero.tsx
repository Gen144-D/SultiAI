import Link from 'next/link';
import ApkButton from './ApkButton';
import PhoneMockup from './PhoneMockup';
import Icon from './Icon';
import { getApkRelease } from '@/lib/apk';
import { APP } from '@/lib/site';
import { Container } from './ui';

/**
 * The landing hero. One job: make a visitor understand the product in
 * five seconds — "Learn Bisaya by speaking with AI" — and offer the
 * next step (APK download) immediately.
 */
export default async function Hero() {
  const release = await getApkRelease();

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(900px 460px at 20% 4%, var(--nebula-1), transparent 64%), radial-gradient(760px 420px at 88% 32%, var(--nebula-2), transparent 62%)',
        }}
      />

      <Container width="wide" className="pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-12">
          <div className="anim-enter">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-light px-3.5 py-1.5 text-xs font-semibold text-brand">
              <span className="anim-pulse h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
              AI-Powered Bisaya Language Companion
            </span>

            <h1 className="mt-7 text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance text-ink sm:text-6xl lg:text-[4.1rem]">
              Master Bisaya Through <span className="text-gradient">Real Conversations</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-ink-soft sm:text-xl">
              Practice Cebuano/Bisaya through real-time AI conversations, pronunciation feedback,
              and personalized lessons designed for Filipino language learners.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <ApkButton release={release} label="Download SultiAI APK" />
              <Link href="#modules" className="btn-ghost px-6 py-3">
                Explore Features
              </Link>
            </div>

            <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
              <Icon name="shield" className="h-3.5 w-3.5 shrink-0 text-brand" />
              {APP.minAndroid} &middot; Free installation &middot; No account needed to start
            </p>
          </div>

          <div className="relative lg:pl-4">
            <PhoneMockup />
          </div>
        </div>
      </Container>
    </section>
  );
}
