import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-[var(--up-border)] bg-[var(--up-surface)] p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  className,
  variant = "primary",
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50",
        variant === "primary" &&
          "bg-[var(--up-accent)] text-[#1a0f0c] hover:brightness-110",
        variant === "ghost" &&
          "border border-[var(--up-border)] bg-transparent hover:bg-white/5",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-500",
        className,
      )}
      disabled={disabled}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn";
}) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-white/10 text-[var(--up-muted)]",
        tone === "ok" && "bg-emerald-500/20 text-emerald-300",
        tone === "warn" && "bg-amber-500/20 text-amber-200",
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-[var(--up-accent)]",
        className,
      )}
      aria-hidden
    />
  );
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="text-center">
      <p className="text-lg font-semibold text-[var(--up-text)]">{title}</p>
      {detail ? (
        <p className="mt-2 text-sm text-[var(--up-muted)]">{detail}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Card>
  );
}
