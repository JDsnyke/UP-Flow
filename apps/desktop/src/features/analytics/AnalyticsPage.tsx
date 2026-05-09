import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
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
import { fetchAllCategoriesFlat, fetchAllTransactionsByNext } from "../../lib/up-api/client";
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
  const byMonth: Record<string, { income: number; outflow: number }> = {};
  const byCategoryTx: Record<string, TransactionResource[]> = {};

  const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
  const monthFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
  });

  for (const t of transactions) {
    const amt = Number.parseFloat(t.attributes.amount.value);
    const cat = t.relationships.category.data?.id ?? "uncategorized";
    byCategoryTx[cat] = [...(byCategoryTx[cat] ?? []), t];
    const day = dayFmt.format(new Date(t.attributes.createdAt));
    const month = monthFmt.format(new Date(t.attributes.createdAt)).slice(0, 7);
    byMonth[month] = byMonth[month] ?? { income: 0, outflow: 0 };

    if (amt < 0) {
      const spend = Math.abs(amt);
      byCategory[cat] = (byCategory[cat] ?? 0) + spend;
      byDay[day] = (byDay[day] ?? 0) + spend;
      byMonth[month].outflow += spend;
    } else {
      byMonth[month].income += amt;
      byDay[day] = (byDay[day] ?? 0) - amt;
    }
  }

  const pieData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const lineData = Object.entries(byDay)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const monthData = Object.entries(byMonth)
    .map(([month, value]) => ({
      month,
      income: Number(value.income.toFixed(2)),
      outflow: Number(value.outflow.toFixed(2)),
      net: Number((value.income - value.outflow).toFixed(2)),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    pieData,
    lineData,
    monthData,
    byCategoryTx,
    totalSpend: Object.values(byCategory).reduce((a, b) => a + b, 0),
  };
}

export function AnalyticsPage() {
  const gate = useTokenGate();
  const [metric, setMetric] = useState<"spend" | "income" | "net">("spend");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["up", "analytics"],
    queryFn: () =>
      fetchAllTransactionsByNext({ "page[size]": "100" }, 18),
    enabled: gate.data === true,
  });
  const categories = useQuery({
    queryKey: ["up", "categories", "flat"],
    queryFn: fetchAllCategoriesFlat,
    enabled: gate.data === true,
  });

  const { pieData, lineData, monthData, byCategoryTx, totalSpend } = useMemo(
    () => aggregate(q.data ?? []),
    [q.data],
  );
  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories.data ?? []) {
      map.set(c.id, c.attributes.name);
    }
    return map;
  }, [categories.data]);
  const selectedTransactions = selectedCategory ? byCategoryTx[selectedCategory] ?? [] : [];

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
                      onClick={() => setSelectedCategory(entry.name)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  labelFormatter={(value) =>
                    categoryNameById.get(String(value)) ?? String(value)
                  }
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

      <Card className="min-h-[320px]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Monthly trends</h2>
          <div className="flex gap-2">
            <Button variant={metric === "spend" ? "primary" : "ghost"} onClick={() => setMetric("spend")}>
              Spend
            </Button>
            <Button variant={metric === "income" ? "primary" : "ghost"} onClick={() => setMetric("income")}>
              Income
            </Button>
            <Button variant={metric === "net" ? "primary" : "ghost"} onClick={() => setMetric("net")}>
              Net
            </Button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2a3a" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(value) =>
                typeof value === "number" ? formatAud(value.toFixed(2)) : String(value ?? "")
              }
            />
            {metric === "spend" ? <Bar dataKey="outflow" fill="#f97c68" /> : null}
            {metric === "income" ? <Bar dataKey="income" fill="#4ade80" /> : null}
            {metric === "net" ? <Bar dataKey="net" fill="#38bdf8" /> : null}
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {selectedCategory ? (
        <Card>
          <h2 className="text-lg font-semibold">
            Category drilldown: {categoryNameById.get(selectedCategory) ?? selectedCategory}
          </h2>
          <ul className="mt-3 divide-y divide-[var(--up-border)]">
            {selectedTransactions.slice(0, 12).map((t) => (
              <li key={t.id} className="py-2 text-sm">
                <div className="font-medium">{t.attributes.description}</div>
                <div className="text-xs text-[var(--up-muted)]">
                  {t.attributes.createdAt.slice(0, 10)} · {formatAud(t.attributes.amount.value)}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
