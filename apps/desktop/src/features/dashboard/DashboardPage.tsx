import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTokenGate } from "../../hooks/useTokenGate";
import { fetchAccounts } from "../../lib/up-api/client";
import { formatAud } from "../../lib/format";
import { Button, Card, EmptyState, Spinner } from "../../components/ui";

export function DashboardPage() {
  const gate = useTokenGate();
  const accounts = useQuery({
    queryKey: ["up", "accounts"],
    queryFn: fetchAccounts,
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
    </div>
  );
}
