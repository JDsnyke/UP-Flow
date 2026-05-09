import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useToast } from "../../components/Toast";
import { TOKEN_EXISTS_QUERY_KEY } from "../../hooks/useTokenGate";
import {
  tokenDelete,
  tokenSave,
  upApiValidateToken,
  upWebhookVerify,
} from "../../lib/up-api/invoke";
import { parseUpJson } from "../../lib/up-api/parse";
import { formatDateTime } from "../../lib/format";
import { Badge, Button, Card } from "../../components/ui";

type PingMeta = { meta?: { id?: string; statusEmoji?: string } };

export function SettingsPage() {
  const { pushToast } = useToast();
  const qc = useQueryClient();
  const [tokenInput, setTokenInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(null);
  const [verifyBody, setVerifyBody] = useState("");
  const [verifySignature, setVerifySignature] = useState("");
  const [verifySecret, setVerifySecret] = useState("");
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      setMessage(null);
      setError(null);
      const trimmed = tokenInput.trim();
      if (!trimmed) {
        throw new Error("Paste your Personal Access Token first.");
      }
      const ping = await upApiValidateToken(trimmed);
      if (ping.status !== 200) {
        throw new Error(
          `Token validation failed (${ping.status}). Check the token and try again.`,
        );
      }
      const meta = parseUpJson<PingMeta>(ping);
      await tokenSave(trimmed);
      return meta.meta?.statusEmoji ?? "OK";
    },
    onSuccess: async (emoji) => {
      setMessage(`Saved securely. Ping: ${emoji}`);
      setLastValidatedAt(new Date().toISOString());
      setTokenInput("");
      await qc.invalidateQueries({ queryKey: TOKEN_EXISTS_QUERY_KEY });
      pushToast({ tone: "success", title: "Token saved" });
    },
    onError: (e: Error) => {
      setError(e.message);
      pushToast({ tone: "error", title: "Token validation failed", detail: e.message });
    },
  });

  const clearMutation = useMutation({
    mutationFn: tokenDelete,
    onSuccess: async () => {
      setMessage("Token removed from secure storage.");
      setError(null);
      await qc.invalidateQueries({ queryKey: TOKEN_EXISTS_QUERY_KEY });
      pushToast({ tone: "success", title: "Token removed" });
    },
    onError: (e: Error) => {
      setError(e.message);
      pushToast({ tone: "error", title: "Could not remove token", detail: e.message });
    },
  });
  const testMutation = useMutation({
    mutationFn: async () => {
      const trimmed = tokenInput.trim();
      if (!trimmed) {
        throw new Error("Paste a token first to test it.");
      }
      const ping = await upApiValidateToken(trimmed);
      if (ping.status !== 200) {
        throw new Error(`Test failed with ${ping.status}`);
      }
      return parseUpJson<PingMeta>(ping);
    },
    onSuccess: (meta) => {
      setLastValidatedAt(new Date().toISOString());
      pushToast({
        tone: "success",
        title: "Connection OK",
        detail: `Ping: ${meta.meta?.statusEmoji ?? "OK"}`,
      });
    },
    onError: (e: Error) => {
      pushToast({ tone: "error", title: "Connection test failed", detail: e.message });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const ok = await upWebhookVerify(
        verifySignature.trim(),
        verifyBody,
        verifySecret.trim(),
      );
      return ok;
    },
    onSuccess: (ok) => {
      setVerifyResult(ok ? "Signature is valid." : "Signature does not match.");
    },
    onError: (e: Error) => setVerifyResult(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-[var(--up-muted)]">
          Your token is stored in the OS keychain (macOS Keychain, Windows
          Credential Manager, Secret Service on Linux). It is never written to
          project files.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Get a token</span>
          <Badge tone="neutral">Personal Access Token only</Badge>
        </div>
        <p className="text-sm text-[var(--up-muted)]">
          Generate a token in the Up app under{" "}
          <strong>Data sharing → Personal Access Token</strong>, or follow the
          prompts on the Up API site.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() =>
              void openUrl("https://developer.up.com.au/")
            }
          >
            Up API docs
          </Button>
          <Button
            variant="ghost"
            onClick={() => void openUrl("https://api.up.com.au/")}
          >
            Claim token (api.up.com.au)
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <label className="block text-sm font-medium" htmlFor="pat">
          Personal Access Token
        </label>
        <textarea
          id="pat"
          className="min-h-[100px] w-full resize-y rounded-lg border border-[var(--up-border)] bg-[#12111a] px-3 py-2 text-sm text-[var(--up-text)] outline-none focus:ring-2 focus:ring-[var(--up-accent)]/40"
          placeholder="up:yeah:xxxx…"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Validating…" : "Validate & save"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
          >
            {testMutation.isPending ? "Testing…" : "Test connection"}
          </Button>
          <Button
            variant="danger"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
          >
            Remove token
          </Button>
        </div>
        {message ? (
          <p className="text-sm text-emerald-400">{message}</p>
        ) : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {lastValidatedAt ? (
          <p className="text-xs text-[var(--up-muted)]">
            Last validated: {formatDateTime(lastValidatedAt)}
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Webhook signature (reference)</h2>
        <p className="mt-2 text-xs leading-relaxed text-[var(--up-muted)]">
          Incoming events include{" "}
          <code className="rounded bg-black/30 px-1">X-Up-Authenticity-Signature</code>{" "}
          — SHA-256 HMAC of the raw body with your webhook{" "}
          <code className="rounded bg-black/30 px-1">secretKey</code>. Verify
          before trusting payloads. See{" "}
          <button
            type="button"
            className="text-[var(--up-accent)] underline"
            onClick={() => void openUrl("https://developer.up.com.au/")}
          >
            developer.up.com.au
          </button>
          .
        </p>
      </Card>
      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">Webhook signature self-test</h2>
        <textarea
          className="min-h-[80px] w-full rounded-lg border border-[var(--up-border)] bg-[#12111a] px-3 py-2 text-sm"
          placeholder="Raw request body"
          value={verifyBody}
          onChange={(e) => setVerifyBody(e.target.value)}
        />
        <input
          className="w-full rounded-lg border border-[var(--up-border)] bg-[#12111a] px-3 py-2 text-sm"
          placeholder="X-Up-Authenticity-Signature (hex)"
          value={verifySignature}
          onChange={(e) => setVerifySignature(e.target.value)}
        />
        <input
          className="w-full rounded-lg border border-[var(--up-border)] bg-[#12111a] px-3 py-2 text-sm"
          placeholder="Webhook secret key"
          value={verifySecret}
          onChange={(e) => setVerifySecret(e.target.value)}
        />
        <Button onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending}>
          {verifyMutation.isPending ? "Verifying…" : "Verify signature"}
        </Button>
        {verifyResult ? <p className="text-sm text-[var(--up-muted)]">{verifyResult}</p> : null}
      </Card>
    </div>
  );
}
