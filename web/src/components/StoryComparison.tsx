import Icon from './Icon';
import Reveal from './Reveal';
import { GlassCard } from './ui';

/**
 * Why conversation-first learning wins. Compares approaches without
 * attacking any real competitor — the contrast is method vs method.
 */
const CARDS = [
  {
    icon: 'book' as const,
    tag: 'Traditional apps',
    title: 'Vocabulary without conversation',
    body: 'Flashcards and drills teach words in isolation. You can pass every quiz and still freeze when a native speaker asks you something real.',
  },
  {
    icon: 'globe' as const,
    tag: 'Translation tools',
    title: 'Meaning without culture',
    body: 'Translators give you the words but not the particles, the humor, or the context that makes Bisaya sound like Bisaya.',
  },
  {
    icon: 'sparkle' as const,
    tag: 'SultiAI',
    title: 'Practice speaking naturally',
    body: 'Hold real conversations with an AI tutor that hears how you sound, corrects you in context, and teaches the culture behind the words.',
    highlight: true,
  },
];

export default function StoryComparison() {
  return (
    <div className="mt-14 grid gap-5 md:grid-cols-3">
      {CARDS.map((c, i) => (
        <Reveal key={c.tag} delay={i * 0.08}>
          <GlassCard
            level={c.highlight ? 3 : 2}
            sheen={c.highlight}
            interactive
            className="h-full p-6"
          >
            <p
              className={`text-[11px] font-bold tracking-[0.16em] uppercase ${
                c.highlight ? 'text-brand' : 'text-ink-faint'
              }`}
            >
              {c.tag}
            </p>
            <span
              className={`mt-4 flex h-11 w-11 items-center justify-center rounded-[0.85rem] border text-brand ${
                c.highlight ? 'border-brand/30 bg-brand-light' : 'border-line bg-white/[0.04]'
              }`}
            >
              <Icon name={c.icon} className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-ink">{c.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{c.body}</p>
          </GlassCard>
        </Reveal>
      ))}
    </div>
  );
}
