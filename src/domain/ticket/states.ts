/**
 * M6 — Ticket-state presentation mapping (minimal by charter; M8 owns
 * the Ticket-lifecycle deep module and will deepen this).
 *
 * Tone/word classes are the E:531–546 census verbatim, expressed in the
 * kit's §2.6 DotTone vocabulary so feed rows render through kit
 * primitives: shipped→emerald, failed→rose, review-ready→amber,
 * in-progress→stone-700, backlog→stone-400, else→stone-300.
 */
import type { DotTone } from "@/src/components/kit/run-state";
import type { TicketState } from "@/src/db/schema";

export const TICKET_STATES = [
  "triage",
  "backlog",
  "in-progress",
  "review-ready",
  "shipped",
  "failed",
  "declined",
] as const satisfies readonly TicketState[];

/** E:539–546 (stateDotE). */
export const TICKET_DOT_TONE: Record<TicketState, DotTone> = {
  shipped: "emerald",
  failed: "rose",
  "review-ready": "amber",
  "in-progress": "stone-strong",
  backlog: "stone",
  triage: "stone-soft",
  declined: "stone-soft",
};

/** E:531–537 (stateClassE) — the colored meta-line word. */
export const TICKET_WORD_CLASS: Record<TicketState, string> = {
  shipped: "text-emerald-600 font-medium",
  failed: "text-rose-600 font-medium",
  "review-ready": "text-amber-600 font-medium",
  "in-progress": "text-stone-700 font-medium",
  backlog: "text-stone-500",
  triage: "text-stone-500",
  declined: "text-stone-400",
};

/** display text — dashes read as spaces (E:277). */
export function ticketStateLabel(state: TicketState): string {
  return state.replace(/-/g, " ");
}
