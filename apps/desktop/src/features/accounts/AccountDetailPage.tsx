import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTokenGate } from "../../hooks/useTokenGate";
import {
  fetchAccount,
  fetchAccountTransactionsPage,
} from "../../lib/up-api/client";
import { splitUpPaginationUrl } from "../../lib/up-api/parse";
import type { Paginated, TransactionResource } from "../../lib/up-api/types";
import { formatAud, formatDateTime } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Spinner } from "../../components/ui";

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const gate = useTokenGate();
  const [extraPages, setExtraPages] = useState<Paginated<TransactionResource>[]>(
    [],
  );
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setExtraPages([]);
  }, [id]);

  const accountQuery = useQuery({
    queryKey: ["up", "account", id],
    queryFn: () => fetchAccount(id!),
    enabled: Boolean(id) && gate.data === true,
  });

  const firstPage = useQuery({
    queryKey: ["up", "accountTx", id, "p0"],
    queryFn: () =>
      fetchAccountTransactionsPage(id!, { "page[size]": "25" }),
    enabled: Boolean(id) && gate.data === true,
  });

  if (!id) {
    return <EmptyState title="Missing account id" />;
  }

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

  if (accountQuery.isLoading || firstPage.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner />
      </div>
    );
  }

  if (accountQuery.isError || firstPage.isError) {
    const err = accountQuery.error ?? firstPage.error;
    return (
      <EmptyState
        title="Error"
        detail={err instanceof Error ? err.message : "Failed to load"}
      />
    );
  }

  const acc = accountQuery.data!;
  const first = firstPage.data!;
  const merged = [
    ...first.data,
    ...extraPages.flatMap((p) => p.data),
  ];
  const lastPage =
    extraPages.length > 0 ? extraPages[extraPages.length - 1]! : first;
  const nextUrl = lastPage.links?.next;

  const loadMore = async () => {
    if (!nextUrl || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const { path, query } = splitUpPaginationUrl(nextUrl);
      const expected = `/accounts/${id}/transactions`;
      if (path !== expected) {
        throw new Error("Unexpected pagination URL");
      }
      const q = Object.fromEntries(new URLSearchParams(query ?? ""));
      const next = await fetchAccountTransactionsPage(id, q);
      setExtraPages((prev) => [...prev, next]);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/"
          className="text-sm text-[var(--up-muted)] hover:text-[var(--up-text)]"
        >
          ← Dashboard
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">{acc.attributes.displayName}</h1>
        <p className="mt-1 text-sm text-[var(--up-muted)]">
          {acc.attributes.accountType} · Balance{" "}
          <span className="font-semibold text-[var(--up-accent)]">
            {formatAud(acc.attributes.balance.value)}
          </span>
        </p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Recent transactions</h2>
        <ul className="mt-4 divide-y divide-[var(--up-border)]">
          {merged.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-start justify-between gap-2 py-3"
            >
              <div>
                <div className="font-medium">{t.attributes.description}</div>
                <div className="text-xs text-[var(--up-muted)]">
                  {formatDateTime(t.attributes.createdAt)}
                </div>
                {t.relationships.category.data ? (
                  <div className="mt-1 text-xs text-[var(--up-muted)]">
                    Category: {t.relationships.category.data.id}
                  </div>
                ) : null}
              </div>
              <div className="text-right">
                <div
                  className={
                    Number.parseFloat(t.attributes.amount.value) < 0
                      ? "text-red-300"
                      : "text-emerald-300"
                  }
                >
                  {formatAud(t.attributes.amount.value)}
                </div>
                <Badge tone={t.attributes.status === "SETTLED" ? "ok" : "warn"}>
                  {t.attributes.status}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
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
