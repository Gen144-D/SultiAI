import type { ReactNode } from 'react';

export type GlassLevel = 1 | 2 | 3;

const glassLevelCls: Record<GlassLevel, string> = {
  1: 'glass-1',
  2: 'glass-2',
  3: 'glass-3',
};

/**
 * The single surface primitive for the console.
 *
 * Level 2 is the default so the ~20 call sites across the app pick up the new
 * material without edits. Level 1 is for navigation and floating controls,
 * level 3 for hero and AI surfaces. `flush` drops the radius and border for
 * tables that own their own edges.
 */
export function Card({
  children,
  className = '',
  level = 2,
  sheen = true,
  interactive = false,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  level?: GlassLevel;
  sheen?: boolean;
  interactive?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside';
}) {
  return (
    <Tag
      className={`${glassLevelCls[level]} glass-shadow rounded-card ${
        sheen ? 'glass-sheen overflow-hidden' : ''
      } ${interactive ? 'lift hover:border-brand/30' : ''} ${className}`}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Section rule used to separate major blocks on a page. */
export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
        {children}
      </h2>
      {action}
    </div>
  );
}

const avatarTones = [
  'from-brand to-brand-deep',
  'from-info-fill to-info-fill/60',
  'from-success-fill to-success-fill/60',
  'from-violet-fill to-violet-fill/60',
  'from-chart-5 to-chart-5/60',
] as const;

export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const tone = avatarTones[name.length % avatarTones.length];
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-on-brand ring-1 ring-white/10 ${tone} ${className}`}
    >
      {initials}
    </span>
  );
}

const roleStyles: Record<string, string> = {
  admin: 'bg-violet-soft text-violet ring-violet/25',
  moderator: 'bg-info-soft text-info ring-info/25',
  user: 'bg-surface-2 text-ink-soft ring-line-strong/40',
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${
        roleStyles[role] ?? roleStyles.user
      }`}
    >
      {role}
    </span>
  );
}

type Tone = 'positive' | 'caution' | 'critical' | 'info' | 'neutral';

const toneStyles: Record<Tone, string> = {
  positive: 'bg-success-soft text-success ring-success/25',
  caution: 'bg-warning-soft text-warning ring-warning/25',
  critical: 'bg-danger-soft text-danger ring-danger/25',
  info: 'bg-info-soft text-info ring-info/25',
  neutral: 'bg-surface-2 text-ink-soft ring-line-strong/40',
};

const statusTones: Record<string, Tone> = {
  active: 'positive',
  approved: 'positive',
  connected: 'positive',
  healthy: 'positive',
  published: 'positive',
  resolved: 'positive',
  up: 'positive',
  verified: 'positive',

  banned: 'critical',
  down: 'critical',
  open: 'critical',
  rejected: 'critical',

  degraded: 'caution',
  pending: 'caution',
  suspended: 'caution',

  draft: 'neutral',
  dismissed: 'neutral',
  unverified: 'neutral',
  visible: 'neutral',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${
        toneStyles[statusTones[status] ?? 'neutral']
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {label ?? status}
    </span>
  );
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-24 text-ink-faint"
      role="status"
      aria-live="polite"
    >
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-control glass-2 text-lg"
      >
        ✧
      </span>
      <p className="mt-4 text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-ink-faint">{description}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center" role="alert">
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-control bg-danger-soft text-lg text-danger ring-1 ring-danger/25"
      >
        !
      </span>
      <p className="mt-4 text-sm font-semibold text-danger">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${ghostBtn} mt-5`}>
          Try again
        </button>
      )}
    </div>
  );
}

const fieldBase =
  'w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-sm text-ink shadow-inner outline-none transition-colors placeholder:text-ink-faint focus:border-brand/60 focus:bg-surface disabled:opacity-60';

export const inputCls = fieldBase;

export const selectCls = `${fieldBase} w-auto`;

const btnBase =
  // `press` supplies the physical feel: 1.02 on hover, 0.97 on activation.
  'press inline-flex items-center justify-center gap-2 rounded-control px-3.5 py-2 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50';

export const primaryBtn = `${btnBase} bg-brand-solid text-on-brand shadow-lg shadow-brand/15 hover:bg-brand-hover`;

export const ghostBtn = `${btnBase} glass-2 text-ink hover:border-brand/25 hover:bg-brand-soft`;

export const dangerBtn = `${btnBase} bg-danger text-on-brand hover:bg-danger-fill`;

export const dangerSoftBtn = `${btnBase} bg-danger-soft text-danger ring-1 ring-inset ring-danger/25 hover:bg-danger-fill hover:text-on-brand`;

export const successSoftBtn = `${btnBase} bg-success-soft text-success ring-1 ring-inset ring-success/25 hover:bg-success-fill hover:text-on-brand`;

export const warningSoftBtn = `${btnBase} bg-warning-soft text-warning ring-1 ring-inset ring-warning/25 hover:bg-warning-fill hover:text-on-brand`;

export const softBtn = `${btnBase} bg-surface-2 text-ink-soft ring-1 ring-inset ring-line-strong/30 hover:bg-line hover:text-ink`;

export const iconBtn =
  'press inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-faint hover:bg-surface-2 hover:text-ink';

/** Segmented control shared by the tab strips across the app. */
export const tabStrip = 'inline-flex gap-1 rounded-control glass-2 p-1 shadow-card';

export const tabStripBtn = (active: boolean) =>
  `press rounded-[9px] px-3.5 py-1.5 text-sm font-medium ${
    active
      ? 'bg-brand-soft text-brand-ink ring-1 ring-brand/25'
      : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
  }`;

export const tableHeadTh =
  'px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint';
export const tableHeadThRight = `${tableHeadTh} text-right`;
export const tableTd = 'px-5 py-3.5 text-sm';

/** Small count pill used beside tab labels. */
export function CountPill({
  value,
  tone = 'neutral',
}: {
  value: number;
  tone?: 'neutral' | 'caution' | 'critical';
}) {
  const styles = {
    neutral: 'bg-surface-2 text-ink-soft ring-line-strong/40',
    caution: 'bg-warning-soft text-warning ring-warning/25',
    critical: 'bg-danger-soft text-danger ring-danger/25',
  }[tone];

  return (
    <span
      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ring-1 ring-inset ${styles}`}
    >
      {value}
    </span>
  );
}
