import Link from 'next/link';
import type { ApkRelease } from '@/lib/apk';

interface ApkButtonProps {
  release: ApkRelease | null;
  /** `brand` is the primary mint CTA; `glass` is the quieter secondary on mint. */
  variant?: 'brand' | 'glass';
  className?: string;
  label?: string;
}

/**
 * Direct-to-APK download. Replaces the old Google Play badge, which pointed at
 * /download and therefore at itself.
 *
 * Deliberately not the Play triangle: SultiAI is not on the Play Store, and a
 * familiar-but-wrong store badge reads as a broken link.
 */
export default function ApkButton({
  release,
  variant = 'brand',
  className = '',
  label,
}: ApkButtonProps) {
  const text =
    label ??
    (release
      ? `Download for Android${release.sizeLabel ? ` · ${release.sizeLabel}` : ''}`
      : 'Download for Android');

  const shell =
    variant === 'brand'
      ? 'btn-primary'
      : 'btn-ghost border-brand/30 bg-brand-light text-brand hover:bg-brand/15';

  if (!release) {
    return (
      <span
        aria-disabled="true"
        className={`inline-flex items-center gap-3 rounded-control px-5 py-3 ${shell} cursor-not-allowed opacity-55 ${className}`}
      >
        <AndroidIcon />
        <span className="text-left">
          <span className="block text-[10px] font-medium tracking-[0.12em] uppercase opacity-70">
            Not published yet
          </span>
          <span className="block text-sm font-semibold">APK coming soon</span>
        </span>
      </span>
    );
  }

  return (
    <Link
      href={release.downloadUrl}
      download={release.filename}
      prefetch={false}
      className={`press inline-flex items-center gap-3 rounded-control px-5 py-3 ${shell} ${className}`}
    >
      <AndroidIcon />
      <span className="text-left">
        <span className="block text-[10px] font-medium tracking-[0.12em] uppercase opacity-70">
          {release.version ? `Version ${release.version}` : 'Android app'}
        </span>
        <span className="block text-sm font-semibold">{text}</span>
      </span>
    </Link>
  );
}

function AndroidIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.19-.48-3.32 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12 3.5c2.5 0 4.71 1.28 6 3.28-1.65.52-3.31.82-5.09.97-.13-2.09.14-3.6-.91-4.25zM5.91 6.8C4.01 8.2 3 10.59 3 13.47c0 1.28.22 2.55.63 3.73 1.47-.14 2.85-.58 4.05-1.29-.94-1.2-1.44-2.7-1.3-4.4-.49-.6-1.04-1.16-1.67-1.66l.2-.05z" />
    </svg>
  );
}
