// API base URL. Defaults to the local server; override via VITE_API_URL for
// deployed/preview environments (QAWolf runs against whatever URL this points at).
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export interface AppState {
  counter: number;
  lastAction: string;
}

type HttpMethod = "GET" | "POST";

// Thrown by call() for a failed request. Carries the request details as fields
// so callers can report them (e.g. on the demo-action-failed Track Event)
// without parsing the message. status is undefined when no response arrived.
export class ApiError extends Error {
  readonly method: HttpMethod;
  readonly path: string;
  readonly status?: number;

  constructor(message: string, method: HttpMethod, path: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.method = method;
    this.path = path;
    this.status = status;
  }
}

async function call(path: string, method: HttpMethod): Promise<AppState> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method });
  } catch (e) {
    // fetch rejects when no response arrives at all: API unreachable, wrong
    // VITE_API_URL, or blocked by CORS_ORIGIN. Keep the browser's message.
    throw new ApiError((e as Error).message, method, path);
  }
  if (!res.ok) {
    throw new ApiError(`${method} ${path} failed: ${res.status}`, method, path, res.status);
  }
  return res.json() as Promise<AppState>;
}

export const api = {
  getState: () => call("/api/state", "GET"),
  increment: () => call("/api/increment", "POST"),
  decrement: () => call("/api/decrement", "POST"),
  reset: () => call("/api/reset", "POST"),
};
