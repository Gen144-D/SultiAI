import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import CTASection from '@/components/CTASection';
import Icon from '@/components/Icon';
import Reveal from '@/components/Reveal';
import { Container, GlassCard, Section } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Culture',
  description: 'Why SultiAI exists — the culture and language of the Bisaya people.',
};

const facets = [
  {
    icon: 'globe' as const,
    title: 'The Visayas',
    body: "Bisaya is the lingua franca of the Visayas and much of Mindanao — tens of millions of speakers, and one of the world's great island cultures.",
  },
  {
    icon: 'book' as const,
    title: 'Heritage words',
    body: 'Every language carries history. Our Living Lexicon captures dialectal variations and words that are slowly disappearing from daily use.',
  },
  {
    icon: 'chatbubbles' as const,
    title: 'Ways of speaking',
    body: "Politeness levels, honorifics, and context-shifting greetings — Bisaya is a language where the way you speak reflects who you are and who you're with.",
  },
  {
    icon: 'wave' as const,
    title: 'Language & song',
    body: 'From folk songs to modern Bisrock, music keeps the language alive. We surface these cultural touchpoints inside your lessons.',
  },
];

const WORDS = [
  { word: 'Inipit', meaning: 'A soft, sweet cake — and a term of endearment' },
  { word: 'Padayon', meaning: 'Keep going; press on' },
  { word: 'Kinaraan', meaning: 'Something traditional or time-honored' },
];

export default function Culture() {
  return (
    <>
      <PageHero
        eyebrow="Culture"
        title="Language is culture, alive"
        description="SultiAI isn't just vocabulary lists — it's an invitation into the world behind the words."
      />

      <Section spacing="tight">
        <Container width="wide">
          <div className="grid gap-5 sm:grid-cols-2">
            {facets.map((f, i) => (
              <Reveal key={f.title} delay={Math.min(i, 3) * 0.07}>
                <GlassCard interactive className="h-full p-7">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[0.85rem] border border-brand/20 bg-brand-light text-brand">
                    <Icon name={f.icon} className="h-5 w-5" />
                  </span>
                  <h2 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-ink">
                    {f.title}
                  </h2>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{f.body}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section spacing="tight">
        <Container width="narrow">
          <GlassCard level={3} sheen className="overflow-hidden p-7 sm:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-60"
              style={{
                backgroundImage:
                  'radial-gradient(420px 180px at 30% -20%, var(--brand-glow), transparent 70%)',
              }}
            />

            <div className="relative">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
                A few words we love
              </h2>

              <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                {WORDS.map((w) => (
                  <div key={w.word} className="glass-1 rounded-control p-5">
                    <dt className="text-xl font-semibold tracking-[-0.02em] text-brand">
                      {w.word}
                    </dt>
                    <dd className="mt-2 text-sm leading-relaxed text-ink-soft">{w.meaning}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-8 text-sm leading-relaxed text-ink-soft">
                Learn these and hundreds more — preserved and taught by the SultiAI community.
              </p>
            </div>
          </GlassCard>
        </Container>
      </Section>

      <CTASection />
    </>
  );
}
