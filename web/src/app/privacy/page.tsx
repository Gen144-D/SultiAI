import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import { APP } from '@/lib/site';
import { Container, Prose, Section } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How SultiAI collects, uses, and protects your data.',
};

const sections = [
  {
    title: '1. Information we collect',
    body: 'We collect information you provide directly — such as your name, email address, and learning preferences. We also collect learning data generated as you use the app, including lesson progress, XP, streaks, and voice recordings used to improve your pronunciation feedback.',
  },
  {
    title: '2. How we use your information',
    body: 'We use your information to provide and personalize SultiAI, generate AI tutoring responses, track your progress, operate the community features, and improve our services. Voice recordings are used only to provide speech recognition and pronunciation feedback.',
  },
  {
    title: '3. Data sharing',
    body: 'We do not sell your personal data. Information shared through community features is public by design. We may share limited data with service providers (such as AI infrastructure) strictly to operate the service, under confidentiality obligations.',
  },
  {
    title: '4. Data storage & security',
    body: 'Your data is stored on secured cloud infrastructure. We use industry-standard measures such as encryption in transit and at rest, and access controls, to protect your information.',
  },
  {
    title: '5. Your choices',
    body: `You can access, correct, or delete your account data at any time from the app's settings. You may also request data deletion by contacting ${APP.contactEmail}.`,
  },
  {
    title: "6. Children's privacy",
    body: 'SultiAI is intended for users aged 13 and above. We do not knowingly collect personal information from children under 13.',
  },
  {
    title: '7. Changes to this policy',
    body: 'We may update this policy from time to time. Material changes will be communicated through the app or on this page. Continued use after changes constitutes acceptance.',
  },
  {
    title: '8. Contact',
    body: `Questions about this policy? Reach us at ${APP.contactEmail}.`,
  },
];

export default function Privacy() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" description="Last updated: August 2026" />

      <Section>
        <Container width="narrow">
          <Prose>
            {sections.map((s) => (
              <section key={s.title}>
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">{s.title}</h2>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </section>
            ))}

            <p className="border-t border-line/70 pt-6 text-xs leading-relaxed text-ink-faint">
              This is a placeholder privacy policy for the SultiAI capstone project and will be
              finalized before public launch.
            </p>
          </Prose>
        </Container>
      </Section>
    </>
  );
}
