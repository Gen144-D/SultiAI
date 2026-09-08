import Link from 'next/link';

export default function PlayStoreBadge() {
  return (
    <Link
      href="/download"
      className="inline-flex items-center gap-3 rounded-2xl bg-ink px-5 py-3 text-white shadow-sm transition-transform hover:scale-[1.02]"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M3.6 1.8L13.1 12 3.6 22.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1zm9.7 11.7l3 3-13.7 5.6 10.7-8.6zm4.6-2.4l-3.3 3.3-3-3 3-3 3.3 3.3c.3.3.3.7 0 .9v-.5zM2.6 1.1l14.7 5.9-3.3 3.3L2.6 1.1z" />
      </svg>
      <span className="text-left leading-tight">
        <span className="block text-[10px] uppercase tracking-wide text-white/70">Get it on</span>
        <span className="block text-sm font-bold">Google Play</span>
      </span>
    </Link>
  );
}
