import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import FeatureCard from '@/components/FeatureCard';
import CTASection from '@/components/CTASection';

export const metadata: Metadata = {
  title: 'Features',
  description: 'Explore everything SultiAI offers — AI tutor, voice mode, AR, community, and more.',
};

const groups = [
  {
    eyebrow: 'Learn',
    features: [
      {
        icon: '📚',
        title: 'Adaptive lessons',
        description: 'Lessons that adjust to your level, your mistakes, and your learning speed.',
      },
      {
        icon: '🗃',
        title: 'Spaced repetition',
        description: "Smart flashcards that bring back the words you're about to forget.",
      },
      {
        icon: '🎯',
        title: 'Daily challenges',
        description: 'A fresh challenge every day keeps your streak — and your Bisaya — sharp.',
      },
    ],
  },
  {
    eyebrow: 'Speak',
    features: [
      {
        icon: '🤖',
        title: 'SULTI AI Tutor',
        description: 'A patient AI conversation partner that corrects grammar and pronunciation.',
      },
      {
        icon: '🎙',
        title: 'Voice Mode',
        description: 'Real-time speech-to-speech practice that feels like talking to a friend.',
      },
      {
        icon: '🔍',
        title: 'Pronunciation feedback',
        description: 'See exactly where your accent can improve, with phonetic breakdowns.',
      },
    ],
  },
  {
    eyebrow: 'Immerse',
    features: [
      {
        icon: '📱',
        title: 'AR cultural scenarios',
        description: 'Scan real-world objects to learn Bisaya words in context.',
      },
      {
        icon: '🏛',
        title: 'Cultural Discovery',
        description: 'Heritage words, dialectal variations, and stories behind the language.',
      },
      {
        icon: '❤️',
        title: 'Community',
        description: 'Share phrases and get verified by native speakers.',
      },
    ],
  },
  {
    eyebrow: 'Stay motivated',
    features: [
      {
        icon: '⚡',
        title: 'XP & rewards',
        description: 'Earn XP, level up, and unlock badges for every milestone.',
      },
      {
        icon: '🔥',
        title: 'Streaks',
        description: 'Consistency built in — keep your streak alive with gentle reminders.',
      },
      {
        icon: '🏆',
        title: 'Leaderboards',
        description: 'Friendly competition with learners around the world.',
      },
    ],
  },
];

export default function Features() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="A complete Bisaya learning experience"
        description="From your first word to your first real conversation — SultiAI meets you at every step."
      />

      {groups.map((g) => (
        <section key={g.eyebrow} className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-xl font-bold text-ink">{g.eyebrow}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {g.features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>
      ))}

      <CTASection />
    </>
  );
}
