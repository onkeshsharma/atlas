/**
 * Kit — Run-state vocabulary (logic only, no markup).
 *
 * Canon §3.3 live-state table (incl. the 2026-06-11 grill amendments) +
 * §1.1 semantic color mapping + ledger E10. Census source:
 * design/variants/variant-e-editorial-feed-first.tsx:531–546.
 *
 * One color = one meaning (§1.1): amber is never success; emerald is
 * never brand. `running` renders stone-700 — NOT amber — so that
 * needs-input + review-ready own "needs you" (E10).
 */

export type RunState =
  | "queued"
  | "running"
  | "needs-input"
  | "review-ready"
  | "shipped"
  | "failed"
  | "cancelled";

/**
 * Where a state indicator is rendered. §3.3:
 * - "live"  — Today active strip, run page: running gets a LivePulse.
 * - "list"  — historical/divided lists: running is static stone-700 (E10).
 * - "board" — the kanban (review grill 2026-06-11): board liveness is
 *   cards moving via live data, not pulsing chrome; needs-input keeps
 *   its motion monopoly there too.
 */
export type StateContext = "live" | "list" | "board";

/** §2.6 / §1.1 dot fills the kit sanctions (one class per meaning). */
export type DotTone =
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "sky"
  | "stone-strong" // stone-700 — in progress
  | "stone" //        stone-400 — queued / backlog / idle nav
  | "stone-soft"; //  stone-300 — cancelled / pending

export const DOT_TONE_CLASS: Record<DotTone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  sky: "bg-sky-500",
  "stone-strong": "bg-stone-700",
  stone: "bg-stone-400",
  "stone-soft": "bg-stone-300",
};

/** §3.3 — Run state → dot tone. */
export function runStateDotTone(state: RunState): DotTone {
  switch (state) {
    case "queued":
      return "stone";
    case "running":
      return "stone-strong";
    case "needs-input":
    case "review-ready":
      return "amber";
    case "shipped":
      return "emerald";
    case "failed":
      return "rose";
    case "cancelled":
      return "stone-soft";
  }
}

/** §3.3 — Run state → mono/meta label text classes. */
export function runStateLabelClass(state: RunState): string {
  switch (state) {
    case "queued":
      return "text-stone-500";
    case "running":
      return "text-stone-700";
    case "needs-input":
      return "text-amber-700 font-medium";
    case "review-ready":
      return "text-amber-600 font-medium";
    case "shipped":
      return "text-emerald-600 font-medium";
    case "failed":
      return "text-rose-600 font-medium";
    case "cancelled":
      return "text-stone-400";
  }
}

/** Display text — dashes read as spaces ("needs-input" → "needs input"). */
export function runStateLabelText(state: RunState): string {
  return state.replace(/-/g, " ");
}

/**
 * §3.3 pulse column. needs-input is THE only amber pulse in any list
 * and outranks everything — it pulses in every context. running pulses
 * only in live contexts (E10 + kanban-calm rule). Everything else is
 * static (page-level rose outage badges are page chrome, not state
 * indicators — ZZ:32 stays a surface concern).
 */
export function runStatePulses(state: RunState, context: StateContext): boolean {
  if (state === "needs-input") return true;
  if (state === "running") return context === "live";
  return false;
}
