import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import PricingCard from '@/components/PricingCard';
import CTASection from '@/components/CTASection';

export const metadata: Metadata = {
  title: 'Pricing',
  description: "SultiAI pricing — start free, upgrade to Premium when you're ready.",
};

export default function Pricing() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Simple, honest pricing"
        description="Start free and upgrade only when you want the full experience."
      />

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <PricingCard />
        <p className="mx-auto mt-8 max-w-lg text-center text-xs leading-relaxed text-ink-faint">
          Prices shown are mock values for design purposes. Actual pricing will be confirmed before
          launch. Premium supports the preservation initiatives that keep Bisaya alive.
        </p>
      </section>

      <CTASection />
    </>
  );
}
