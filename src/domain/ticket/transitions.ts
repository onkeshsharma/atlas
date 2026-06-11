/**
 * M8 — Ticket lifecycle state machine (pure domain; PRD heavy-investment
 * module). Sibling of src/domain/run/states.ts — same table-driven shape.
 *
 * THE source of truth for legal Ticket transitions. Persistence mirrors
 * the vocabulary (src/db/schema/tickets.ts pg enum); the board's Category
 * columns derive from it (./categories.ts); every actual write goes
 * through ./mutations.ts (THE OUTBOX RULE).
 */
import type { TicketState } from "@/src/db/schema";

/**
 * The legal-transition table. Read as: FROM → may become any of TO[].
 *
 * - triage: the four I-variant decisions — approve (→ approved), approve
 *   & backlog, ask the reporter (→ needs-info), decline.
 * - needs-info: the reporter answered (→ triage for a fresh decision) or
 *   the Owner decides late without the answer.
 * - backlog: pulled forward (→ approved, PRD #14's inverse) or declined.
 * - approved: deferred back to backlog (PRD #14), dispatched (→
 *   in-progress — M9 wires the dispatch that drives this), or declined.
 * - in-progress: the Run's outcome — review-ready | failed; a cancelled
 *   Run returns the ticket to approved (still ready, nothing landed).
 * - review-ready: ships (M9), fails at the merge (Conflict territory),
 *   or is sent back for another pass (→ in-progress).
 * - failed: retry path — re-approve, park, or give up.
 * - shipped / declined are terminal: the record is closed. (Re-opening
 *   is filing a new Ticket — the durable record stays honest.)
 */
export const TICKET_TRANSITIONS: Record<TicketState, readonly TicketState[]> = {
  triage: ["approved", "backlog", "needs-info", "declined"],
  "needs-info": ["triage", "approved", "backlog", "declined"],
  backlog: ["approved", "declined"],
  approved: ["backlog", "in-progress", "declined"],
  "in-progress": ["review-ready", "failed", "approved"],
  "review-ready": ["shipped", "failed", "in-progress"],
  failed: ["approved", "backlog", "declined"],
  shipped: [],
  declined: [],
};

export const TERMINAL_TICKET_STATES = ["shipped", "declined"] as const satisfies readonly TicketState[];

export function isTicketTerminal(state: TicketState): boolean {
  return (TERMINAL_TICKET_STATES as readonly TicketState[]).includes(state);
}

export function canTicketTransition(from: TicketState, to: TicketState): boolean {
  return TICKET_TRANSITIONS[from].includes(to);
}

export type TicketTransitionResult =
  | { ok: true; from: TicketState; to: TicketState }
  | { ok: false; from: TicketState; to: TicketState; reason: string };

/** Validate a transition without touching storage (table-driven tests cover all 81 pairs). */
export function ticketTransition(from: TicketState, to: TicketState): TicketTransitionResult {
  if (canTicketTransition(from, to)) return { ok: true, from, to };
  return {
    ok: false,
    from,
    to,
    reason: isTicketTerminal(from)
      ? `"${from}" is terminal — no transitions leave it`
      : `"${from}" → "${to}" is not a legal Ticket transition`,
  };
}

/**
 * The Owner-facing moves each state offers OUTSIDE the triage flow and
 * outside M9's dispatch/ship pipeline — the detail page's quiet move
 * links (PRD #14). Dispatch (approved → in-progress), run outcomes and
 * ship/fail are deliberately absent: those happen through Runs (M9),
 * never through a bare move link.
 */
export const OWNER_MOVES: Partial<Record<TicketState, ReadonlyArray<{ to: TicketState; label: string }>>> = {
  "needs-info": [{ to: "triage", label: "return to triage" }],
  backlog: [
    { to: "approved", label: "mark ready" },
    { to: "declined", label: "decline" },
  ],
  approved: [
    { to: "backlog", label: "move to backlog" },
    { to: "declined", label: "decline" },
  ],
  failed: [
    { to: "approved", label: "mark ready again" },
    { to: "backlog", label: "move to backlog" },
    { to: "declined", label: "decline" },
  ],
};
