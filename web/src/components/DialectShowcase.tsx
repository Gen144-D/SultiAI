'use client';

import { useState } from 'react';
import Icon from './Icon';
import { DIALECTS } from '@/lib/product';
import { GlassCard } from './ui';

/**
 * Real phrase data from the app's pronunciation bank, switchable by dialect.
 *
 * This is the product's strongest proof point: the same meaning is phrased
 * differently in Cebuano, Hiligaynon and Waray, and each carries a stress guide
 * the app actually uses.
 */
export default function DialectShowcase() {
  const [active, setActive] = useState(DIALECTS[0].id);
  const dialect = DIALECTS.find((d) => d.id === active) ?? DIALECTS[0];
  const shown = dialect.phrases.slice(0, 5);

  return (
    <GlassCard level={3} sheen className="p-5 sm:p-6">
      <div role="tablist" aria-label="Choose a dialect" className="flex flex-wrap gap-2">
        {DIALECTS.map((d) => {
          const on = d.id === dialect.id;
          return (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(d.id)}
              className={`press rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                on
                  ? 'border-brand/40 bg-brand-light text-brand'
                  : 'border-line bg-white/5 text-ink-soft hover:border-brand/30 hover:text-ink'
              }`}
            >
              {d.name}
            </button>
          );
        })}
      </div>

      <p className="mt-5 font-mono text-xs text-brand">{dialect.tagline}</p>

      <ul className="mt-3 divide-y divide-line/70">
        {shown.map((p) => (
          <li key={p.bisaya} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3.5">
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-ink">{p.bisaya}</span>
              <span className="block text-sm text-ink-soft">{p.english}</span>
            </span>
            <span className="rounded-control border border-brand/20 bg-brand-light px-2.5 py-1 font-mono text-xs font-semibold text-brand">
              {p.pronunciation}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex items-start gap-2 border-t border-line/70 pt-4 text-xs leading-relaxed text-ink-faint">
        <Icon name="wave" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        Every phrase above is from the app&rsquo;s own pronunciation bank, with the stress guide
        shown exactly as a learner sees it.
      </p>
    </GlassCard>
  );
}
