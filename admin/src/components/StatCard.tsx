import type { ReactNode } from 'react';
import { Card } from './ui';

const toneMap = {
  brand: { text: 'text-brand-dark', icon: 'bg-brand-light' },
  green: { text: 'text-success', icon: 'bg-success/10' },
  amber: { text: 'text-[#b45309]', icon: 'bg-accent-light' },
  red: { text: 'text-danger', icon: 'bg-danger/10' },
  violet: { text: 'text-[#7c3aed]', icon: 'bg-[#7c3aed]/10' },
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
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
        {icon && (
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-base ${t.icon}`}
          >
            {icon}
          </span>
        )}
      </div>
      <p className={`mt-3 text-2xl font-extrabold tabular-nums ${t.text}`}>{value}</p>
      {delta && <p className="mt-1.5 text-xs font-medium text-ink-soft">{delta}</p>}
    </Card>
  );
}
