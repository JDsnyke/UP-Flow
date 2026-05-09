import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Spinner } from "../../components/ui";
import {
  addTransactionTags,
  fetchTagsPage,
  removeTransactionTags,
} from "../../lib/up-api/client";
import { splitUpPaginationUrl } from "../../lib/up-api/parse";
import type { Paginated, TagResource } from "../../lib/up-api/types";

const MAX_TAGS = 6;
const PAGE_SIZE = 50;

function uniqueTags(tags: string[]) {
  return Array.from(new Set(tags));
}

export function TransactionTagsEditor({
  transactionId,
  currentTagIds,
}: {
  transactionId: string;
  currentTagIds: string[];
}) {
  const qc = useQueryClient();
  const currentUnique = useMemo(() => uniqueTags(currentTagIds), [currentTagIds]);
  const currentUniqueKey = useMemo(() => currentUnique.join("|"), [currentUnique]);
  const [selected, setSelected] = useState<string[]>(currentUnique);
  const [search, setSearch] = useState("");
  const [extraPages, setExtraPages] = useState<Paginated<TagResource>[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setSelected(currentUnique);
    setExtraPages([]);
    setSearch("");
  }, [transactionId, currentUnique, currentUniqueKey]);

  const first = useQuery({
    queryKey: ["up", "tags", "p0", PAGE_SIZE],
    queryFn: () => fetchTagsPage({ "page[size]": String(PAGE_SIZE) }),
    enabled: Boolean(transactionId),
  });

  const lastPage =
    extraPages.length > 0 ? extraPages[extraPages.length - 1]! : first.data ?? null;
  const nextUrl = lastPage?.links?.next;

  const allTags = useMemo(() => {
    const base = first.data?.data ?? [];
    const rest = extraPages.flatMap((p) => p.data);
    return [...base, ...rest];
  }, [first.data, extraPages]);

  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTags;
    return allTags.filter((t) => t.id.toLowerCase().includes(q));
  }, [allTags, search]);

  const toggleTag = (tagId: string, checked: boolean) => {
    setSelected((prev) => {
      const isAlready = prev.includes(tagId);
      if (checked) {
        if (isAlready) return prev;
        if (prev.length >= MAX_TAGS) return prev;
        return [...prev, tagId];
      }
      return prev.filter((x) => x !== tagId);
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cur = new Set(currentUnique);
      const next = new Set(selected);
      const toAdd = Array.from(next).filter((t) => !cur.has(t));
      const toRemove = Array.from(cur).filter((t) => !next.has(t));

      if (selected.length > MAX_TAGS) {
        throw new Error(`Up allows max ${MAX_TAGS} tags per transaction.`);
      }

      // Remove first to keep changes safe under any server-side constraints.
      if (toRemove.length) {
        await removeTransactionTags(transactionId, toRemove);
      }
      if (toAdd.length) {
        await addTransactionTags(transactionId, toAdd);
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["up", "transactions", transactionId] });
    },
  });

  const dirty = useMemo(() => {
    const cur = uniqueTags(currentUnique).sort().join("|");
    const nxt = uniqueTags(selected).sort().join("|");
    return cur !== nxt;
  }, [currentUnique, selected]);

  const loadMore = async () => {
    if (!nextUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const { path, query } = splitUpPaginationUrl(nextUrl);
      if (path !== "/tags") {
        throw new Error("Unexpected pagination URL for tags");
      }
      const q = Object.fromEntries(new URLSearchParams(query ?? ""));
      const next = await fetchTagsPage(q);
      setExtraPages((prev) => [...prev, next]);
    } finally {
      setLoadingMore(false);
    }
  };

  const selectedCount = selected.length;

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Edit tags</h3>
          <p className="mt-1 text-xs text-[var(--up-muted)]">
            Up allows up to {MAX_TAGS} tags per transaction (duplicates ignored).
          </p>
        </div>
        <Badge tone="neutral">
          {selectedCount}/{MAX_TAGS} selected
        </Badge>
      </div>

      {first.isLoading ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Spinner />
          <span className="text-sm text-[var(--up-muted)]">Loading tags…</span>
        </div>
      ) : first.isError ? (
        <p className="mt-4 text-sm text-red-400">
          {first.error instanceof Error ? first.error.message : "Failed to load tags"}
        </p>
      ) : (
        <>
          <div className="mt-4">
            <input
              className="w-full rounded-lg border border-[var(--up-border)] bg-[#12111a] px-3 py-2 text-sm"
              placeholder="Search tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="mt-4 max-h-[320px] overflow-auto rounded-lg border border-[var(--up-border)]/60">
            <ul className="divide-y divide-[var(--up-border)]/60 text-sm">
              {filteredTags.map((t) => {
                const isSelected = selected.includes(t.id);
                const disabled = !isSelected && selected.length >= MAX_TAGS;
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <label className={disabled ? "opacity-60" : ""}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={disabled}
                        onChange={(e) => toggleTag(t.id, e.target.checked)}
                      />{" "}
                      <span className="ml-2">{t.id}</span>
                    </label>
                    {isSelected ? <Badge tone="ok">Selected</Badge> : null}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              disabled={!dirty || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Saving…" : "Save tags"}
            </Button>
            <Button
              variant="ghost"
              disabled={!dirty || saveMutation.isPending}
              onClick={() => setSelected(currentUnique)}
            >
              Reset
            </Button>
            <span className="text-xs text-[var(--up-muted)]">
              Tip: check/uncheck to reach the max of {MAX_TAGS}.
            </span>
          </div>

          {nextUrl ? (
            <div className="mt-3 flex justify-center">
              <Button disabled={loadingMore} variant="ghost" onClick={() => void loadMore()}>
                {loadingMore ? "Loading…" : "Load more tags"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}

