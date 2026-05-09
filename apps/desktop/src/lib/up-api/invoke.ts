import { invoke } from "@tauri-apps/api/core";
import { debugLog } from "../log";

export type ApiEnvelope = {
  status: number;
  body: string;
};

export async function upApiRequest(
  method: string,
  path: string,
  options?: { query?: Record<string, string>; body?: unknown },
): Promise<ApiEnvelope> {
  const query =
    options?.query !== undefined
      ? new URLSearchParams(options.query).toString()
      : undefined;
  const body =
    options?.body !== undefined ? JSON.stringify(options.body) : undefined;

  const response = await invoke<ApiEnvelope>("up_api_request", {
    method,
    path,
    query: query && query.length > 0 ? query : null,
    body: body ?? null,
  });
  debugLog(`${method} ${path} -> ${response.status}`);
  return response;
}

export async function upApiValidateToken(token: string): Promise<ApiEnvelope> {
  return invoke<ApiEnvelope>("up_api_validate_token", { token });
}

export async function tokenSave(token: string): Promise<void> {
  await invoke("token_save", { token });
}

export async function tokenDelete(): Promise<void> {
  await invoke("token_delete");
}

export async function tokenExists(): Promise<boolean> {
  return invoke<boolean>("token_exists");
}

export async function upWebhookVerify(
  signatureHex: string,
  rawBody: string,
  secretKey: string,
): Promise<boolean> {
  return invoke<boolean>("up_webhook_verify", {
    signatureHex,
    rawBody,
    secretKey,
  });
}
