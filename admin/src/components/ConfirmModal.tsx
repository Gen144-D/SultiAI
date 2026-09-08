'use client';

import { useState } from 'react';
import { dangerBtn, ghostBtn } from './ui';

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

  if (!open) return null;

  async function handle() {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{message}</p>
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" className={ghostBtn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={
              danger
                ? dangerBtn
                : 'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90'
            }
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
