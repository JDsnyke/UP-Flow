import clsx from "clsx";
import { NavLink, Outlet } from "react-router-dom";
import { useTokenGate } from "../hooks/useTokenGate";
import { Badge } from "./ui";

const nav = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/transactions", label: "Transactions" },
  { to: "/analytics", label: "Analytics" },
  { to: "/categories", label: "Categories" },
  { to: "/attachments", label: "Attachments" },
  { to: "/webhooks", label: "Webhooks" },
  { to: "/settings", label: "Settings" },
];

export function ShellLayout() {
  const token = useTokenGate();

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--up-border)] bg-[var(--up-surface)]">
        <div className="border-b border-[var(--up-border)] px-4 py-4">
          <div className="text-lg font-bold tracking-tight text-[var(--up-accent)]">
            UP Flow
          </div>
          <div className="mt-1 text-xs text-[var(--up-muted)]">
            Unofficial Up Bank client
          </div>
          <div className="mt-2">
            {token.isLoading ? (
              <Badge tone="neutral">Checking token…</Badge>
            ) : token.data ? (
              <Badge tone="ok">Token saved</Badge>
            ) : (
              <Badge tone="warn">No token</Badge>
            )}
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-[var(--up-accent)]/20 text-[var(--up-accent)]"
                    : "text-[var(--up-muted)] hover:bg-white/5 hover:text-[var(--up-text)]",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[var(--up-border)] p-3 text-[10px] leading-relaxed text-[var(--up-muted)]">
          API:{" "}
          <span className="text-[var(--up-text)]">api.up.com.au/api/v1</span>
          <br />
          Docs: developer.up.com.au
        </div>
      </aside>
      <main className="min-h-0 flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
