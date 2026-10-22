// API base URL. Defaults to the local server; override via VITE_API_URL for
// deployed/preview environments (QAWolf runs against whatever URL this points at).
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export interface AppState {
  counter: number;
  lastAction: string;
}

// Thrown by call() for a non-OK response so callers can read the HTTP status.
// Network failures reject with fetch's own TypeError instead, which has none.
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function call(path: string, method: "GET" | "POST"): Promise<AppState> {
  const res = await fetch(`${BASE}${path}`, { method });
  if (!res.ok) throw new ApiError(`${method} ${path} failed: ${res.status}`, res.status);
  return res.json() as Promise<AppState>;
}

export const api = {
  getState: () => call("/api/state", "GET"),
  increment: () => call("/api/increment", "POST"),
  decrement: () => call("/api/decrement", "POST"),
  reset: () => call("/api/reset", "POST"),
};
