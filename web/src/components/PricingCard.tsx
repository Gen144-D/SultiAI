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
    cta: 'Start free',
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
    cta: 'Go Premium',
    highlighted: true,
  },
];

export default function PricingCard() {
  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      {plans.map((p) => (
        <div
          key={p.name}
          className={`relative flex flex-col rounded-3xl border p-8 ${
            p.highlighted
              ? 'border-transparent bg-gradient-to-b from-brand to-brand-dark text-white shadow-xl'
              : 'border-line bg-white'
          }`}
        >
          {p.highlighted && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-bold text-ink">
              Most popular
            </span>
          )}
          <h3 className={`text-lg font-bold ${p.highlighted ? 'text-white' : 'text-ink'}`}>
            {p.name}
          </h3>
          <p className={`mt-1 text-sm ${p.highlighted ? 'text-white/80' : 'text-ink-soft'}`}>
            {p.description}
          </p>
          <p className="mt-6 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold">{p.price}</span>
            <span className={`text-sm ${p.highlighted ? 'text-white/80' : 'text-ink-soft'}`}>
              {p.cadence}
            </span>
          </p>
          <ul className="mt-6 space-y-3">
            {p.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <span className={`mt-0.5 ${p.highlighted ? 'text-accent' : 'text-success'}`}>
                  ✓
                </span>
                <span className={p.highlighted ? 'text-white/90' : 'text-ink-soft'}>{f}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={`mt-8 w-full rounded-full py-3 text-sm font-semibold transition-opacity hover:opacity-90 ${
              p.highlighted
                ? 'bg-white text-brand-dark'
                : 'border border-line bg-surface text-ink hover:border-brand'
            }`}
          >
            {p.cta}
          </button>
        </div>
      ))}
    </div>
  );
}
