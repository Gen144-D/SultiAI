import Image from 'next/image';
import Link from 'next/link';

const SIZES = {
  sm: { img: 'h-8 w-8', word: 'text-base' },
  md: { img: 'h-9 w-9', word: 'text-[17px]' },
} as const;

/**
 * The single SultiAI brand lockup, shared by the header, mobile drawer and
 * footer so the identity never drifts between surfaces.
 *
 * The mark is the Glossy Blue voice-chat speech bubble — the same rounded
 * square as the favicon and app icon, so the browser tab, touch icon, and
 * this lockup all read as one brand.
 */
export function LogoMark({ size = 'md' }: { size?: keyof typeof SIZES }) {
  const s = SIZES[size];
  return (
    <Image
      src="/app-icon.png"
      alt=""
      width={36}
      height={36}
      aria-hidden="true"
      className={`shrink-0 rounded-[0.7rem] shadow-[0_6px_16px_-8px_var(--brand-glow)] ${s.img}`}
    />
  );
}

export default function Logo({
  size = 'md',
  className = '',
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={`logo-lockup press inline-flex items-center gap-2.5 ${className}`}
      aria-label="SultiAI home"
    >
      <LogoMark size={size} />
      <span className={`font-semibold tracking-tight text-ink ${SIZES[size].word}`}>
        Sulti<span className="text-brand">AI</span>
      </span>
    </Link>
  );
}
