import Link from 'next/link';
import { primaryBtn } from '@/components/ui';

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-warning-soft text-lg">
        ⚠️
      </span>
      <h3 className="mt-4 text-base font-semibold tracking-tight text-ink">Page not found</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-soft">
        This admin page does not exist or has been moved.
      </p>
      <Link href="/admin" className={`${primaryBtn} mt-6`}>
        Back to Dashboard
      </Link>
    </div>
  );
}
