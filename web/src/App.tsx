import { useEffect, useState } from "react";
import { api, ApiError, type AppState } from "./api";

type Action = "load" | "increment" | "decrement" | "reset" | "refresh";
// Pendo matches Track Event names exactly (case-sensitive), so these must not change.
type TrackEventName = `demo-${Action}` | "demo-action-failed";
type TrackProps = Record<string, string | number | boolean | undefined>;

// Seam for Pendo. Novus installs the Pendo agent, which provides window.pendo
// at runtime; this fires a Track Event for each action. No-op when the agent
// isn't present (local dev), so the app and Playwright mocks both stay simple.
function trackEvent(name: TrackEventName, props: TrackProps) {
  if (typeof window !== "undefined") {
    try {
      window.pendo?.track?.(name, props);
    } catch (err) {
      // Analytics must never break the app, or make run() report a successful action as failed.
      console.warn(`Pendo track "${name}" failed`, err);
    }
  }
}

// Properties for each action's demo-<action> event, built from the state that
// was on screen when the action started (prev) and the server's response (next).
const successProps: Record<Action, (prev: AppState, next: AppState) => TrackProps> = {
  load: (_prev, next) => ({ counter: next.counter, lastAction: next.lastAction }),
  increment: (prev, next) => ({ counter: next.counter, previousCounter: prev.counter }),
  decrement: (prev, next) => ({ counter: next.counter, previousCounter: prev.counter }),
  // The result is always 0, so record what was wiped instead.
  reset: (prev) => ({ previousCounter: prev.counter, previousLastAction: prev.lastAction }),
  // Server state is shared by every session, so a refresh can reveal changes made elsewhere.
  refresh: (prev, next) => ({
    counter: next.counter,
    lastAction: next.lastAction,
    previousCounter: prev.counter,
    stateChanged: next.counter !== prev.counter || next.lastAction !== prev.lastAction,
  }),
};

// Module scope rather than a ref: StrictMode runs mount effects twice in
// development, and this keeps the initial load (and its demo-load or
// demo-action-failed event) to once per page load.
let initialLoadStarted = false;

export default function App() {
  const [state, setState] = useState<AppState>({ counter: 0, lastAction: "none" });
  const [error, setError] = useState<string | null>(null);

  const run = async (action: Action, fn: () => Promise<AppState>) => {
    try {
      setError(null);
      const next = await fn();
      setState(next);
      // `state` is this render's value, i.e. what was on screen when the action started.
      trackEvent(`demo-${action}`, successProps[action](state, next));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      trackEvent("demo-action-failed", {
        action,
        errorMessage: message.slice(0, 100), // stay well under Pendo's 512-byte property limit
        // httpStatus is undefined for network failures, where no response arrived.
        ...(e instanceof ApiError ? { method: e.method, path: e.path, httpStatus: e.status } : {}),
      });
    }
  };

  useEffect(() => {
    if (initialLoadStarted) return;
    initialLoadStarted = true;
    run("load", api.getState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "4rem auto", textAlign: "center" }}>
      <h1>QAWolf Demo</h1>

      <p data-testid="counter-value" style={{ fontSize: "3rem", margin: "1rem 0" }}>
        {state.counter}
      </p>
      <p data-testid="last-action" style={{ color: "#666" }}>
        Last action: {state.lastAction}
      </p>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button data-testid="btn-increment" onClick={() => run("increment", api.increment)}>
          Increment
        </button>
        <button data-testid="btn-decrement" onClick={() => run("decrement", api.decrement)}>
          Decrement
        </button>
        <button data-testid="btn-reset" onClick={() => run("reset", api.reset)}>
          Reset
        </button>
        <button data-testid="btn-refresh" onClick={() => run("refresh", api.getState)}>
          Refresh
        </button>
      </div>

      {error && (
        <p data-testid="error" style={{ color: "crimson", marginTop: 16 }}>
          {error}
        </p>
      )}
    </main>
  );
}
