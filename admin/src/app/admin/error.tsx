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
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center"
      role="alert"
    >
      <span
        aria-hidden="true"
        className="anim-enter flex h-12 w-12 items-center justify-center rounded-control bg-danger-soft text-lg font-semibold text-danger ring-1 ring-danger/25 ring-inset"
      >
        !
      </span>
      <h3 className="anim-enter mt-5 text-lg font-semibold tracking-tight text-ink [animation-delay:0.06s]">
        Failed to load
      </h3>
      <p className="anim-enter mt-2 max-w-sm text-sm text-ink-soft [animation-delay:0.12s]">
        {error?.message || 'An error occurred while loading this section.'}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className={`${primaryBtn} anim-enter mt-7 [animation-delay:0.18s]`}
      >
        Try again
      </button>
    </div>
  );
}
