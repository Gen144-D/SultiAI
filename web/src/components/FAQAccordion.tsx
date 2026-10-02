'use client';

import { useState } from 'react';
import { GlassCard } from './ui';

export default function FAQAccordion({ items }: { items: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <GlassCard
            key={item.question}
            level={open ? 2 : 1}
            className={open ? 'border-brand/30' : ''}
          >
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`faq-panel-${i}`}
                id={`faq-trigger-${i}`}
                onClick={() => setOpenIndex(open ? null : i)}
                className="press flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="text-sm font-semibold text-ink sm:text-base">{item.question}</span>
                {/* A rotated plus reads as "close" without needing a second glyph,
                    and the rotation is the only motion in the row. */}
                <span
                  aria-hidden="true"
                  className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                    open
                      ? 'rotate-45 border-brand/40 bg-brand-light text-brand'
                      : 'border-line bg-white/5 text-ink-soft'
                  }`}
                >
                  <span className="absolute h-2.5 w-0.5 rounded-full bg-current" />
                  <span className="absolute h-0.5 w-2.5 rounded-full bg-current" />
                </span>
              </button>
            </h3>
            {/* 0fr -> 1fr animates height without measuring in JS. */}
            <div
              id={`faq-panel-${i}`}
              role="region"
              aria-labelledby={`faq-trigger-${i}`}
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <p className="border-t border-line/70 px-6 py-5 text-sm leading-relaxed text-ink-soft">
                  {item.answer}
                </p>
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
