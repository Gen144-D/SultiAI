import Icon, { type IconName } from './Icon';
import Reveal from './Reveal';
import { GlassCard } from './ui';

/**
 * The 4-step AI pipeline: Speak → Speech Recognition → Language
 * Intelligence → AI Tutor Response. Each step maps to a real subsystem
 * (device mic → Whisper STT → G2P + acoustic scoring → LLM tutor + TTS).
 */
const STEPS: { icon: IconName; step: string; title: string; body: string }[] = [
  {
    icon: 'mic',
    step: '01',
    title: 'Speak',
    body: 'Talk naturally in Bisaya. Voice mode listens; typing works when you are not ready to speak aloud.',
  },
  {
    icon: 'wave',
    step: '02',
    title: 'Speech Recognition',
    body: 'Whisper-powered transcription turns your voice into text, tuned for Filipino speech patterns.',
  },
  {
    icon: 'sparkle',
    step: '03',
    title: 'Language Intelligence',
    body: 'Acoustic scoring (MFCC, pitch, formants) plus grammar analysis finds exactly which sounds and particles to fix.',
  },
  {
    icon: 'chatbubbles',
    step: '04',
    title: 'AI Tutor Response',
    body: 'SULTI answers in Bisaya with corrections in context, voice playback, and XP for every exchange.',
  },
];

export default function AIPipeline() {
  return (
    <ol className="relative mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Connector line behind cards on desktop */}
      <div
        aria-hidden="true"
        className="pipeline-flow pointer-events-none absolute top-10 right-8 left-8 hidden h-px lg:block"
      />
      {STEPS.map((s, i) => (
        <Reveal key={s.step} delay={i * 0.08} as="li">
          <GlassCard level={2} className="relative h-full p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-[0.85rem] border border-brand/20 bg-brand-light text-brand">
              <Icon name={s.icon} className="h-5 w-5" />
            </span>
            <p className="mt-5 font-mono text-xs font-bold text-brand">{s.step}</p>
            <h3 className="mt-1.5 text-base font-semibold text-ink">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute top-10 -right-2 hidden h-6 w-6 items-center justify-center rounded-full border border-brand/30 bg-[#07111f] text-brand lg:flex"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            )}
          </GlassCard>
        </Reveal>
      ))}
    </ol>
  );
}
