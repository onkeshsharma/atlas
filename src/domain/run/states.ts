/**
 * M6 — Run state machine (pure domain; PRD heavy-investment module).
 *
 * THE source of truth for Run states and legal transitions. The kit's
 * `src/components/kit/run-state.ts` is presentation-only and types on
 * this vocabulary; persistence (`src/db/schema/runs.ts` pg enum) mirrors
 * it; the live seam (`src/domain/live`) carries it over the wire.
 *
 * PRD: `queued → running → needs-input → review-ready | shipped |
 * failed | cancelled`. Needs Input is a first-class state carrying the
 * Engine's question payload and the Owner's answer
 * (src/domain/run/needs-input.ts).
 */

export const RUN_STATES = [
  "queued",
  "running",
  "needs-input",
  "review-ready",
  "shipped",
  "failed",
  "cancelled",
] as const;

export type RunState = (typeof RUN_STATES)[number];

/**
 * The legal-transition table. Read as: FROM → may become any of TO[].
 *
 * - queued may start (→ running) or be withdrawn (→ cancelled).
 * - running may block on a question, finish into review, fail, or be
 *   cancelled from the cockpit (PRD #4).
 * - needs-input resumes to running when answered (PRD #3) or is
 *   cancelled; it never jumps straight to a terminal result — the
 *   Engine always runs again after an answer.
 * - review-ready ships (the Owner approves), fails (merge/ship error —
 *   Conflict territory), or is cancelled (the Owner declines the result).
 * - shipped / failed / cancelled are terminal.
 */
export const LEGAL_TRANSITIONS: Record<RunState, readonly RunState[]> = {
  queued: ["running", "cancelled"],
  running: ["needs-input", "review-ready", "failed", "cancelled"],
  "needs-input": ["running", "cancelled"],
  "review-ready": ["shipped", "failed", "cancelled"],
  shipped: [],
  failed: [],
  cancelled: [],
};

export const TERMINAL_STATES = ["shipped", "failed", "cancelled"] as const satisfies readonly RunState[];

export function isRunState(value: unknown): value is RunState {
  return typeof value === "string" && (RUN_STATES as readonly string[]).includes(value);
}

export function isTerminal(state: RunState): boolean {
  return (TERMINAL_STATES as readonly RunState[]).includes(state);
}

export function canTransition(from: RunState, to: RunState): boolean {
  return LEGAL_TRANSITIONS[from].includes(to);
}

export type TransitionResult =
  | { ok: true; from: RunState; to: RunState }
  | { ok: false; from: RunState; to: RunState; reason: string };

/** Validate a transition without touching storage (table-driven tests cover all 49 pairs). */
export function transition(from: RunState, to: RunState): TransitionResult {
  if (canTransition(from, to)) return { ok: true, from, to };
  return {
    ok: false,
    from,
    to,
    reason: isTerminal(from)
      ? `"${from}" is terminal — no transitions leave it`
      : `"${from}" → "${to}" is not a legal Run transition`,
  };
}

/** Active = the cockpit's "live now" strip (queued, running, needs-input). */
export const ACTIVE_STATES = ["queued", "running", "needs-input"] as const satisfies readonly RunState[];
