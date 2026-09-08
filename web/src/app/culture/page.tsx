import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import CTASection from '@/components/CTASection';

export const metadata: Metadata = {
  title: 'Culture',
  description: 'Why SultiAI exists — the culture and language of the Bisaya people.',
};

const facets = [
  {
    icon: '🏝',
    title: 'The Visayas',
    body: "Bisaya is the lingua franca of the Visayas and much of Mindanao — tens of millions of speakers, and one of the world's great island cultures.",
  },
  {
    icon: '📜',
    title: 'Heritage words',
    body: 'Every language carries history. Our Living Lexicon captures dialectal variations and words that are slowly disappearing from daily use.',
  },
  {
    icon: '🍲',
    title: 'Ways of speaking',
    body: "Politeness levels, honorifics, and context-shifting greetings — Bisaya is a language where the way you speak reflects who you are and who you're with.",
  },
  {
    icon: '🎶',
    title: 'Language & song',
    body: 'From folk songs to modern Bisrock, music keeps the language alive. We surface these cultural touchpoints inside your lessons.',
  },
];

export default function Culture() {
  return (
    <>
      <PageHero
        eyebrow="Culture"
        title="Language is culture, alive"
        description="SultiAI isn't just vocabulary lists — it's an invitation into the world behind the words."
      />

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {facets.map((f) => (
            <div key={f.title} className="rounded-3xl border border-line bg-white p-7">
              <span className="text-3xl">{f.icon}</span>
              <h2 className="mt-4 text-lg font-bold text-ink">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-8 text-white sm:p-12">
          <h2 className="text-2xl font-bold">A few words we love</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { word: 'Inipit', meaning: 'A soft, sweet cake — and a term of endearment' },
              { word: 'Padayon', meaning: 'Keep going; press on' },
              { word: 'Kinaraan', meaning: 'Something traditional or time-honored' },
            ].map((w) => (
              <div key={w.word} className="rounded-2xl bg-white/10 p-5">
                <p className="text-xl font-bold text-accent">{w.word}</p>
                <p className="mt-2 text-sm text-white/85">{w.meaning}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-white/75">
            Learn these and hundreds more — preserved and taught by the SultiAI community.
          </p>
        </div>
      </section>

      <CTASection />
    </>
  );
}
