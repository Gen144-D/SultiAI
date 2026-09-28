import Link from 'next/link';
import { primaryBtn } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-warning-soft text-lg">
        ⚠️
      </span>
      <h2 className="mt-4 text-base font-semibold tracking-tight text-ink">Page not found</h2>
      <p className="mt-1.5 max-w-sm text-sm text-ink-soft">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/admin" className={`${primaryBtn} mt-6`}>
        Back to Dashboard
      </Link>
    </div>
  );
}
