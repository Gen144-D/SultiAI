import type { Metadata } from 'next';
import Link from 'next/link';
import AIPipeline from '@/components/AIPipeline';
import ApkButton from '@/components/ApkButton';
import CTASection from '@/components/CTASection';
import DialectShowcase from '@/components/DialectShowcase';
import Hero from '@/components/Hero';
import Icon from '@/components/Icon';
import ModuleGrid from '@/components/ModuleGrid';
import Reveal from '@/components/Reveal';
import StoryComparison from '@/components/StoryComparison';
import SultiDemo from '@/components/SultiDemo';
import TechShowcase from '@/components/TechShowcase';
import { getApkRelease } from '@/lib/apk';
import { DIFFERENTIATORS, PRONUNCIATION_SIGNALS, TABS } from '@/lib/product';
import {
  CodeBlock,
  Container,
  GlassCard,
  ProofStat,
  Section,
  SectionHeading,
} from '@/components/ui';

export const metadata: Metadata = {
  title: 'Learn Bisaya with AI',
  description:
    'SultiAI is an AI language partner for Bisaya — a tutor you talk to out loud, acoustic pronunciation scoring, eight learning modules, and a community of native speakers. Download the Android APK directly, no Play Store needed.',
  alternates: { canonical: '/' },
};

const PROOF = [
  { value: '8', label: 'Learning modules' },
  { value: '3', label: 'Visayan dialects' },
  { value: 'MFCC', label: 'Acoustic scoring' },
  { value: '0', label: 'Play Store steps' },
];

const SULTI_STEPS = [
  {
    step: '01',
    title: 'Talk, or type',
    body: 'Open SULTI and start a conversation. Use the microphone for voice mode, or type when you are not ready to speak aloud.',
  },
  {
    step: '02',
    title: 'It corrects you in context',
    body: 'SULTI answers in Bisaya, flags the particles and word order you are getting wrong, and explains why — not just what is wrong.',
  },
  {
    step: '03',
    title: 'You practise it back',
    body: 'Turn any module straight into a roleplay: bargaining, hailing a ride, ordering food. Every conversation counts toward XP.',
  },
];

const COMMUNITY_POINTS = [
  {
    icon: 'people' as const,
    title: 'Verified native speakers',
    body: 'Learners ask for verification, native speakers confirm them. Trust is earned, not assumed.',
  },
  {
    icon: 'heart' as const,
    title: 'A Living Lexicon',
    body: 'Every submitted word and phrase is reviewed and kept, so dialectal and heritage vocabulary survives.',
  },
  {
    icon: 'trophy' as const,
    title: 'Progress you can see',
    body: 'XP, streaks, badges and a leaderboard make daily practice something you want to keep doing.',
  },
];

const PHONEME_ROWS = [
  { p: 'k', ok: true },
  { p: 'u', ok: true },
  { p: 'm', ok: true },
  { p: 'u', ok: false },
  { p: 's', ok: true },
  { p: 't', ok: true },
  { p: 'a', ok: true },
];

const FAQS = [
  {
    q: 'Do I need a Google account to install this?',
    a: 'No. The app is distributed as a direct APK download, so there is no Play Store account, review queue or waiting period. You allow installs from your browser once, and that is it.',
  },
  {
    q: 'Which languages are covered?',
    a: 'Cebuano (Bisaya), Hiligaynon (Ilonggo) and Waray-Waray. Each has its own phrase bank and grapheme-to-phoneme rules, so pronunciation guides are not read with the wrong dialect.',
  },
  {
    q: 'Is there really no Play Store version?',
    a: 'Correct. Direct APK is the only channel right now. That is a deliberate choice: it means no store policy review, no region restrictions, and updates ship the moment they are built.',
  },
  {
    q: 'What does pronunciation scoring actually measure?',
    a: 'Your recording is analysed in-process using mel-frequency cepstral coefficients, pitch tracking and formant identification, then compared phoneme by phoneme against the target phrase. You get a per-phoneme breakdown, not just a number.',
  },
  {
    q: 'Is there a developer API?',
    a: 'Yes. The same pronunciation scoring, grapheme-to-phoneme conversion and Living Lexicon lookup are available over a public API, and there is an MCP server so AI agents can call them directly.',
  },
];

export default async function Home() {
  const release = await getApkRelease();

  return (
    <>
      <Hero />

      {/* --------------------------------------------------------------- Proof */}
      <Section spacing="tight" className="border-y border-line">
        <Container>
          <dl className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
            {PROOF.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06}>
                <ProofStat value={s.value} label={s.label} />
              </Reveal>
            ))}
          </dl>
        </Container>
      </Section>

      {/* -------------------------------------------------------- Product story */}
      <Section id="why">
        <Container width="wide">
          <SectionHeading
            eyebrow="Why SultiAI"
            title="Learning Bisaya is more than memorizing words"
            description="Vocabulary lists and translators stop where real conversation starts. SultiAI exists for the part that actually matters: speaking with confidence."
          />
          <StoryComparison />
        </Container>
      </Section>

      {/* ---------------------------------------------------------- How it works */}
      <Section id="how-it-works" className="border-y border-line">
        <Container width="wide">
          <SectionHeading
            eyebrow="How SultiAI works"
            title="Speak. The AI handles the rest"
            description="A four-stage pipeline turns your voice into personalized tutoring — from raw audio to a conversation that corrects you."
          />
          <AIPipeline />

          <div className="mt-14 grid gap-14 lg:grid-cols-2 lg:items-center">
            <div className="lg:order-1">
              <SultiDemo />
            </div>

            <div className="lg:order-2">
              <SectionHeading
                align="left"
                eyebrow="SULTI"
                title="A tutor you can argue with"
                description="SULTI is the reason the app exists. It holds a real conversation, corrects you mid-sentence, and never gets bored of a beginner."
              />

              <ol className="mt-9 space-y-3">
                {SULTI_STEPS.map((s) => (
                  <li
                    key={s.step}
                    className="flex gap-4 rounded-control border border-line bg-white/[0.03] p-5"
                  >
                    <span className="font-mono text-xs font-semibold text-brand">{s.step}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{s.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <GlassCard level={1} className="mt-6 p-5">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
                  Your five tabs
                </p>
                <ul className="mt-4 space-y-3">
                  {TABS.map((t, i) => (
                    <li key={t.name} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-light text-[10px] font-bold text-brand">
                        {i + 1}
                      </span>
                      <span>
                        <span className="text-sm font-semibold text-ink">{t.label}</span>
                        <span className="ml-2 text-sm text-ink-soft">{t.blurb}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </div>
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------------ Dialects */}
      <Section id="phrasebook">
        <Container width="wide">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionHeading
                align="left"
                eyebrow="Three dialects"
                title="Not one language, three"
                description="Most apps teach a single variety and call it done. SultiAI ships separate phrase banks and pronunciation rules for each major Visayan language, so the stress and particles you learn are the ones people actually use."
              />
              <div className="mt-9 space-y-5">
                {DIFFERENTIATORS.map((d) => (
                  <div key={d.title} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.8rem] border border-brand/20 bg-brand-light text-brand">
                      <Icon name={d.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{d.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{d.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialectShowcase />
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------------- Modules */}
      <Section id="modules" className="border-y border-line">
        <Container width="wide">
          <SectionHeading
            eyebrow="Inside the app"
            title="Eight modules, one language"
            description="Every module exists in the app today. Pick a skill and SULTI turns it into a conversation immediately."
          />
          <div className="mt-14">
            <ModuleGrid />
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------- Pronunciation */}
      <Section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(700px 400px at 82% 24%, var(--brand-glow), transparent 66%)',
            opacity: 0.5,
          }}
        />
        <Container width="wide">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionHeading
                align="left"
                eyebrow="Pronunciation"
                title="Scored on how you sound, not on what you typed"
                description="Most apps compare your words to the target text and call it a score. SultiAI analyses the recording itself — spectral shape, pitch, and the formants that identify each vowel — then reports which specific phonemes you missed and how to fix them."
              />

              <div className="mt-9 space-y-3">
                {PRONUNCIATION_SIGNALS.map((s) => (
                  <div
                    key={s.label}
                    className="glass-1 flex flex-col gap-1 rounded-control p-4 sm:flex-row sm:items-center sm:gap-5"
                  >
                    <span className="w-24 shrink-0 font-mono text-sm font-semibold text-accent">
                      {s.label}
                    </span>
                    <span className="text-sm text-ink-soft">{s.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            <GlassCard level={3} sheen className="p-6">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
                Phoneme breakdown
              </p>
              <p className="mt-3 text-lg font-semibold text-ink">
                &ldquo;Kumusta ka?&rdquo;
                <span className="ml-2 font-mono text-sm font-normal text-ink-faint">
                  koo-MOOS-ta ka
                </span>
              </p>
              <ul className="mt-5 space-y-2">
                {PHONEME_ROWS.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 rounded-control border border-line/70 bg-white/[0.04] px-3.5 py-2.5"
                  >
                    <Icon
                      name={r.ok ? 'check' : 'mic'}
                      className={`h-4 w-4 shrink-0 ${r.ok ? 'text-success' : 'text-danger'}`}
                      strokeWidth={2.5}
                    />
                    <span className="font-mono text-sm font-bold text-ink">/{r.p}/</span>
                    <span className="text-xs text-ink-faint">
                      {r.ok ? 'matched' : 'vowel too flat — lengthen it'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-line/70 pt-4 text-xs leading-relaxed text-ink-faint">
                Illustrative breakdown. Your recordings are analysed on your own device-request and
                never stored.
              </p>
            </GlassCard>
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------------ Technology */}
      <Section id="technology">
        <Container width="wide">
          <SectionHeading
            eyebrow="AI technology"
            title="Serious technology, simply explained"
            description="Four systems work together every time you speak — and you never have to think about any of them."
          />
          <TechShowcase />
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-ink-faint">
            Built for Filipino language learning innovation — speech models tuned for Visayan
            sounds, pronunciation rules per dialect, and a tutor that teaches culture alongside
            vocabulary.
          </p>
        </Container>
      </Section>

      {/* ----------------------------------------------------------- Community */}
      <Section id="community" className="border-y border-line">
        <Container width="wide">
          <SectionHeading
            eyebrow="Community"
            title="Technology that preserves Filipino languages"
            description="Learning a language you only read about is how it disappears. SultiAI is built around getting learners and native speakers into the same place."
          />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {COMMUNITY_POINTS.map((c, i) => (
              <Reveal key={c.title} delay={i * 0.07}>
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

      {/* --------------------------------------------------------- Developer API */}
      <Section className="border-b border-line">
        <Container width="wide">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionHeading
                align="left"
                eyebrow="For developers"
                title="The same engine, over an API"
                description="Pronunciation scoring, grapheme-to-phoneme conversion and Living Lexicon lookup are available to your own product. Issue a scoped key, and call them over plain HTTPS — or connect the MCP server and let an AI agent use them as tools."
              />
              <Link href="/api" className="btn-ghost mt-8">
                Read the API docs
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>

            <CodeBlock label="curl">{`curl https://sultiai.com/api/v1/g2p \\
  -H "X-API-Key: $SULTIAI_KEY" \\
  -d '{"text":"Kumusta ka?"}'

{ "phonemes": ["k","u","m","u","s","t","a"] }`}</CodeBlock>
          </div>
        </Container>
      </Section>

      {/* ----------------------------------------------------------------- FAQ */}
      <Section id="faq">
        <Container width="narrow">
          <SectionHeading eyebrow="Questions" title="Before you install" />
          <div className="mt-12 space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group glass-1 rounded-card px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
                  <span className="text-base font-semibold text-ink">{f.q}</span>
                  <Icon
                    name="arrow"
                    className="h-4 w-4 shrink-0 rotate-90 text-brand transition-transform duration-300 group-open:rotate-0"
                    strokeWidth={2.25}
                  />
                </summary>
                <p className="mt-3.5 text-sm leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <ApkButton release={release} />
          </div>
        </Container>
      </Section>

      <CTASection />
    </>
  );
}
