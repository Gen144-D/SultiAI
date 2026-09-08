import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import CTASection from '@/components/CTASection';

export const metadata: Metadata = {
  title: 'About',
  description: 'The story and mission behind SultiAI.',
};

const values = [
  {
    icon: '🗣',
    title: 'Language is identity',
    body: 'We believe speaking your language is a form of belonging — and Bisaya deserves to flourish.',
  },
  {
    icon: '🎓',
    title: 'Learning by doing',
    body: 'Real conversations beat rote memorization. Our AI makes practice feel natural.',
  },
  {
    icon: '🤝',
    title: 'Community-first',
    body: 'Technology preserves what people speak. We build with — not just for — the community.',
  },
  {
    icon: '🌱',
    title: 'Accessible to all',
    body: 'A free tier and phone-first design mean anyone can start learning, anywhere.',
  },
];

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="Bringing Bisaya into the digital age"
        description="SultiAI is a capstone project turned mission: to make learning Cebuano as easy, joyful, and social as possible."
      />

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <div className="rounded-3xl border border-line bg-white p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-ink">Our story</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-ink-soft sm:text-base">
            <p>
              Cebuano (Bisaya) is one of the most widely spoken languages in the Philippines — yet
              language-learning tools for it remain scarce. We saw a gap: learners had Duolingo for
              Spanish and French, but nothing built specifically for the languages of the Visayas.
            </p>
            <p>
              So we built SultiAI. It combines an adaptive AI tutor, speech-driven practice, and a
              community of native speakers into one experience — designed from the ground up for
              Bisaya and the culture that surrounds it.
            </p>
            <p>
              Along the way we realized the app could do more than teach. It could help preserve the
              language itself — through the Living Lexicon, dialectal variations, and native-speaker
              verification. Every learner becomes a participant in that mission.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-ink">What we believe</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div
                key={v.title}
                className="rounded-3xl border border-line bg-white p-6 text-center"
              >
                <span className="text-3xl">{v.icon}</span>
                <h3 className="mt-3 text-base font-bold text-ink">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
