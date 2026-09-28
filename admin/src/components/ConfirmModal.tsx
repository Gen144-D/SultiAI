'use client';

import { useState } from 'react';
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

  if (!open) return null;

  async function handle() {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-overlay p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <h3 className="text-base font-semibold tracking-tight text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
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
