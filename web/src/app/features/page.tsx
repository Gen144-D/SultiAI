import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import CTASection from '@/components/CTASection';
import ModuleGrid from '@/components/ModuleGrid';
import Icon from '@/components/Icon';
import Reveal from '@/components/Reveal';
import { PRONUNCIATION_SIGNALS } from '@/lib/product';
import { Container, GlassCard, ProofStat, Section, SectionHeading } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Everything SultiAI does: eight learning modules, the SULTI AI tutor, acoustic pronunciation scoring, voice mode, AR cultural scenarios, and a native-speaker community.',
  alternates: { canonical: '/features' },
};

/** Secondary capabilities that exist as screens but are not learning modules. */
const CAPABILITIES = [
  {
    icon: 'mic' as const,
    title: 'Voice Mode',
    body: 'Hold a spoken conversation with SULTI. It listens, replies, and scores what it hears so you can drill the same sentence until it sounds right.',
  },
  {
    icon: 'camera' as const,
    title: 'AR Cultural Scenarios',
    body: 'Point the camera at an object in front of you and get the Bisaya word for it in that exact context, rather than in an abstract word list.',
  },
  {
    icon: 'sparkle' as const,
    title: 'Pronunciation Lab',
    body: 'A dedicated screen for drilling individual words, with per-phoneme feedback and a trend line showing whether your accuracy is actually improving.',
  },
  {
    icon: 'refresh' as const,
    title: 'Flashcards & Review',
    body: 'Vocabulary cards scheduled by spaced repetition, so words resurface at the moment you are about to forget them.',
  },
  {
    icon: 'trophy' as const,
    title: 'Achievements & Leaderboard',
    body: 'XP, levels, badges and a weekly leaderboard give daily practice something to push against.',
  },
  {
    icon: 'globe' as const,
    title: 'Dialect Selection',
    body: 'Cebuano, Hiligaynon or Waray. Each dialect drives its own phrase bank and phoneme rules throughout the app.',
  },
];

const SIGNALS = [
  { value: '3', label: 'Signal features combined' },
  { value: 'Per-phoneme', label: 'Feedback, not a single number' },
  { value: '0', label: 'Third-party services required' },
  { value: '3', label: 'Dialect phoneme inventories' },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="Everything in the app, and nothing invented"
        description="Each section below maps to a screen that ships in SultiAI 1.0.0. The module names and descriptions are the ones used inside the app itself."
      />

      <Section>
        <Container width="wide">
          <SectionHeading
            eyebrow="Learning modules"
            title="The eight modules"
            description="Tap any module in the app and SULTI turns it into a live conversation, so practice is never a passive reading exercise."
          />
          <div className="mt-14">
            <ModuleGrid />
          </div>
        </Container>
      </Section>

      <Section className="border-y border-line">
        <Container width="wide">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionHeading
                align="left"
                eyebrow="Pronunciation"
                title="Real acoustic analysis"
                description="The score comes from your audio, analysed on the server with three complementary signal features. No external AI service is required for the core path, so scoring works even when the optional model provider is not configured."
              />
              <ul className="mt-9 space-y-3">
                {PRONUNCIATION_SIGNALS.map((s) => (
                  <li key={s.label} className="flex gap-3">
                    <Icon
                      name="check"
                      className="mt-0.5 h-4 w-4 shrink-0 text-success"
                      strokeWidth={2.5}
                    />
                    <span>
                      <span className="font-mono text-sm font-semibold text-accent">{s.label}</span>{' '}
                      <span className="text-sm text-ink-soft">— {s.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {SIGNALS.map((s) => (
                <GlassCard key={s.label} level={1} className="p-5">
                  <ProofStat value={s.value} label={s.label} />
                </GlassCard>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container width="wide">
          <SectionHeading
            eyebrow="Beyond the modules"
            title="Screens that support them"
            description="The supporting screens that turn a module into daily practice."
          />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c, i) => (
              <Reveal key={c.title} delay={Math.min(i, 5) * 0.06}>
                <GlassCard interactive className="h-full p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[0.85rem] border border-brand/20 bg-brand-light text-brand">
                    <Icon name={c.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{c.body}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <CTASection />
    </>
  );
}
