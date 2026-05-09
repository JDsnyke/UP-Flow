export function debugLog(message: string, context?: unknown) {
  if (!import.meta.env.DEV) {
    return;
  }
  console.debug(`[up-flow] ${message}`, context ?? "");
}
