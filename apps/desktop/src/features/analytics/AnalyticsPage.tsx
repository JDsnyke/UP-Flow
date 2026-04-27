import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTokenGate } from "../../hooks/useTokenGate";
import { fetchAllTransactionsByNext } from "../../lib/up-api/client";
import type { TransactionResource } from "../../lib/up-api/types";
import { formatAud } from "../../lib/format";
import { Button, Card, EmptyState, Spinner } from "../../components/ui";

const PIE_COLORS = [
  "#f97c68",
  "#7c6cf9",
  "#4ade80",
  "#fbbf24",
  "#38bdf8",
  "#f472b6",
  "#a78bfa",
  "#2dd4bf",
];

function aggregate(transactions: TransactionResource[]) {
  const byCategory: Record<string, number> = {};
  const byDay: Record<string, number> = {};

  for (const t of transactions) {
    const amt = Number.parseFloat(t.attributes.amount.value);
    if (amt >= 0) {
      continue;
    }
    const spend = Math.abs(amt);
    const cat = t.relationships.category.data?.id ?? "uncategorized";
    byCategory[cat] = (byCategory[cat] ?? 0) + spend;

    const day = t.attributes.createdAt.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + spend;
  }

  const pieData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const lineData = Object.entries(byDay)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { pieData, lineData, totalSpend: Object.values(byCategory).reduce((a, b) => a + b, 0) };
}

export function AnalyticsPage() {
  const gate = useTokenGate();
  const q = useQuery({
    queryKey: ["up", "analytics"],
    queryFn: () =>
      fetchAllTransactionsByNext({ "page[size]": "100" }, 18),
    enabled: gate.data === true,
  });

  const { pieData, lineData, totalSpend } = useMemo(
    () => aggregate(q.data ?? []),
    [q.data],
  );

  if (!gate.data) {
    return (
      <EmptyState
        title="Token required"
        action={
          <Link to="/settings">
            <Button>Settings</Button>
          </Link>
        }
      />
    );
  }

  if (q.isLoading) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2">
        <Spinner />
        <p className="text-sm text-[var(--up-muted)]">
          Loading up to ~1.8k transactions for charts…
        </p>
      </div>
    );
  }

  if (q.isError) {
    return (
      <EmptyState
        title="Could not load data"
        detail={q.error instanceof Error ? q.error.message : "Error"}
        action={<Button onClick={() => void q.refetch()}>Retry</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-[var(--up-muted)]">
          Spend (negative amounts) aggregated from loaded pages. Heavier fetch —
          uses pagination internally.
        </p>
      </div>

      <Card>
        <div className="text-sm text-[var(--up-muted)]">Total outflow (sample)</div>
        <div className="mt-1 text-2xl font-semibold text-[var(--up-accent)]">
          {formatAud(totalSpend.toFixed(2))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-h-[320px]">
          <h2 className="mb-2 font-semibold">By category (top 10)</h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-[var(--up-muted)]">No categorized spend.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[i % PIE_COLORS.length]!}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number"
                      ? formatAud(value.toFixed(2))
                      : String(value ?? "")
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="min-h-[320px]">
          <h2 className="mb-2 font-semibold">Outflow by day</h2>
          {lineData.length === 0 ? (
            <p className="text-sm text-[var(--up-muted)]">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={lineData}>
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
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="var(--up-accent)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
