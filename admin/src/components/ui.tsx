import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-surface shadow-card ${className}`}>
      {children}
    </div>
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
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const avatarTones = [
  'bg-brand-solid',
  'bg-info-fill',
  'bg-success-fill',
  'bg-violet-fill',
  'bg-danger-fill',
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
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-on-brand ${tone} ${className}`}
    >
      {initials}
    </span>
  );
}

const roleStyles: Record<string, string> = {
  admin: 'bg-violet-soft text-violet',
  moderator: 'bg-info-soft text-info',
  user: 'bg-surface-2 text-ink-soft',
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${roleStyles[role] ?? roleStyles.user}`}
    >
      {role}
    </span>
  );
}

type Tone = 'positive' | 'caution' | 'critical' | 'info' | 'neutral';

const toneStyles: Record<Tone, string> = {
  positive: 'bg-success-soft text-success',
  caution: 'bg-warning-soft text-warning',
  critical: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-surface-2 text-ink-soft',
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
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${
        toneStyles[statusTones[status] ?? 'neutral']
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label ?? status}
    </span>
  );
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-ink-faint">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-lg">
        🗂
      </span>
      <p className="mt-4 text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-ink-faint">{description}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger-soft text-lg">
        ⚠️
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
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand';

export const inputCls = fieldBase;

export const selectCls =
  'rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand';

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50';

export const primaryBtn = `${btnBase} bg-brand-solid text-on-brand hover:bg-brand-hover`;

export const ghostBtn = `${btnBase} border border-line bg-surface text-ink hover:bg-surface-2`;

export const dangerBtn = `${btnBase} bg-danger text-on-brand hover:bg-danger-fill`;

export const dangerSoftBtn = `${btnBase} bg-danger-soft text-danger hover:bg-danger-fill hover:text-on-brand`;

export const successSoftBtn = `${btnBase} bg-success-soft text-success hover:bg-success-fill hover:text-on-brand`;

export const warningSoftBtn = `${btnBase} bg-warning-soft text-warning hover:bg-warning-fill hover:text-on-brand`;

export const softBtn = `${btnBase} bg-surface-2 text-ink-soft hover:bg-line hover:text-ink`;

export const iconBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink';

export const tableHeadTh =
  'px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint';
export const tableHeadThRight = `${tableHeadTh} text-right`;
export const tableTd = 'px-5 py-3.5 text-sm';
