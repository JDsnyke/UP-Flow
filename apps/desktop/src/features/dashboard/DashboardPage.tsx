import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import { useTokenGate } from "../../hooks/useTokenGate";
import { fetchAccounts, fetchAllTransactionsByNext } from "../../lib/up-api/client";
import { formatAud } from "../../lib/format";
import { Button, Card, EmptyState, Spinner } from "../../components/ui";

export function DashboardPage() {
  const gate = useTokenGate();
  const accounts = useQuery({
    queryKey: ["up", "accounts"],
    queryFn: fetchAccounts,
    enabled: gate.data === true,
  });
  const cashflow = useQuery({
    queryKey: ["up", "dashboard", "cashflow"],
    queryFn: () => fetchAllTransactionsByNext({ "page[size]": "100" }, 6),
    enabled: gate.data === true,
  });

  if (gate.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner />
        <span className="text-sm text-[var(--up-muted)]">Loading…</span>
      </div>
    );
  }

  if (!gate.data) {
    return (
      <EmptyState
        title="Connect your Up account"
        detail="Add a Personal Access Token in Settings. Requests go through the Tauri backend with TLS verification (no browser CORS issues)."
        action={
          <Link to="/settings">
            <Button>Open settings</Button>
          </Link>
        }
      />
    );
  }

  if (accounts.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner />
        <span className="text-sm text-[var(--up-muted)]">Fetching accounts…</span>
      </div>
    );
  }

  if (accounts.isError) {
    return (
      <EmptyState
        title="Could not load accounts"
        detail={
          accounts.error instanceof Error
            ? accounts.error.message
            : "Unknown error"
        }
        action={
          <Button onClick={() => void accounts.refetch()}>Retry</Button>
        }
      />
    );
  }

  const list = accounts.data ?? [];
  const transactional = list.filter((a) => a.attributes.accountType === "TRANSACTIONAL");
  const savers = list.filter((a) => a.attributes.accountType === "SAVER");
  const homeLoans = list.filter((a) => a.attributes.accountType === "HOME_LOAN");

  const sumBalances = (rows: typeof list) =>
    rows.reduce((acc, a) => acc + Number.parseFloat(a.attributes.balance.value), 0);

  const balanceData = list.map((a) => ({
    name: a.attributes.displayName,
    balance: Number.parseFloat(a.attributes.balance.value),
  }));

  const dayMap = new Map<string, number>();
  for (const tx of cashflow.data ?? []) {
    const day = tx.attributes.createdAt.slice(0, 10);
    const amount = Number.parseFloat(tx.attributes.amount.value);
    dayMap.set(day, (dayMap.get(day) ?? 0) + amount);
  }
  const cashflowData = Array.from(dayMap.entries())
    .map(([date, total]) => ({ date, total: Number(total.toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--up-muted)]">
          Balances and quick links — data from Up API v1.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs uppercase tracking-wide text-[var(--up-muted)]">
            Transactional total
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--up-accent)]">
            {formatAud(sumBalances(transactional).toFixed(2))}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-[var(--up-muted)]">
            Savers total
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--up-accent)]">
            {formatAud(sumBalances(savers).toFixed(2))}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-[var(--up-muted)]">
            Home loan accounts
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--up-text)]">
            {homeLoans.length}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Accounts</h2>
        <ul className="mt-4 divide-y divide-[var(--up-border)]">
          {list.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div>
                <div className="font-medium">{a.attributes.displayName}</div>
                <div className="text-xs text-[var(--up-muted)]">
                  {a.attributes.accountType} · {a.attributes.ownershipType}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-[var(--up-accent)]">
                  {formatAud(a.attributes.balance.value)}
                </span>
                <Link to={`/accounts/${a.id}`}>
                  <Button variant="ghost">View</Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-h-[320px]">
          <h2 className="mb-2 font-semibold">Account balances</h2>
          {accounts.isLoading ? (
            <div className="h-[260px] animate-pulse rounded bg-white/5" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={balanceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2a3a" />
                <XAxis type="number" />
                <YAxis type="category" width={140} dataKey="name" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatAud(String(value))} />
                <Bar dataKey="balance" fill="#f97c68" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card className="min-h-[320px]">
          <h2 className="mb-2 font-semibold">30-day net cashflow</h2>
          {cashflow.isLoading ? (
            <div className="h-[260px] animate-pulse rounded bg-white/5" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={cashflowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2a3a" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number"
                      ? formatAud(value.toFixed(2))
                      : String(value ?? "")
                  }
                />
                <Line type="monotone" dataKey="total" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
