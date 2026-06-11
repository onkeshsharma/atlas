/**
 * M6 → M8 — Ticket-state vocabulary + presentation mapping.
 *
 * M8's lifecycle deep module owns this list (charter §2). The two states
 * M8 added to the E:531–546 census:
 * - "needs-info" — waiting on the reporter (triage I's third action).
 *   Tone is SKY per canon §1.1 state-social: the ticket is back in the
 *   reporter conversation, same family as `replied`/`joined`.
 * - "approved" — Owner approved, ready to dispatch. Tone stone-400 per
 *   §1.1 state-idle (queued things are stone-400; amber stays scarce —
 *   only needs-input + review-ready own "needs you").
 *
 * Tone/word classes otherwise follow the E:531–546 census verbatim in
 * the kit's §2.6 DotTone vocabulary.
 */
import type { DotTone } from "@/src/components/kit/run-state";
import type { TicketState } from "@/src/db/schema";

export const TICKET_STATES = [
  "triage",
  "needs-info",
  "backlog",
  "approved",
  "in-progress",
  "review-ready",
  "shipped",
  "failed",
  "declined",
] as const satisfies readonly TicketState[];

/** E:539–546 (stateDotE) + the two M8 additions (header comment). */
export const TICKET_DOT_TONE: Record<TicketState, DotTone> = {
  shipped: "emerald",
  failed: "rose",
  "review-ready": "amber",
  "in-progress": "stone-strong",
  approved: "stone",
  backlog: "stone",
  triage: "stone-soft",
  "needs-info": "sky",
  declined: "stone-soft",
};

/** E:531–537 (stateClassE) — the colored meta-line word. */
export const TICKET_WORD_CLASS: Record<TicketState, string> = {
  shipped: "text-emerald-600 font-medium",
  failed: "text-rose-600 font-medium",
  "review-ready": "text-amber-600 font-medium",
  "in-progress": "text-stone-700 font-medium",
  approved: "text-stone-500",
  backlog: "text-stone-500",
  triage: "text-stone-500",
  "needs-info": "text-sky-700",
  declined: "text-stone-400",
};

/** display text — dashes read as spaces (E:277). */
export function ticketStateLabel(state: TicketState): string {
  return state.replace(/-/g, " ");
}

export function isTicketState(value: unknown): value is TicketState {
  return typeof value === "string" && (TICKET_STATES as readonly string[]).includes(value);
}

/** open = any state that still wants work (cockpit "7 open", board's stuck insight). */
export const OPEN_TICKET_STATES = [
  "triage",
  "needs-info",
  "backlog",
  "approved",
  "in-progress",
  "review-ready",
  "failed",
] as const satisfies readonly TicketState[];
