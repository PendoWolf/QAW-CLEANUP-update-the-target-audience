// API base URL. Defaults to the local server; override via VITE_API_URL for
// deployed/preview environments (QAWolf runs against whatever URL this points at).
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export interface AppState {
  counter: number;
  lastAction: string;
}

// A failed API request, with its details as fields so callers (e.g. the
// demo-action-failed Track Event) don't have to parse them out of the message.
// status is undefined when no HTTP response arrived (a network failure).
export class ApiError extends Error {
  readonly method: string;
  readonly path: string;
  readonly status?: number;

  constructor(message: string, method: string, path: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.method = method;
    this.path = path;
    this.status = status;
  }
}

async function call(path: string, method: "GET" | "POST"): Promise<AppState> {
  const res = await fetch(`${BASE}${path}`, { method }).catch((e: unknown) => {
    // Network failure: fetch rejects (a TypeError) before there is any HTTP status.
    throw new ApiError((e as Error).message, method, path);
  });
  if (!res.ok) throw new ApiError(`${method} ${path} failed: ${res.status}`, method, path, res.status);
  return res.json() as Promise<AppState>;
}

export const api = {
  getState: () => call("/api/state", "GET"),
  increment: () => call("/api/increment", "POST"),
  decrement: () => call("/api/decrement", "POST"),
  reset: () => call("/api/reset", "POST"),
};
