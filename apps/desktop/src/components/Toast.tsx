import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./ui";

type ToastTone = "info" | "success" | "error";

type ToastMessage = {
  id: number;
  title: string;
  detail?: string;
  tone: ToastTone;
};

type ToastInput = Omit<ToastMessage, "id">;

type ToastContextValue = {
  pushToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4_000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const pushToast = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setMessages((prev) => [...prev, { ...input, id }].slice(-MAX_TOASTS));
    window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  }, [dismiss]);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            role="status"
            className="pointer-events-auto rounded-xl border border-[var(--up-border)] bg-[var(--up-surface)] p-3 shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  className={
                    msg.tone === "success"
                      ? "text-sm font-semibold text-emerald-300"
                      : msg.tone === "error"
                        ? "text-sm font-semibold text-red-300"
                        : "text-sm font-semibold text-[var(--up-text)]"
                  }
                >
                  {msg.title}
                </div>
                {msg.detail ? (
                  <p className="mt-1 text-xs text-[var(--up-muted)]">{msg.detail}</p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                className="!px-2 !py-1 text-xs"
                onClick={() => dismiss(msg.id)}
              >
                Close
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
