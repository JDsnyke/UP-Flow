import type { ApiEnvelope } from "./invoke";
import type { UpErrorPayload } from "./types";

export class UpApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string, message: string) {
    super(message);
    this.name = "UpApiError";
    this.status = status;
    this.body = body;
  }
}

function formatErrorBody(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as UpErrorPayload;
    if (parsed.errors?.length) {
      return parsed.errors
        .map((e) => {
          const msg = e.detail ?? e.title ?? "Unknown error";
          const param = e.source?.parameter;
          return param ? `${msg} (parameter: ${param})` : msg;
        })
        .join("; ");
    }
  } catch {
    /* ignore */
  }
  if (status === 401) {
    return "Not authorized — check your Personal Access Token.";
  }
  if (status === 429) {
    return "Rate limited — wait and try again (exponential backoff recommended).";
  }
  if (status === 422) {
    return "Validation failed — check request fields and filters.";
  }
  if (status >= 500) {
    return "Up API is temporarily unavailable. Please retry shortly.";
  }
  return body.slice(0, 500) || `HTTP ${status}`;
}

export function parseUpJson<T>(res: ApiEnvelope): T {
  if (res.status >= 200 && res.status < 300) {
    return JSON.parse(res.body) as T;
  }
  throw new UpApiError(
    res.status,
    res.body,
    formatErrorBody(res.status, res.body),
  );
}

/** Up pagination links are absolute URLs; Rust client expects path + query under /api/v1. */
export function splitUpPaginationUrl(fullUrl: string): {
  path: string;
  query: string | undefined;
} {
  const marker = "/api/v1";
  const i = fullUrl.indexOf(marker);
  if (i === -1) {
    throw new Error("Unexpected pagination URL from Up API");
  }
  const rest = fullUrl.slice(i + marker.length);
  const q = rest.indexOf("?");
  if (q === -1) {
    return { path: rest || "/", query: undefined };
  }
  return {
    path: rest.slice(0, q) || "/",
    query: rest.slice(q + 1),
  };
}
