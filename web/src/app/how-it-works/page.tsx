import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import CTASection from '@/components/CTASection';
import Reveal from '@/components/Reveal';
import { Container, GlassCard, Pill, Section } from '@/components/ui';

export const metadata: Metadata = {
  title: 'How it Works',
  description: 'See how SultiAI helps you go from first words to real Bisaya conversations.',
};

const phases = [
  {
    step: '01',
    title: 'Tell SultiAI about you',
    body: 'Pick your native language and your learning goal. SultiAI calibrates the difficulty, content, and pace to fit you.',
    points: ['Set your native language', 'Choose your learning goal', 'Get a personalized plan'],
  },
  {
    step: '02',
    title: 'Learn through conversation',
    body: 'Chat with the AI tutor, practice your voice, and complete short lessons. Every interaction teaches you something new.',
    points: [
      'AI tutor conversations',
      'Voice practice with feedback',
      'Daily challenges & flashcards',
    ],
  },
  {
    step: '03',
    title: 'Grow, earn, and connect',
    body: 'Earn XP, build your streak, and join the community. Verify your skills with native speakers as you go.',
    points: ['XP, levels & badges', 'Streaks & leaderboards', 'Native speaker verification'],
  },
  {
    step: '04',
    title: 'Keep Bisaya alive',
    body: 'Contribute phrases to the Living Lexicon and discover the cultural stories behind the words you learn.',
    points: [
      'Preserve heritage words',
      'Explore dialectal variations',
      'Join the culture community',
    ],
  },
];

export default function HowItWorks() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="Your path from first word to real conversation"
        description="SultiAI is designed around one idea: you learn a language by actually using it."
      />

      <Section>
        <Container width="narrow">
          <ol className="space-y-5">
            {phases.map((p, i) => (
              <Reveal key={p.step} delay={i * 0.07}>
                <GlassCard as="li" level={2} interactive className="p-6 sm:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:gap-7">
                    {/* The numeral is the step, and it doubles as the progress
                        cue — no separate timeline needed. */}
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.9rem] border border-brand/25 bg-brand-light font-mono text-sm font-bold text-brand">
                      {p.step}
                    </span>

                    <div className="flex-1">
                      <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">
                        {p.title}
                      </h2>
                      <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{p.body}</p>
                      <ul className="mt-5 flex flex-wrap gap-2">
                        {p.points.map((pt) => (
                          <li key={pt}>
                            <Pill tone="brand">{pt}</Pill>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </GlassCard>
              </Reveal>
            ))}
          </ol>
        </Container>
      </Section>

      <CTASection />
    </>
  );
}
