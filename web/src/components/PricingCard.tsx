import Link from 'next/link';
import Icon from './Icon';
import { GlassCard } from './ui';

const plans = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    description: 'Start your Bisaya journey with core lessons and daily practice.',
    features: [
      'Daily challenge',
      'Core lessons',
      'Flashcards & vocabulary',
      'Basic AI tutor chats',
      'Community access',
    ],
    cta: 'Download free',
    highlighted: false,
  },
  {
    name: 'Premium',
    price: '$4.99',
    cadence: '/month',
    description: 'Unlock the full SultiAI experience with unlimited AI and voice.',
    features: [
      'Unlimited AI tutor',
      'Voice Mode & pronunciation',
      'AR cultural scenarios',
      'Offline learning',
      'Native speaker verification',
      'Priority support',
    ],
    cta: 'Get Premium',
    highlighted: true,
  },
];

export default function PricingCard() {
  return (
    <div className="mx-auto grid max-w-4xl items-start gap-6 md:grid-cols-2">
      {plans.map((p) => (
        <GlassCard
          key={p.name}
          level={p.highlighted ? 3 : 2}
          sheen={p.highlighted}
          className={`relative flex flex-col p-7 sm:p-8 ${p.highlighted ? 'border-brand/35' : ''}`}
        >
          {p.highlighted && (
            <>
              <span className="absolute -top-3 left-7 rounded-full border border-brand/30 bg-brand-light px-3 py-1 text-[11px] font-semibold text-brand">
                Most popular
              </span>
              {/* Mint bloom from the top edge so the recommended plan is the
                  brightest object on the page without inverting its text. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70"
                style={{
                  backgroundImage:
                    'radial-gradient(340px 160px at 50% -10%, var(--brand-glow), transparent 70%)',
                }}
              />
            </>
          )}

          <div className="relative">
            <h3 className="text-lg font-semibold text-ink">{p.name}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{p.description}</p>

            <p className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-[-0.03em] text-ink">{p.price}</span>
              <span className="text-sm text-ink-soft">{p.cadence}</span>
            </p>

            <ul className="mt-7 space-y-3">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-soft">
                  <Icon
                    name="check"
                    className="mt-0.5 h-4 w-4 shrink-0 text-success"
                    strokeWidth={2.5}
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* Both plans lead to the download. There is no billing flow wired
                up, and a button that does nothing is worse than no button. */}
            <Link
              href="/download"
              className={`${p.highlighted ? 'btn-primary' : 'btn-ghost'} mt-8 w-full justify-center`}
            >
              {p.cta}
            </Link>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
