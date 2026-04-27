import { useQuery } from "@tanstack/react-query";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Link, useParams } from "react-router-dom";
import { useTokenGate } from "../../hooks/useTokenGate";
import { fetchAllCategoriesFlat, fetchAttachment, fetchTransaction } from "../../lib/up-api/client";
import type { CategoryResource, TransactionResource } from "../../lib/up-api/types";
import { formatAud, formatDateTime } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Spinner } from "../../components/ui";
import { TransactionTagsEditor } from "./TransactionTagsEditor";

function categoryNameFromId(categories: CategoryResource[], id: string | null) {
  if (!id) return null;
  return categories.find((c) => c.id === id)?.attributes.name ?? id;
}

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const gate = useTokenGate();

  const txQuery = useQuery({
    queryKey: ["up", "transactions", id],
    queryFn: () => fetchTransaction(id!),
    enabled: Boolean(id) && gate.data === true,
  });

  const categoriesQuery = useQuery({
    queryKey: ["up", "categories", "flat"],
    queryFn: fetchAllCategoriesFlat,
    enabled: gate.data === true,
  });

  const attachmentId =
    txQuery.data?.relationships.attachment.data?.id ?? null;

  const attachmentQuery = useQuery({
    queryKey: ["up", "attachments", attachmentId],
    queryFn: () => fetchAttachment(attachmentId!),
    enabled: Boolean(attachmentId) && gate.data === true,
  });

  if (!id) {
    return <EmptyState title="Missing transaction id" />;
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

  if (
    txQuery.isLoading ||
    categoriesQuery.isLoading ||
    (attachmentId ? attachmentQuery.isLoading : false)
  ) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner />
        <span className="text-sm text-[var(--up-muted)]">Loading…</span>
      </div>
    );
  }

  if (txQuery.isError) {
    return (
      <EmptyState
        title="Could not load transaction"
        detail={txQuery.error instanceof Error ? txQuery.error.message : "Error"}
      />
    );
  }

  const tx: TransactionResource = txQuery.data!;
  const categories = categoriesQuery.data ?? [];
  const attachment = attachmentQuery.data ?? null;

  const categoryId = tx.relationships.category.data?.id ?? null;
  const categoryName = categoryNameFromId(categories, categoryId);

  const tags = tx.relationships.tags.data.map((t) => t.id);
  const amount = Number.parseFloat(tx.attributes.amount.value);
  const amountTone = amount < 0 ? "text-red-300" : "text-emerald-300";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/transactions" className="text-sm text-[var(--up-muted)] hover:text-[var(--up-text)]">
          ← Transactions
        </Link>
        <Badge tone={tx.attributes.status === "SETTLED" ? "ok" : "warn"}>
          {tx.attributes.status}
        </Badge>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{tx.attributes.description}</h1>
        <p className="mt-1 text-sm text-[var(--up-muted)]">
          Transaction id: <code className="rounded bg-black/30 px-1">{tx.id}</code>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs uppercase tracking-wide text-[var(--up-muted)]">Amount</div>
          <div className={`mt-2 text-2xl font-semibold ${amountTone}`}>
            {formatAud(tx.attributes.amount.value)}
          </div>
          <div className="mt-2 text-xs text-[var(--up-muted)]">
            Currency: {tx.attributes.amount.currencyCode}
          </div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-[var(--up-muted)]">
            Category
          </div>
          <div className="mt-2 text-sm font-medium">
            {categoryName ? (
              <>
                {categoryName}{" "}
                <span className="text-[var(--up-muted)]">
                  ({categoryId})
                </span>
              </>
            ) : (
              "Uncategorized"
            )}
          </div>
          {tx.attributes.isCategorizable ? (
            <div className="mt-2 text-xs text-[var(--up-muted)]">
              Leaf categories only can be assigned.
            </div>
          ) : (
            <div className="mt-2 text-xs text-red-300">Not categorizable</div>
          )}
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-[var(--up-muted)]">Dates</div>
          <div className="mt-2 text-sm">
            <div>
              Created: <span className="text-[var(--up-muted)]">{formatDateTime(tx.attributes.createdAt)}</span>
            </div>
            <div className="mt-1">
              Settled:{" "}
              <span className="text-[var(--up-muted)]">
                {tx.attributes.settledAt ? formatDateTime(tx.attributes.settledAt) : "—"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Tags</h2>
        {tags.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <Badge key={t} tone="neutral">
                {t}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--up-muted)]">No tags</p>
        )}
      </Card>

      <TransactionTagsEditor transactionId={tx.id} currentTagIds={tags} />

      <Card>
        <h2 className="text-lg font-semibold">Attachment</h2>
        {attachment ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-[var(--up-muted)]">
              Attachment id:{" "}
              <code className="rounded bg-black/30 px-1">{attachment.id}</code>
            </p>

            {attachment.attributes.fileURL ? (
              <div>
                {String(attachment.attributes.fileContentType ?? "").startsWith(
                  "image/",
                ) ? (
                  <img
                    src={attachment.attributes.fileURL}
                    alt={attachment.attributes.fileExtension ?? "attachment"}
                    className="mt-3 max-h-72 w-full rounded-lg border border-[var(--up-border)] object-contain"
                  />
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => void openUrl(attachment.attributes.fileURL!)}
                    disabled={!attachment.attributes.fileURL}
                  >
                    Open
                  </Button>
                  <span className="text-xs text-[var(--up-muted)]">
                    Expires{" "}
                    {attachment.attributes.fileURLExpiresAt
                      ? formatDateTime(attachment.attributes.fileURLExpiresAt)
                      : "—"}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="text-sm text-[var(--up-muted)]">
              <div>
                Content type:{" "}
                <span className="text-[var(--up-text)]">
                  {attachment.attributes.fileContentType ?? "unknown"}
                </span>
              </div>
              <div className="mt-1">
                Extension:{" "}
                <span className="text-[var(--up-text)]">
                  {attachment.attributes.fileExtension ?? "—"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--up-muted)]">No attachment</p>
        )}
      </Card>
    </div>
  );
}

