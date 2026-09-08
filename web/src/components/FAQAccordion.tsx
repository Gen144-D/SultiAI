'use client';

import { useState } from 'react';

export default function FAQAccordion({ items }: { items: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div
            key={item.question}
            className={`overflow-hidden rounded-2xl border transition-colors ${
              open ? 'border-brand/30 bg-white' : 'border-line bg-white'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="text-sm font-semibold text-ink sm:text-base">{item.question}</span>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-brand transition-transform ${
                  open ? 'rotate-45 bg-brand-light' : 'bg-surface'
                }`}
              >
                +
              </span>
            </button>
            {open && (
              <p className="border-t border-line px-6 pb-6 pt-4 text-sm leading-relaxed text-ink-soft">
                {item.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
