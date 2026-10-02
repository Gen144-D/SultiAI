import type { ReactNode } from 'react';
import { Card } from './ui';

const toneMap = {
  brand: { icon: 'bg-brand-soft text-brand ring-brand/20' },
  green: { icon: 'bg-success-soft text-success ring-success/20' },
  amber: { icon: 'bg-warning-soft text-warning ring-warning/20' },
  red: { icon: 'bg-danger-soft text-danger ring-danger/20' },
  violet: { icon: 'bg-violet-soft text-violet ring-violet/20' },
} as const;

/**
 * A single figure. `delta` is supporting context, so it is styled quieter than
 * the value and never relies on colour alone to convey meaning.
 */
export function StatCard({
  label,
  value,
  delta,
  tone = 'brand',
  icon,
  emphasis = false,
}: {
  label: string;
  value: string | number;
  delta?: string;
  tone?: keyof typeof toneMap;
  icon?: ReactNode;
  /** Renders the hero glass level for the one metric that leads a group. */
  emphasis?: boolean;
}) {
  const t = toneMap[tone];

  return (
    <Card level={emphasis ? 3 : 2} className="lift p-5 hover:border-brand/25">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-ink-faint">{label}</p>
        {icon && (
          <span
            aria-hidden="true"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-sm ring-1 ring-inset ${t.icon}`}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2.5 text-3xl font-semibold tracking-tight tabular-nums text-ink">{value}</p>
      {delta && <p className="mt-1 text-xs text-ink-soft">{delta}</p>}
    </Card>
  );
}
