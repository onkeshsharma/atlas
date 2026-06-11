/**
 * M8 — Category derivation (CONTEXT.md: the board's five derived
 * lifecycle groups — Triage · Backlog · Active · Review · Closed).
 *
 * Category is a DERIVED property of `tickets.state` (Linear's two-level
 * model, carried from v1 CONTEXT): the board renders one column per
 * Category; the raw state stays the canonical column and surfaces on
 * each card as its §2.6 state dot. Pure functions — no storage here.
 *
 * Column header dot classes are variant G's verbatim (G:58–62);
 * the charter's "G verbatim" rule governs the board chrome.
 */
import type { TicketState } from "@/src/db/schema";

import { TICKET_STATES } from "./states";

export const CATEGORIES = ["triage", "backlog", "active", "review", "closed"] as const;

export type Category = (typeof CATEGORIES)[number];

/** state → its board Category. Exhaustive over the 9-state vocabulary. */
export const STATE_CATEGORY: Record<TicketState, Category> = {
  triage: "triage",
  "needs-info": "triage", // still a triage conversation — waiting on the reporter
  backlog: "backlog",
  approved: "active", // ready to dispatch — the Active queue (v1's ready-for-agent slot)
  "in-progress": "active",
  "review-ready": "review",
  shipped: "closed",
  failed: "closed", // G:62 files failed under Closed
  declined: "closed",
};

export function ticketCategory(state: TicketState): Category {
  return STATE_CATEGORY[state];
}

/** the states a Category's column collects, in TICKET_STATES order. */
export function categoryStates(category: Category): TicketState[] {
  return TICKET_STATES.filter((s) => STATE_CATEGORY[s] === category);
}

/** G:52–63 — the board's column recipe (label + verbatim header dot class). */
export const CATEGORY_COLUMNS: ReadonlyArray<{
  key: Category;
  label: string;
  dot: string;
}> = [
  { key: "triage", label: "Triage", dot: "bg-sky-400" },
  { key: "backlog", label: "Backlog", dot: "bg-stone-400" },
  { key: "active", label: "Active", dot: "bg-amber-400" },
  { key: "review", label: "Review", dot: "bg-amber-500" },
  { key: "closed", label: "Closed", dot: "bg-emerald-400" },
];

/** capitalized display label ("Triage"). */
export function categoryLabel(category: Category): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}
