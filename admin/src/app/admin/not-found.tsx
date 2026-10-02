import Link from 'next/link';
import { primaryBtn } from '@/components/ui';

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span
        aria-hidden="true"
        className="anim-enter flex h-12 w-12 items-center justify-center rounded-control bg-warning-soft text-lg text-warning ring-1 ring-warning/25 ring-inset"
      >
        ✧
      </span>
      <h3 className="anim-enter mt-5 text-lg font-semibold tracking-tight text-ink [animation-delay:0.06s]">
        Page not found
      </h3>
      <p className="anim-enter mt-2 max-w-sm text-sm text-ink-soft [animation-delay:0.12s]">
        This admin page does not exist or has been moved.
      </p>
      <Link href="/admin" className={`${primaryBtn} anim-enter mt-7 [animation-delay:0.18s]`}>
        Back to Dashboard
      </Link>
    </div>
  );
}
