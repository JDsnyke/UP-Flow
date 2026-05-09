import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  Paperclip,
  Settings,
  Tag,
  Webhook,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useTokenGate } from "../hooks/useTokenGate";
import { upApiRequest } from "../lib/up-api/invoke";
import { Badge } from "./ui";

const nav = [
  { to: "/", label: "Dashboard", end: true, icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/categories", label: "Categories", icon: Tag },
  { to: "/attachments", label: "Attachments", icon: Paperclip },
  { to: "/webhooks", label: "Webhooks", icon: Webhook },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function ShellLayout() {
  const token = useTokenGate();
  const health = useQuery({
    queryKey: ["up", "health"],
    enabled: token.data === true,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await upApiRequest("GET", "/util/ping");
      return res.status >= 200 && res.status < 300;
    },
  });

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
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-[var(--up-accent)]/20 text-[var(--up-accent)]"
                    : "text-[var(--up-muted)] hover:bg-white/5 hover:text-[var(--up-text)]",
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[var(--up-border)] p-3 text-[10px] leading-relaxed text-[var(--up-muted)]">
          <div className="mb-2">
            {token.data !== true ? (
              <Badge tone="neutral">Offline</Badge>
            ) : health.isLoading ? (
              <Badge tone="neutral">Checking API…</Badge>
            ) : health.data ? (
              <Badge tone="ok">API reachable</Badge>
            ) : (
              <Badge tone="warn">API unavailable</Badge>
            )}
          </div>
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
