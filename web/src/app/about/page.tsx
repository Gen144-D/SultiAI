import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import CTASection from '@/components/CTASection';
import Icon from '@/components/Icon';
import Reveal from '@/components/Reveal';
import { Container, GlassCard, Section, SectionHeading } from '@/components/ui';

export const metadata: Metadata = {
  title: 'About',
  description: 'The story and mission behind SultiAI.',
};

const values = [
  {
    icon: 'chatbubbles' as const,
    title: 'Language is identity',
    body: 'We believe speaking your language is a form of belonging — and Bisaya deserves to flourish.',
  },
  {
    icon: 'school' as const,
    title: 'Learning by doing',
    body: 'Real conversations beat rote memorization. Our AI makes practice feel natural.',
  },
  {
    icon: 'people' as const,
    title: 'Community-first',
    body: 'Technology preserves what people speak. We build with — not just for — the community.',
  },
  {
    icon: 'heart' as const,
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

      <Section spacing="tight">
        <Container width="narrow">
          <GlassCard level={2} sheen className="p-7 sm:p-10">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Our story</h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-ink-soft sm:text-base">
              <p>
                Cebuano (Bisaya) is one of the most widely spoken languages in the Philippines — yet
                language-learning tools for it remain scarce. We saw a gap: learners had Duolingo
                for Spanish and French, but nothing built specifically for the languages of the
                Visayas.
              </p>
              <p>
                So we built SultiAI. It combines an adaptive AI tutor, speech-driven practice, and a
                community of native speakers into one experience — designed from the ground up for
                Bisaya and the culture that surrounds it.
              </p>
              <p>
                Along the way we realized the app could do more than teach. It could help preserve
                the language itself — through the Living Lexicon, dialectal variations, and
                native-speaker verification. Every learner becomes a participant in that mission.
              </p>
            </div>
          </GlassCard>
        </Container>
      </Section>

      <Section>
        <Container width="wide">
          <SectionHeading eyebrow="Principles" title="What we believe" />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.07}>
                <GlassCard interactive className="h-full p-6 text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-[0.85rem] border border-brand/20 bg-brand-light text-brand">
                    <Icon name={v.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{v.body}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <CTASection />
    </>
  );
}
