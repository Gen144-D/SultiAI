import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of SultiAI.',
};

const sections = [
  {
    title: '1. Acceptance of terms',
    body: 'By downloading, accessing, or using SultiAI, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.',
  },
  {
    title: '2. Description of service',
    body: 'SultiAI is an AI-powered language-learning application for Bisaya (Cebuano). It includes an AI tutor, speech practice, lessons, community features, and language-preservation tools.',
  },
  {
    title: '3. Accounts',
    body: 'You must provide accurate information when creating an account. You are responsible for safeguarding your credentials and for all activity under your account. Notify us immediately of any unauthorized use.',
  },
  {
    title: '4. Acceptable use',
    body: "You agree not to misuse the service — including attempting to access other users' data, submitting harmful content, abusing AI features, or interfering with the service's operation.",
  },
  {
    title: '5. Content & community',
    body: 'Content you post in community features must respect others and the language community. We may remove content that violates these terms or is reported by users.',
  },
  {
    title: '6. Subscriptions & payments',
    body: 'Premium features may require a paid subscription. Subscriptions renew automatically unless cancelled before the renewal date. Refunds are handled in accordance with the Google Play refund policy.',
  },
  {
    title: '7. Intellectual property',
    body: 'SultiAI, including its branding, design, and original content, is protected by intellectual property laws. You may use the service for personal, non-commercial learning.',
  },
  {
    title: '8. Disclaimers',
    body: "The service is provided 'as is' without warranties of any kind. AI-generated content may contain errors — always cross-check critical information.",
  },
  {
    title: '9. Limitation of liability',
    body: 'To the maximum extent permitted by law, SultiAI shall not be liable for indirect, incidental, or consequential damages arising from your use of the service.',
  },
  {
    title: '10. Changes & contact',
    body: 'We may update these terms. Continued use after changes constitutes acceptance. Questions? Contact hello@sultiai.com.',
  },
];

export default function Terms() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms of Service" description="Last updated: August 2026" />
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <div className="space-y-8 rounded-3xl border border-line bg-white p-8 sm:p-10">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="text-lg font-bold text-ink">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
          <p className="border-t border-line pt-6 text-xs text-ink-faint">
            This is a placeholder terms page for the SultiAI capstone project and will be finalized
            before public launch.
          </p>
        </div>
      </section>
    </>
  );
}
