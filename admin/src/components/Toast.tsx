'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<{ push: (kind: ToastKind, message: string) => void }>({
  push: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const toneStyles: Record<ToastKind, { shell: string; glyph: string }> = {
  success: { shell: 'ring-success/30', glyph: 'text-success' },
  error: { shell: 'ring-danger/30', glyph: 'text-danger' },
  info: { shell: 'ring-brand/30', glyph: 'text-brand' },
};

const glyphs: Record<ToastKind, string> = { success: '✓', error: '✕', info: 'ℹ' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++counter.current;
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3600);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-88 max-w-[calc(100vw-2rem)] flex-col gap-2"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`anim-rise glass-2 glass-sheen glass-shadow pointer-events-auto flex items-start gap-2.5 rounded-control px-3.5 py-3 text-sm ring-1 ${toneStyles[t.kind].shell}`}
          >
            <span
              aria-hidden="true"
              className={`mt-px shrink-0 font-semibold ${toneStyles[t.kind].glyph}`}
            >
              {glyphs[t.kind]}
            </span>
            <p className="text-xs leading-relaxed font-medium text-ink">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
