import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Link } from "react-router-dom";
import { useTokenGate } from "../../hooks/useTokenGate";
import { fetchAttachmentsPage } from "../../lib/up-api/client";
import { splitUpPaginationUrl } from "../../lib/up-api/parse";
import type { Paginated, AttachmentResource } from "../../lib/up-api/types";
import { formatDateTime } from "../../lib/format";
import { Button, Card, EmptyState, Spinner } from "../../components/ui";

export function AttachmentsPage() {
  const gate = useTokenGate();
  const [extra, setExtra] = useState<Paginated<AttachmentResource>[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const first = useQuery({
    queryKey: ["up", "attachments", "p0"],
    queryFn: () => fetchAttachmentsPage({ "page[size]": "20" }),
    enabled: gate.data === true,
  });

  const last =
    extra.length > 0 ? extra[extra.length - 1]! : first.data ?? null;
  const nextUrl = last?.links?.next;

  const loadMore = async () => {
    if (!nextUrl || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const { path, query } = splitUpPaginationUrl(nextUrl);
      if (path !== "/attachments") {
        throw new Error("Unexpected pagination URL");
      }
      const q = Object.fromEntries(new URLSearchParams(query ?? ""));
      const n = await fetchAttachmentsPage(q);
      setExtra((prev) => [...prev, n]);
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

  if (first.isLoading) {
    return (
      <div className="flex h-40 justify-center">
        <Spinner />
      </div>
    );
  }

  if (first.isError) {
    return (
      <EmptyState
        title="Error"
        detail={first.error instanceof Error ? first.error.message : "Failed"}
      />
    );
  }

  const rows = [
    ...(first.data?.data ?? []),
    ...extra.flatMap((p) => p.data),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attachments</h1>
        <p className="mt-1 text-sm text-[var(--up-muted)]">
          Receipts and files from{" "}
          <code className="rounded bg-black/30 px-1">GET /attachments</code>.
          Download links are temporary.
        </p>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-[var(--up-muted)]">
            <tr>
              <th className="pb-2">Created</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">Transaction</th>
              <th className="pb-2">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--up-border)]">
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="py-2 text-xs text-[var(--up-muted)]">
                  {a.attributes.createdAt
                    ? formatDateTime(a.attributes.createdAt)
                    : "—"}
                </td>
                <td className="py-2">
                  {a.attributes.fileExtension ?? "?"}{" "}
                  <span className="text-xs text-[var(--up-muted)]">
                    {a.attributes.fileContentType ?? ""}
                  </span>
                </td>
                <td className="py-2 font-mono text-xs">
                  {a.relationships.transaction.data.id}
                </td>
                <td className="py-2">
                  {a.attributes.fileURL ? (
                    <Button
                      variant="ghost"
                      className="!py-1 text-xs"
                      onClick={() => void openUrl(a.attributes.fileURL!)}
                    >
                      Open
                    </Button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
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
