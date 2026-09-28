'use client';

import { primaryBtn } from '@/components/ui';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-danger-soft text-lg">
        ⚠️
      </span>
      <h3 className="mt-4 text-base font-semibold tracking-tight text-ink">Failed to load</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-soft">
        {error?.message || 'An error occurred while loading this section.'}
      </p>
      <button type="button" onClick={() => reset()} className={`${primaryBtn} mt-6`}>
        Try again
      </button>
    </div>
  );
}
