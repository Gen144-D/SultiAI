import Link from 'next/link';
import { CosmicBackground } from '@/components/background/CosmicBackground';
import { primaryBtn } from '@/components/ui';

export default function NotFound() {
  return (
    <>
      <CosmicBackground variant="focused" />
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <span
          aria-hidden="true"
          className="anim-enter flex h-12 w-12 items-center justify-center rounded-control bg-warning-soft text-lg text-warning ring-1 ring-warning/25 ring-inset"
        >
          ✧
        </span>
        <h2 className="anim-enter mt-5 text-lg font-semibold tracking-tight text-ink [animation-delay:0.06s]">
          Page not found
        </h2>
        <p className="anim-enter mt-2 max-w-sm text-sm text-ink-soft [animation-delay:0.12s]">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/admin" className={`${primaryBtn} anim-enter mt-7 [animation-delay:0.18s]`}>
          Back to Dashboard
        </Link>
      </div>
    </>
  );
}
