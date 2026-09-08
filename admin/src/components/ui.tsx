import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-white shadow-sm ${className}`}>
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
    <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
      <div>
        <h3 className="text-base font-bold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const palette = ['bg-brand', 'bg-accent', 'bg-success', 'bg-danger', 'bg-[#7c3aed]'];
  const idx = name.length % palette.length;
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${palette[idx]} ${className}`}
    >
      {initials}
    </span>
  );
}

const roleStyles: Record<string, string> = {
  admin: 'bg-[#7c3aed]/10 text-[#7c3aed]',
  moderator: 'bg-brand-light text-brand-dark',
  user: 'bg-line text-ink-soft',
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${roleStyles[role] ?? roleStyles.user}`}
    >
      {role}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  active: 'bg-success/10 text-success',
  banned: 'bg-danger/10 text-danger',
  suspended: 'bg-accent-light text-brand-dark',
  verified: 'bg-success/10 text-success',
  unverified: 'bg-line text-ink-soft',
  published: 'bg-success/10 text-success',
  draft: 'bg-line text-ink-soft',
  open: 'bg-danger/10 text-danger',
  resolved: 'bg-success/10 text-success',
  dismissed: 'bg-line text-ink-soft',
  pending: 'bg-accent-light text-brand-dark',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
  healthy: 'bg-success/10 text-success',
  degraded: 'bg-accent-light text-brand-dark',
  down: 'bg-danger/10 text-danger',
  connected: 'bg-success/10 text-success',
  up: 'bg-success/10 text-success',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status] ?? 'bg-line text-ink-soft'}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? status}
    </span>
  );
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-ink-faint">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-4xl">🗂</span>
      <p className="mt-4 text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-ink-soft">{description}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-4xl">⚠️</span>
      <p className="mt-4 text-sm font-semibold text-danger">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink hover:border-brand"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export const inputCls =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand';

export const selectCls =
  'rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand';

export const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50';

export const ghostBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand';

export const dangerBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger hover:text-white';
