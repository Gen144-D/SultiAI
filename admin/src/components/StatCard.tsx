import type { ReactNode } from 'react';
import { Card } from './ui';

const toneMap = {
  brand: { value: 'text-ink', icon: 'bg-brand-soft text-brand' },
  green: { value: 'text-ink', icon: 'bg-success-soft text-success' },
  amber: { value: 'text-ink', icon: 'bg-warning-soft text-warning' },
  red: { value: 'text-ink', icon: 'bg-danger-soft text-danger' },
  violet: { value: 'text-ink', icon: 'bg-violet-soft text-violet' },
} as const;

export function StatCard({
  label,
  value,
  delta,
  tone = 'brand',
  icon,
}: {
  label: string;
  value: string | number;
  delta?: string;
  tone?: keyof typeof toneMap;
  icon?: ReactNode;
}) {
  const t = toneMap[tone];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-ink-faint">{label}</p>
        {icon && (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${t.icon}`}
          >
            {icon}
          </span>
        )}
      </div>
      <p className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${t.value}`}>
        {value}
      </p>
      {delta && <p className="mt-1 text-xs text-ink-faint">{delta}</p>}
    </Card>
  );
}
