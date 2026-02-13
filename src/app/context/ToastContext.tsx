"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type ToastItem = { id: string; title: string; body?: string | null; type?: string };

type ToastContextValue = {
  addToast: (item: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_TTL_MS = 6000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((item: Omit<ToastItem, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const entry: ToastItem = { ...item, id };
    setToasts((prev) => [...prev, entry]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_TTL_MS);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[360px] w-[calc(100vw-2rem)] pointer-events-none"
        aria-live="polite"
        role="region"
        aria-label="Notificações toast"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto relative rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] shadow-2xl pl-4 pr-10 py-3 animate-in slide-in-from-right-5 duration-300"
          >
            <p className="text-sm font-semibold text-[var(--hub-text)]">{t.title}</p>
            {t.body && <p className="mt-0.5 text-xs text-[var(--hub-text-muted)]">{t.body}</p>}
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-text)]"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) return { addToast: () => {} };
  return ctx;
}
