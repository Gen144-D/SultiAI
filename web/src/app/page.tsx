import Hero from '@/components/Hero';
import FeatureCard from '@/components/FeatureCard';
import SectionHeading from '@/components/SectionHeading';
import CTASection from '@/components/CTASection';
import Link from 'next/link';

const features = [
  {
    icon: '🤖',
    title: 'SULTI AI Tutor',
    description:
      'Chat with an adaptive AI tutor that corrects your Bisaya in real time and tracks your common mistakes.',
  },
  {
    icon: '🎙',
    title: 'Voice Mode',
    description:
      'Practice speaking with voice-driven conversations and get pronunciation feedback instantly.',
  },
  {
    icon: '🌏',
    title: 'AR Cultural Scenarios',
    description:
      'Point your camera at everyday objects to learn the Bisaya words right in your real environment.',
  },
  {
    icon: '❤️',
    title: 'Community',
    description:
      'Connect with native speakers, share phrases, and get your speaking verified by the community.',
  },
  {
    icon: '⚡',
    title: 'XP & Rewards',
    description:
      'Level up with streaks, daily challenges, badges, and a leaderboard that keeps you motivated.',
  },
  {
    icon: '🏛',
    title: 'Cultural Discovery',
    description:
      'Explore the Living Lexicon — dialectal variations and heritage words preserved for the future.',
  },
];

const steps = [
  {
    step: '01',
    title: 'Download',
    description: 'Install SultiAI on your Android device from Google Play.',
  },
  {
    step: '02',
    title: 'Practice daily',
    description: 'Learn with the AI tutor, voice mode, and bite-sized lessons.',
  },
  {
    step: '03',
    title: 'Speak with confidence',
    description: 'Join the community, earn XP, and keep Bisaya alive.',
  },
];

export default function Home() {
  return (
    <>
      <Hero />

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Why SultiAI"
          title="Everything you need to speak Bisaya"
          description="A complete learning experience built around real conversation, real culture, and real community."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/features"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark"
          >
            Explore all features
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="How it works"
            title="Three steps to your first Bisaya conversation"
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="relative rounded-3xl border border-line bg-white p-6">
                <span className="text-4xl font-extrabold text-brand-light">{s.step}</span>
                <h3 className="mt-3 text-lg font-bold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark"
            >
              See how it works in detail
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Community"
          title="Keeping Cebuano alive, together"
          description="SultiAI isn't just about learning — it's about preservation. Share phrases, verify native speakers, and contribute to the Living Lexicon."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { value: '4,200+', label: 'Community posts' },
            { value: '1,800+', label: 'Preserved words' },
            { value: '900+', label: 'Native speakers' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-3xl bg-gradient-to-br from-brand-light to-white p-6 text-center"
            >
              <p className="text-3xl font-extrabold text-brand-dark">{s.value}</p>
              <p className="mt-2 text-sm text-ink-soft">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <CTASection />
    </>
  );
}
