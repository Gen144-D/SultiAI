import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import PricingCard from '@/components/PricingCard';
import CTASection from '@/components/CTASection';
import Icon from '@/components/Icon';
import { Container, GlassCard, Section } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Pricing',
  description: "SultiAI pricing — start free, upgrade to Premium when you're ready.",
};

const NOTES = [
  {
    icon: 'shield' as const,
    title: 'Free stays free',
    body: 'Daily challenges, core lessons, flashcards and community access are not behind a paywall.',
  },
  {
    icon: 'heart' as const,
    title: 'Premium funds preservation',
    body: 'Premium supports the Living Lexicon and the native-speaker verification work that keeps the language documented.',
  },
];

export default function Pricing() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Simple, honest pricing"
        description="Start free and upgrade only when you want the full experience."
      />

      <Section>
        <Container>
          <PricingCard />

          <div className="mx-auto mt-14 grid max-w-4xl gap-5 sm:grid-cols-2">
            {NOTES.map((n) => (
              <GlassCard key={n.title} level={1} className="p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-[0.8rem] border border-brand/20 bg-brand-light text-brand">
                  <Icon name={n.icon} className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-base font-semibold text-ink">{n.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{n.body}</p>
              </GlassCard>
            ))}
          </div>

          {/* Kept from the original page: the price is not final and the page
              must not imply it is. */}
          <p className="mx-auto mt-8 max-w-lg text-center text-xs leading-relaxed text-ink-faint">
            Prices shown are mock values for design purposes. Actual pricing will be confirmed
            before launch. Premium supports the preservation initiatives that keep Bisaya alive.
          </p>
        </Container>
      </Section>

      <CTASection />
    </>
  );
}
