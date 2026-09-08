import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import CTASection from '@/components/CTASection';

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

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <ol className="space-y-10">
          {phases.map((p, i) => (
            <li key={p.step} className="relative rounded-3xl border border-line bg-white p-8">
              <div className="flex flex-col gap-6 sm:flex-row">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-lg font-bold text-white">
                  {p.step}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-ink">{p.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.body}</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {p.points.map((pt) => (
                      <li
                        key={pt}
                        className="rounded-full border border-brand/20 bg-brand-light px-3.5 py-1.5 text-xs font-semibold text-brand-dark"
                      >
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {i < phases.length - 1 && (
                <span className="absolute -bottom-6 left-1/2 hidden h-6 w-px -translate-x-1/2 bg-line sm:block" />
              )}
            </li>
          ))}
        </ol>
      </section>

      <CTASection />
    </>
  );
}
