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

const icons: Record<ToastKind, string> = { success: '✓', error: '✕', info: 'ℹ' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++counter.current;
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-72 flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white px-4 py-3 shadow-lg ${
              t.kind === 'success'
                ? 'border-success/30'
                : t.kind === 'error'
                  ? 'border-danger/30'
                  : 'border-brand/30'
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                t.kind === 'success' ? 'bg-success' : t.kind === 'error' ? 'bg-danger' : 'bg-brand'
              }`}
            >
              {icons[t.kind]}
            </span>
            <p className="text-xs font-medium leading-relaxed text-ink">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
