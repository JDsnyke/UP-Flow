import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Link } from "react-router-dom";
import { useTokenGate } from "../../hooks/useTokenGate";
import {
  createWebhook,
  deleteWebhook,
  fetchWebhookLogsPage,
  fetchWebhooksPage,
  pingWebhook,
} from "../../lib/up-api/client";
import { splitUpPaginationUrl } from "../../lib/up-api/parse";
import type { Paginated, WebhookDeliveryLogResource } from "../../lib/up-api/types";
import { formatDateTime } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Spinner } from "../../components/ui";

export function WebhooksPage() {
  const gate = useTokenGate();
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logExtra, setLogExtra] = useState<Paginated<WebhookDeliveryLogResource>[]>(
    [],
  );
  const [logsLoading, setLogsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    setLogExtra([]);
    setExpandedLogId(null);
  }, [selectedId, autoRefresh]);

  const list = useQuery({
    queryKey: ["up", "webhooks"],
    queryFn: () => fetchWebhooksPage({ "page[size]": "30" }),
    enabled: gate.data === true,
  });

  const create = useMutation({
    mutationFn: () =>
      createWebhook({
        url: url.trim(),
        description: description.trim() || null,
      }),
    onSuccess: (data) => {
      setUrl("");
      setDescription("");
      void qc.invalidateQueries({ queryKey: ["up", "webhooks"] });
      if (data.attributes.secretKey) {
        void alert(
          `Webhook created.\n\nSave this secret key now (shown once):\n\n${data.attributes.secretKey}`,
        );
      }
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["up", "webhooks"] });
      setSelectedId(null);
      setLogExtra([]);
    },
  });

  const ping = useMutation({
    mutationFn: (id: string) => pingWebhook(id),
    onSuccess: (data) => {
      void alert(`Ping queued / delivered (see logs).\n\n${JSON.stringify(data, null, 2)}`);
    },
  });

  const logsFirst = useQuery({
    queryKey: ["up", "webhookLogs", selectedId],
    queryFn: () =>
      fetchWebhookLogsPage(selectedId!, { "page[size]": "15" }),
    enabled: Boolean(selectedId) && gate.data === true,
    refetchInterval: autoRefresh ? 4000 : false,
    refetchIntervalInBackground: true,
  });

  const lastLogPage =
    logExtra.length > 0
      ? logExtra[logExtra.length - 1]!
      : logsFirst.data ?? null;
  const logsNext = lastLogPage?.links?.next;

  const loadMoreLogs = async () => {
    if (!selectedId || !logsNext || logsLoading) {
      return;
    }
    setLogsLoading(true);
    try {
      const { path, query } = splitUpPaginationUrl(logsNext);
      const expected = `/webhooks/${selectedId}/logs`;
      if (path !== expected) {
        throw new Error("Unexpected pagination URL");
      }
      const q = Object.fromEntries(new URLSearchParams(query ?? ""));
      const n = await fetchWebhookLogsPage(selectedId, q);
      setLogExtra((p) => [...p, n]);
    } finally {
      setLogsLoading(false);
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

  if (list.isLoading) {
    return (
      <div className="flex h-40 justify-center">
        <Spinner />
      </div>
    );
  }

  if (list.isError) {
    return (
      <EmptyState
        title="Error"
        detail={list.error instanceof Error ? list.error.message : "Failed"}
      />
    );
  }

  const hooks = list.data?.data ?? [];
  const logRows = [
    ...(logsFirst.data?.data ?? []),
    ...logExtra.flatMap((p) => p.data),
  ];

  const verifierSnippet = `// Node.js example (raw body required)
import crypto from "crypto";

export function verifyUpWebhook(rawBody, receivedSignatureHex, secretKey) {
  // Up sends: X-Up-Authenticity-Signature: <sha256-hmac-hex>
  const computedHex = crypto
    .createHmac("sha256", secretKey)
    .update(rawBody, "utf8")
    .digest("hex");

  const a = Buffer.from(receivedSignatureHex, "hex");
  const b = Buffer.from(computedHex, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Webhooks</h1>
        <p className="mt-1 text-sm text-[var(--up-muted)]">
          Manage Up webhooks (max 10). Verify{" "}
          <code className="rounded bg-black/30 px-1">
            X-Up-Authenticity-Signature
          </code>{" "}
          on your server — see{" "}
          <button
            type="button"
            className="text-[var(--up-accent)] underline"
            onClick={() => void openUrl("https://developer.up.com.au/")}
          >
            API docs
          </button>
          .
        </p>
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">Create webhook</h2>
        <input
          className="w-full rounded-lg border border-[var(--up-border)] bg-[#12111a] px-3 py-2 text-sm"
          placeholder="https://example.com/up-webhook"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          className="w-full rounded-lg border border-[var(--up-border)] bg-[#12111a] px-3 py-2 text-sm"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button
          disabled={create.isPending || !url.trim()}
          onClick={() => create.mutate()}
        >
          {create.isPending ? "Creating…" : "Create"}
        </Button>
        {create.isError ? (
          <p className="text-sm text-red-400">
            {create.error instanceof Error ? create.error.message : "Error"}
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Configured ({hooks.length})</h2>
        <ul className="divide-y divide-[var(--up-border)]">
          {hooks.map((w) => (
            <li
              key={w.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div>
                <div className="font-medium">{w.attributes.url}</div>
                <div className="text-xs text-[var(--up-muted)]">
                  {w.attributes.description ?? "—"} · id {w.id}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  className="!py-1 text-xs"
                  onClick={() => {
                    setSelectedId(w.id);
                  }}
                >
                  Logs
                </Button>
                <Button
                  variant="ghost"
                  className="!py-1 text-xs"
                  disabled={ping.isPending}
                  onClick={() => ping.mutate(w.id)}
                >
                  Ping
                </Button>
                <Button
                  variant="danger"
                  className="!py-1 text-xs"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm("Delete this webhook?")) {
                      remove.mutate(w.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {selectedId ? (
        <>
          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Webhook signature verification</h2>
                <p className="mt-1 text-sm text-[var(--up-muted)]">
                  Up includes{" "}
                  <code className="rounded bg-black/30 px-1">X-Up-Authenticity-Signature</code>{" "}
                  (SHA-256 HMAC of the raw request body). Verify before trusting any payload.
                </p>
              </div>
              <Badge tone="neutral">HMAC SHA-256</Badge>
            </div>

            <div className="rounded-lg border border-[var(--up-border)]/60 bg-black/20 p-3">
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words text-[10px]">
                {verifierSnippet}
              </pre>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(verifierSnippet)
                    .then(() => setCopiedSnippet(true))
                    .catch(() => setCopiedSnippet(false))
                    .finally(() => {
                      setTimeout(() => setCopiedSnippet(false), 1200);
                    });
                }}
              >
                {copiedSnippet ? "Copied" : "Copy snippet"}
              </Button>
              <span className="text-xs text-[var(--up-muted)]">
                Important: hash the <strong>raw</strong> body bytes (no JSON parsing before hashing).
              </span>
            </div>
          </Card>

          <Card>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-semibold">Delivery logs</h2>
                <Badge tone="neutral">Webhook {selectedId.slice(0, 8)}…</Badge>
              </div>

              <label className="flex items-center gap-2 text-xs text-[var(--up-muted)]">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh
              </label>
            </div>

            {logsFirst.isLoading ? (
              <Spinner />
            ) : logsFirst.isError ? (
              <p className="text-sm text-red-400">Failed to load logs</p>
            ) : (
              <>
                <div className="max-h-[360px] overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[var(--up-muted)]">
                      <tr>
                        <th className="pb-2">Time</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">HTTP / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--up-border)]">
                      {logRows.map((l) => {
                        const delivery = l.attributes.deliveryStatus;
                        const deliveryClass =
                          delivery === "DELIVERED"
                            ? "text-emerald-300"
                            : delivery === "UNDELIVERABLE"
                              ? "text-amber-200"
                              : delivery === "BAD_RESPONSE_CODE"
                                ? "text-red-300"
                                : "text-[var(--up-muted)]";
                        const isExpanded = expandedLogId === l.id;
                        return (
                          <Fragment key={l.id}>
                            <tr>
                              <td className="py-2 text-[var(--up-muted)]">
                                {formatDateTime(l.attributes.createdAt)}
                              </td>
                              <td className={`py-2 font-medium ${deliveryClass}`}>
                                {delivery}
                              </td>
                              <td className="py-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>
                                    {l.attributes.response?.statusCode ?? "—"}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    className="!py-1 !px-2 text-xs"
                                    onClick={() =>
                                      setExpandedLogId((prev) =>
                                        prev === l.id ? null : l.id,
                                      )
                                    }
                                  >
                                    {isExpanded ? "Hide" : "Details"}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded ? (
                              <tr>
                                <td colSpan={3} className="px-3 py-2">
                                  <div className="space-y-3">
                                    <div>
                                      <div className="text-[10px] uppercase text-[var(--up-muted)]">
                                        Request body
                                      </div>
                                      <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-2 text-[10px]">
                                        {l.attributes.request.body}
                                      </pre>
                                    </div>
                                    <div>
                                      <div className="text-[10px] uppercase text-[var(--up-muted)]">
                                        Response body
                                      </div>
                                      <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-2 text-[10px]">
                                        {l.attributes.response?.body ?? "—"}
                                      </pre>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {logsNext && !autoRefresh ? (
                  <div className="mt-3 flex justify-center">
                    <Button
                      variant="ghost"
                      disabled={logsLoading}
                      onClick={() => void loadMoreLogs()}
                    >
                      {logsLoading ? "Loading…" : "More logs"}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
