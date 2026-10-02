'use client';

import { useEffect, useRef, useState } from 'react';
import { dangerBtn, ghostBtn, primaryBtn } from './ui';

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = true,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  // Callers pass inline arrow functions, so keep the latest handler in a ref to
  // stop the effect below from re-running (and yanking focus) on every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Escape dismisses, and focus returns to whatever opened the dialog so
  // keyboard users are never stranded at the top of the document.
  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      restoreFocusTo.current?.focus?.();
    };
  }, [open, busy]);

  if (!open) return null;

  async function handle() {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-overlay p-4 backdrop-blur-sm"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="anim-pop glass-3 glass-sheen glass-shadow w-full max-w-md rounded-hero p-6 outline-none"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-base font-semibold ring-1 ring-inset ${
              danger
                ? 'bg-danger-soft text-danger ring-danger/25'
                : 'bg-brand-soft text-brand-ink ring-brand/25'
            }`}
          >
            {danger ? '!' : '?'}
          </span>
          <div className="min-w-0">
            <h3 id="confirm-title" className="text-base font-semibold tracking-tight text-ink">
              {title}
            </h3>
            <p id="confirm-message" className="mt-2 text-sm leading-relaxed text-ink-soft">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-7 flex justify-end gap-2">
          <button type="button" className={ghostBtn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={danger ? dangerBtn : primaryBtn}
            onClick={handle}
            disabled={busy}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
