/**
 * M6 — feed-event vocabulary: kinds, verbs, and §1.1 tone mapping.
 *
 * The kind enum is persisted in src/db/schema/feed-events.ts; this
 * module owns what each kind MEANS — the verb that composes the inbox
 * sentence ("Engine shipped T-249 — …", Z:232–253) and the semantic
 * tone for dots/words (§1.1: one color = one meaning; amber stays
 * scarce — only "needs you" kinds take it).
 */
import type { DotTone } from "@/src/components/kit/run-state";
import type { FeedEventKind } from "@/src/db/schema";

import type { RunState } from "../run/states";

export type { FeedEventKind };

/**
 * sentence vocabulary — `<actor> <WORD> [connector] <summary>` (Z:232–253
 * composes who · mono kind word · rest). The word is the mono chip; the
 * connector is plain prose ("Onkesh replied ON T-247").
 */
export const KIND_WORD: Record<FeedEventKind, string> = {
  filed: "filed",
  replied: "replied",
  moved: "moved",
  joined: "joined",
  dispatched: "dispatched",
  started: "started",
  "needs-input": "needs input",
  answered: "answered",
  "review-ready": "finished",
  shipped: "shipped",
  failed: "failed",
  cancelled: "cancelled",
  // M7 — Project-curation kinds (sentences: "you added acme-website — …",
  // "you pinned acme-website", "you edited acme-website context — added …").
  "project-created": "added",
  "project-pinned": "pinned",
  "project-unpinned": "unpinned",
  "context-edited": "edited",
};

export const KIND_CONNECTOR: Partial<Record<FeedEventKind, string>> = {
  replied: "on",
  "needs-input": "on",
};

/** §1.1 dot tone per kind (Z:90–96 adjusted to canon — sky-500 not sky-400). */
export const KIND_TONE: Record<FeedEventKind, DotTone> = {
  filed: "stone",
  replied: "sky",
  moved: "stone",
  joined: "sky",
  dispatched: "stone",
  started: "stone-strong",
  "needs-input": "amber",
  answered: "stone-strong",
  "review-ready": "amber",
  shipped: "emerald",
  failed: "rose",
  cancelled: "stone-soft",
  // M7 — curation is neutral bookkeeping; amber stays scarce (§1.1).
  "project-created": "stone",
  "project-pinned": "stone",
  "project-unpinned": "stone",
  "context-edited": "stone",
};

/** colored kind word in inbox sentences (Z:407–413 shape, canon palette). */
export const KIND_WORD_CLASS: Record<FeedEventKind, string> = {
  filed: "text-stone-700",
  replied: "text-sky-700",
  moved: "text-stone-700",
  joined: "text-sky-700",
  dispatched: "text-stone-700",
  started: "text-stone-700",
  "needs-input": "text-amber-700",
  answered: "text-stone-700",
  "review-ready": "text-amber-600",
  shipped: "text-emerald-700",
  failed: "text-rose-600",
  cancelled: "text-stone-400",
  // M7 — neutral curation words.
  "project-created": "text-stone-700",
  "project-pinned": "text-stone-700",
  "project-unpinned": "text-stone-700",
  "context-edited": "text-stone-700",
};

/** display text — dashes read as spaces. */
export function kindLabel(kind: FeedEventKind): string {
  return kind.replace(/-/g, " ");
}

/**
 * Which feed kind a Run transition emits. From-state matters once:
 * needs-input → running is "answered", not "started".
 */
export function transitionFeedKind(from: RunState, to: RunState): FeedEventKind {
  if (to === "running") return from === "needs-input" ? "answered" : "started";
  switch (to) {
    case "needs-input":
      return "needs-input";
    case "review-ready":
      return "review-ready";
    case "shipped":
      return "shipped";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      // queued is never a transition TARGET (runs are created queued).
      return "dispatched";
  }
}
