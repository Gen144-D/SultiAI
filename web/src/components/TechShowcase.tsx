import Icon, { type IconName } from './Icon';
import Reveal from './Reveal';
import { GlassCard } from './ui';

/**
 * The technology behind SultiAI, explained simply.
 * Every claim maps to a real subsystem in server/src — no research-paper
 * jargon, no invented model names.
 */
const TECH: { icon: IconName; title: string; simple: string; detail: string }[] = [
  {
    icon: 'mic',
    title: 'Speech Recognition',
    simple: 'Hears your Bisaya',
    detail:
      'Whisper-powered transcription converts voice to text, so you can learn by talking — not typing.',
  },
  {
    icon: 'wave',
    title: 'Pronunciation Analysis',
    simple: 'Scores how you sound',
    detail:
      'On-device acoustic analysis (spectral shape, pitch, vowel formants) pinpoints the exact sounds to fix.',
  },
  {
    icon: 'chatbubbles',
    title: 'Conversational AI',
    simple: 'Replies like a tutor',
    detail:
      'A large language model holds real Bisaya conversations and corrects grammar in context — never bored, never rushed.',
  },
  {
    icon: 'sparkle',
    title: 'Voice Technology',
    simple: 'Speaks back clearly',
    detail:
      'Natural text-to-speech reads every phrase aloud at native speed, with stress guides you can follow.',
  },
];

export default function TechShowcase() {
  return (
    <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {TECH.map((t, i) => (
        <Reveal key={t.title} delay={i * 0.07}>
          <GlassCard interactive className="tech-card h-full p-6">
            <span className="tech-icon flex h-11 w-11 items-center justify-center rounded-[0.85rem] border border-brand/20 bg-brand-light text-brand">
              <Icon name={t.icon} className="h-5 w-5" />
            </span>
            <p className="mt-4 text-[11px] font-bold tracking-[0.14em] text-brand uppercase">
              {t.simple}
            </p>
            <h3 className="mt-1.5 text-base font-semibold text-ink">{t.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t.detail}</p>
          </GlassCard>
        </Reveal>
      ))}
    </div>
  );
}
