'use client';

import { useEffect, useRef, useState } from 'react';

export default function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Without this, navigating away mid-timeout sets state on an unmounted
  // component and the reset never lands.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked in some contexts — the value stays selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="press shrink-0 rounded-control border border-line bg-white/5 px-3 py-1.5 font-mono text-xs font-semibold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}
