/**
 * M13 — the plain-English Ticket-state mapping (charter item 4; PRD #43).
 *
 * ONE mapping module, exhaustive over the 9-state vocabulary — the
 * Collaborator never reads machine words ("review-ready"), they read
 * sentences. Copy ports variant-t-collab.tsx:76–84 verbatim for the
 * seven states T drew; the two M8 additions (approved / declined — T
 * predates them) are composed in the same voice.
 *
 * Dots: canon over variant (one-line rule, §1.1) — T:86–94 colored
 * in-progress amber-400 and needs-info sky-400; §4-M13 says "same
 * canon", so dots reuse the canonical TICKET_DOT_TONE map exactly
 * (in-progress = stone-strong per §1.1 state-idle; needs-info = sky-500
 * state-social, the M6 inbox fold). The typecheck keeps both Records
 * exhaustive when M14+ extends the enum.
 */
import type { TicketState } from "@/src/db/schema";

export { TICKET_DOT_TONE } from "@/src/domain/ticket/states";

/** T:76–84 — the sentence under each title. */
export const COLLAB_STATE_LABEL: Record<TicketState, string> = {
  triage: "Atlas is reviewing this",
  "needs-info": "Owner asked you a question",
  backlog: "On the backlog",
  approved: "Approved — queued for the Engine", // M8 state; T predates it
  "in-progress": "Engine is working on it",
  "review-ready": "Almost done — Owner is checking",
  shipped: "Shipped",
  failed: "Hit a snag — Owner is figuring it out",
  declined: "Owner decided not to take this on", // M8 state; T predates it
};

/** open = still wants attention from someone (T:96–98's isOpen, 9-state form). */
export function isCollabOpen(state: TicketState): boolean {
  return state !== "shipped" && state !== "declined";
}

/** the T filter chips (T:190–193), as real `?show=` values. */
export const COLLAB_FILTERS = ["everything", "open", "shipped", "waiting"] as const;
export type CollabFilter = (typeof COLLAB_FILTERS)[number];

export function matchesCollabFilter(filter: CollabFilter, state: TicketState): boolean {
  if (filter === "open") return isCollabOpen(state);
  if (filter === "shipped") return state === "shipped";
  if (filter === "waiting") return state === "needs-info";
  return true;
}
