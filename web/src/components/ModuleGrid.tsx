import Icon from './Icon';
import { MODULES } from '@/lib/product';
import { GlassCard } from './ui';
import Reveal from './Reveal';

/** The eight learning modules the app actually ships, from ModuleScreens.js. */
export default function ModuleGrid({ columns = 4 }: { columns?: 3 | 4 }) {
  return (
    <div
      className={`grid gap-4 sm:grid-cols-2 ${columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
    >
      {MODULES.map((m, i) => (
        <Reveal key={m.key} delay={Math.min(i, 5) * 0.06}>
          <GlassCard interactive className="flex h-full flex-col p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-[0.8rem] bg-brand-light text-brand transition-colors duration-300 group-hover:bg-brand">
              <Icon name={m.icon} className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-ink">{m.title}</h3>
            <p className="mt-0.5 text-xs font-medium text-brand">{m.subtitle}</p>
            <p className="mt-2.5 flex-1 text-sm leading-relaxed text-ink-soft">{m.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand">
              {m.cta}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </GlassCard>
        </Reveal>
      ))}
    </div>
  );
}
