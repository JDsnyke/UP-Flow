import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "../../components/Toast";
import { useTokenGate } from "../../hooks/useTokenGate";
import {
  addTransactionTags,
  fetchAccountTransactionsPage,
  fetchAccounts,
  fetchAllCategoriesFlat,
  fetchTransactionsPage,
  fetchTagsPage,
  leafCategories,
  removeTransactionTags,
  setTransactionCategory,
} from "../../lib/up-api/client";
import { splitUpPaginationUrl } from "../../lib/up-api/parse";
import type { Paginated, TransactionResource } from "../../lib/up-api/types";
import { formatAud, formatDateTime } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Spinner } from "../../components/ui";

export function TransactionsPage() {
  const { pushToast } = useToast();
  const gate = useTokenGate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<"" | "HELD" | "SETTLED">(
    (searchParams.get("status") as "" | "HELD" | "SETTLED") || "",
  );
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [sinceDate, setSinceDate] = useState(searchParams.get("since") ?? "");
  const [untilDate, setUntilDate] = useState(searchParams.get("until") ?? "");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") ?? "");
  const [tagFilter, setTagFilter] = useState(searchParams.get("tag") ?? "");
  const [accountFilter, setAccountFilter] = useState(searchParams.get("account") ?? "");
  const [extraPages, setExtraPages] = useState<Paginated<TransactionResource>[]>(
    [],
  );
  const [loadingMore, setLoadingMore] = useState(false);

  const toUpDateTime = (dateStr: string, endOfDay: boolean): string | null => {
    if (!dateStr) return null;
    const suffix = endOfDay ? "23:59:59.999" : "00:00:00.000";
    // Date without timezone is interpreted as local time; then converted to UTC.
    return new Date(`${dateStr}T${suffix}`).toISOString();
  };

  const baseQuery = useMemo(() => {
    const q: Record<string, string> = { "page[size]": "30" };
    if (status) {
      q["filter[status]"] = status;
    }
    const since = toUpDateTime(sinceDate, false);
    const until = toUpDateTime(untilDate, true);
    if (since) q["filter[since]"] = since;
    if (until) q["filter[until]"] = until;
    if (categoryFilter) q["filter[category]"] = categoryFilter;
    if (tagFilter) q["filter[tag]"] = tagFilter;
    return q;
  }, [status, sinceDate, untilDate, categoryFilter, tagFilter]);

  useEffect(() => {
    setExtraPages([]);
  }, [baseQuery, accountFilter]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (search) next.set("search", search);
    if (sinceDate) next.set("since", sinceDate);
    if (untilDate) next.set("until", untilDate);
    if (categoryFilter) next.set("category", categoryFilter);
    if (tagFilter) next.set("tag", tagFilter);
    if (accountFilter) next.set("account", accountFilter);
    setSearchParams(next, { replace: true });
  }, [status, search, sinceDate, untilDate, categoryFilter, tagFilter, accountFilter, setSearchParams]);

  const firstPage = useQuery({
    queryKey: ["up", "transactions", accountFilter || "all", baseQuery],
    queryFn: () =>
      accountFilter
        ? fetchAccountTransactionsPage(accountFilter, baseQuery)
        : fetchTransactionsPage(baseQuery),
    enabled: gate.data === true,
  });

  const categories = useQuery({
    queryKey: ["up", "categories", "flat"],
    queryFn: async () => leafCategories(await fetchAllCategoriesFlat()),
    enabled: gate.data === true,
  });

  const tags = useQuery({
    queryKey: ["up", "tags", "p0"],
    queryFn: () => fetchTagsPage({ "page[size]": "120" }),
    enabled: gate.data === true,
  });

  const accounts = useQuery({
    queryKey: ["up", "accounts"],
    queryFn: fetchAccounts,
    enabled: gate.data === true,
  });

  const filtered = useMemo(() => {
    const first = firstPage.data?.data ?? [];
    const rest = extraPages.flatMap((p) => p.data);
    const all = [...first, ...rest];
    const s = search.trim().toLowerCase();
    if (!s) {
      return all;
    }
    return all.filter((t) =>
      t.attributes.description.toLowerCase().includes(s),
    );
  }, [firstPage.data, extraPages, search]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories.data ?? []) {
      map.set(c.id, c.attributes.name);
    }
    return map;
  }, [categories.data]);

  const lastPage =
    extraPages.length > 0
      ? extraPages[extraPages.length - 1]!
      : firstPage.data ?? null;
  const nextUrl = lastPage?.links?.next;

  const loadMore = async () => {
    if (!nextUrl || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const { path, query } = splitUpPaginationUrl(nextUrl);
      const expected = accountFilter
        ? `/accounts/${accountFilter}/transactions`
        : "/transactions";
      if (path !== expected) {
        throw new Error("Unexpected pagination URL");
      }
      const q = Object.fromEntries(new URLSearchParams(query ?? ""));
      const next = accountFilter
        ? await fetchAccountTransactionsPage(accountFilter, q)
        : await fetchTransactionsPage(q);
      setExtraPages((prev) => [...prev, next]);
    } finally {
      setLoadingMore(false);
    }
  };

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

  if (firstPage.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner />
        <span className="text-sm text-[var(--up-muted)]">Loading…</span>
      </div>
    );
  }

  if (firstPage.isError) {
    return (
      <EmptyState
        title="Could not load transactions"
        detail={
          firstPage.error instanceof Error
            ? firstPage.error.message
            : "Error"
        }
        action={
          <Button onClick={() => void firstPage.refetch()}>Retry</Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="mt-1 text-sm text-[var(--up-muted)]">
          Paginated list from{" "}
          <code className="rounded bg-black/30 px-1">GET /transactions</code>.
          Server-side filters supported: status, date range, category, tag (cursor pagination via{" "}
          <code className="rounded bg-black/30 px-1">links.next</code>).
        </p>
      </div>

      <Card className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs text-[var(--up-muted)]" htmlFor="st">
            Status
          </label>
          <select
            id="st"
            className="mt-1 block w-40 rounded-lg border border-[var(--up-border)] bg-[#12111a] px-2 py-2 text-sm"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "" | "HELD" | "SETTLED")
            }
          >
            <option value="">All</option>
            <option value="SETTLED">Settled</option>
            <option value="HELD">Held</option>
          </select>
        </div>

        <div>
          <label
            className="text-xs text-[var(--up-muted)]"
            htmlFor="accf"
          >
            Account
          </label>
          <select
            id="accf"
            className="mt-1 block w-64 rounded-lg border border-[var(--up-border)] bg-[#12111a] px-2 py-2 text-sm"
            value={accountFilter}
            disabled={accounts.isLoading}
            onChange={(e) => setAccountFilter(e.target.value)}
          >
            <option value="">All accounts</option>
            {(accounts.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.attributes.displayName} ({a.attributes.accountType})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-[var(--up-muted)]" htmlFor="since">
            Since
          </label>
          <input
            id="since"
            type="date"
            className="mt-1 block w-40 rounded-lg border border-[var(--up-border)] bg-[#12111a] px-2 py-2 text-sm"
            value={sinceDate}
            onChange={(e) => setSinceDate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-[var(--up-muted)]" htmlFor="until">
            Until
          </label>
          <input
            id="until"
            type="date"
            className="mt-1 block w-40 rounded-lg border border-[var(--up-border)] bg-[#12111a] px-2 py-2 text-sm"
            value={untilDate}
            onChange={(e) => setUntilDate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-[var(--up-muted)]" htmlFor="catf">
            Category
          </label>
          <select
            id="catf"
            className="mt-1 block w-56 rounded-lg border border-[var(--up-border)] bg-[#12111a] px-2 py-2 text-sm"
            value={categoryFilter}
            disabled={categories.isLoading}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.attributes.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[220px] flex-1">
          <label className="text-xs text-[var(--up-muted)]" htmlFor="tagf">
            Tag (label/id)
          </label>
          <input
            id="tagf"
            className="mt-1 w-full rounded-lg border border-[var(--up-border)] bg-[#12111a] px-3 py-2 text-sm"
            placeholder="e.g. Holiday"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            list="tagf-suggestions"
          />
          <datalist id="tagf-suggestions">
            {(tags.data?.data ?? []).map((t) => (
              <option key={t.id} value={t.id} />
            ))}
          </datalist>
        </div>

        <div className="min-w-[200px] flex-1">
          <label className="text-xs text-[var(--up-muted)]" htmlFor="find">
            Search (client-side within loaded pages)
          </label>
          <input
            id="find"
            className="mt-1 w-full rounded-lg border border-[var(--up-border)] bg-[#12111a] px-3 py-2 text-sm"
            placeholder="Merchant / description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase text-[var(--up-muted)]">
            <tr>
              <th className="pb-2 pr-2">When</th>
              <th className="pb-2 pr-2">Description</th>
              <th className="pb-2 pr-2">Amount</th>
              <th className="pb-2 pr-2">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--up-border)]">
            {filtered.map((t) => (
              <TransactionRow
                key={t.id}
                t={t}
                leafCats={categories.data ?? []}
                catsLoading={categories.isLoading}
                onMutate={() => {
                  void qc.invalidateQueries({ queryKey: ["up", "transactions"] });
                  void qc.invalidateQueries({ queryKey: ["up", "accounts"] });
                  void qc.invalidateQueries({ queryKey: ["up", "analytics"] });
                }}
                categoryNameById={categoryNameById}
                onError={(message) => pushToast({ tone: "error", title: "Update failed", detail: message })}
              />
            ))}
          </tbody>
        </table>
        {nextUrl ? (
          <div className="mt-4 flex justify-center">
            <Button disabled={loadingMore} onClick={() => void loadMore()}>
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function TransactionRow({
  t,
  leafCats,
  catsLoading,
  onMutate,
  categoryNameById,
  onError,
}: {
  t: TransactionResource;
  leafCats: { id: string; attributes: { name: string } }[];
  catsLoading: boolean;
  onMutate: () => void;
  categoryNameById: Map<string, string>;
  onError: (message: string) => void;
}) {
  const [cat, setCat] = useState(t.relationships.category.data?.id ?? "");
  const [tagsToAdd, setTagsToAdd] = useState("");
  const [tagsToRemove, setTagsToRemove] = useState("");

  const catMutation = useMutation({
    mutationFn: async () => {
      const v = cat.trim();
      if (!v) {
        await setTransactionCategory(t.id, null);
        return;
      }
      await setTransactionCategory(t.id, v);
    },
    onSuccess: onMutate,
    onError: (error: Error) => onError(error.message),
  });

  const addTags = useMutation({
    mutationFn: async () => {
      const parts = tagsToAdd
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!parts.length) {
        return;
      }
      await addTransactionTags(t.id, parts);
    },
    onSuccess: () => {
      setTagsToAdd("");
      onMutate();
    },
    onError: (error: Error) => onError(error.message),
  });

  const remTags = useMutation({
    mutationFn: async () => {
      const parts = tagsToRemove
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!parts.length) {
        return;
      }
      await removeTransactionTags(t.id, parts);
    },
    onSuccess: () => {
      setTagsToRemove("");
      onMutate();
    },
    onError: (error: Error) => onError(error.message),
  });

  const categoryId = t.relationships.category.data?.id ?? null;
  const categoryName = categoryId ? categoryNameById.get(categoryId) ?? categoryId : "Uncategorized";

  const statusTone = (() => {
    switch (t.attributes.status) {
      case "SETTLED":
        return "ok" as const;
      case "HELD":
        return "warn" as const;
      default: {
        const exhaustive: never = t.attributes.status;
        throw new Error(`Unhandled status ${exhaustive}`);
      }
    }
  })();

  return (
    <tr className="align-top">
      <td className="py-3 pr-2 text-xs text-[var(--up-muted)]">
        {formatDateTime(t.attributes.createdAt)}
      </td>
      <td className="py-3 pr-2">
        <div className="font-medium">{t.attributes.description}</div>
        {t.relationships.tags.data.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {t.relationships.tags.data.map((x) => (
              <Badge key={x.id} tone="neutral">
                {x.id}
              </Badge>
            ))}
          </div>
        ) : null}
        <div className="mt-1 text-xs text-[var(--up-muted)]">Category: {categoryName}</div>
      </td>
      <td
        className={`py-3 pr-2 font-medium ${
          Number.parseFloat(t.attributes.amount.value) < 0
            ? "text-red-300"
            : "text-emerald-300"
        }`}
      >
        {formatAud(t.attributes.amount.value)}
      </td>
      <td className="py-3 pr-2">
        <Badge tone={statusTone}>
          {t.attributes.status}
        </Badge>
        {!t.attributes.isCategorizable ? (
          <div className="mt-1 text-[10px] text-[var(--up-muted)]">
            Not categorizable
          </div>
        ) : null}
      </td>
      <td className="py-3">
        <div className="mb-2">
          <Link to={`/transactions/${t.id}`}>
            <Button variant="ghost" className="!py-1 !px-2 text-xs">
              Details
            </Button>
          </Link>
        </div>
        {t.attributes.isCategorizable ? (
          <div className="flex min-w-[260px] flex-col gap-2">
            <div className="flex flex-wrap gap-1">
              <select
                className="max-w-[200px] flex-1 rounded border border-[var(--up-border)] bg-[#12111a] px-2 py-1 text-xs"
                disabled={catsLoading}
                value={cat}
                onChange={(e) => setCat(e.target.value)}
              >
                <option value="">— Clear category —</option>
                {leafCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.attributes.name} ({c.id})
                  </option>
                ))}
              </select>
              <Button
                className="!py-1 text-xs"
                disabled={catMutation.isPending}
                onClick={() => catMutation.mutate()}
              >
                Set
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              <input
                className="min-w-[120px] flex-1 rounded border border-[var(--up-border)] bg-[#12111a] px-2 py-1 text-xs"
                placeholder="Add tags, comma"
                value={tagsToAdd}
                onChange={(e) => setTagsToAdd(e.target.value)}
              />
              <Button
                className="!py-1 text-xs"
                disabled={addTags.isPending}
                onClick={() => addTags.mutate()}
              >
                +Tags
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              <input
                className="min-w-[120px] flex-1 rounded border border-[var(--up-border)] bg-[#12111a] px-2 py-1 text-xs"
                placeholder="Remove tags"
                value={tagsToRemove}
                onChange={(e) => setTagsToRemove(e.target.value)}
              />
              <Button
                variant="ghost"
                className="!py-1 text-xs"
                disabled={remTags.isPending}
                onClick={() => remTags.mutate()}
              >
                −Tags
              </Button>
            </div>
          </div>
        ) : (
          <span className="text-xs text-[var(--up-muted)]">—</span>
        )}
      </td>
    </tr>
  );
}
