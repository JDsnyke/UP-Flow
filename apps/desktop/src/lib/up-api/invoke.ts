import { invoke } from "@tauri-apps/api/core";

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

  return invoke<ApiEnvelope>("up_api_request", {
    method,
    path,
    query: query && query.length > 0 ? query : null,
    body: body ?? null,
  });
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
