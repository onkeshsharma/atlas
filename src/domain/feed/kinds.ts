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
  linked: "linked", // M8 — a blocks/blocked-by edge was declared (PRD #16)
  // M9 — Helper-Run deliverables ("Engine enriched T-302 — …",
  // "Engine drafted Brief for T-247 — …", "Engine ingested acme-website — …").
  enriched: "enriched",
  "brief-drafted": "drafted",
  ingested: "ingested",
  // M9 Session B — the approve-and-ship click ("you approved R-501 — …";
  // `shipped` is the emerald word and lands when the merge does).
  "ship-requested": "approved",
  // M10 — Bridge governance ("you paired onkesh-desktop", "you asked
  // doctor on onkesh-desktop", "Bridge reported doctor on … — 6 passed").
  "bridge-paired": "paired",
  "bridge-revoked": "revoked",
  "doctor-requested": "asked",
  "doctor-completed": "reported",
  // M11 — People & access ("you invited dev@acme.io — …", "you added ada
  // to acme-website", "you removed sam from acme-website", "ada declined
  // your invite", "you changed display name — …"). `joined` stays the
  // acceptance word (M6).
  invited: "invited",
  "invite-revoked": "withdrew",
  "invite-declined": "declined",
  "member-added": "added",
  "member-removed": "removed",
  "profile-changed": "changed",
  "project-linked": "linked", // M18 — clone resolved; §1.1 bookkeeping
  "consult-requested": "consulting", // ADR-0007 Phase 2 — command row, not user-facing
};

export const KIND_CONNECTOR: Partial<Record<FeedEventKind, string>> = {
  replied: "on",
  "needs-input": "on",
  "brief-drafted": "Brief for", // M9 — "Engine drafted Brief for T-247 — …"
  // M11 — "you withdrew the invite for dev@…", "ada declined the invite".
  "invite-revoked": "the invite for",
  "invite-declined": "the invite for",
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
  linked: "stone", // M8 — bookkeeping about ordering — neutral
  // M9 — deliverable bookkeeping; no code moved, amber stays scarce (§1.1).
  enriched: "stone",
  "brief-drafted": "stone",
  ingested: "stone",
  // Session B — the click is bookkeeping; emerald is reserved for the
  // landing itself (§1.1: did code move? emerald. did a record update? not).
  "ship-requested": "stone",
  // M10 — governance bookkeeping; amber stays scarce, emerald is code's.
  "bridge-paired": "stone",
  "bridge-revoked": "stone",
  "doctor-requested": "stone",
  "doctor-completed": "stone",
  // M11 — §1.1 state-social: invites + circle changes are sky (the
  // `joined` precedent); removals are destructive → rose (TT:144–148's
  // "danger" family); declines/withdrawals + profile edits are neutral.
  invited: "sky",
  "invite-revoked": "stone",
  "invite-declined": "stone-soft",
  "member-added": "sky",
  "member-removed": "rose",
  "profile-changed": "stone",
  "project-linked": "stone", // M18 — bookkeeping — neutral
  "consult-requested": "stone", // ADR-0007 Phase 2 — command row
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
  linked: "text-stone-700", // M8
  // M9 — neutral deliverable words.
  enriched: "text-stone-700",
  "brief-drafted": "text-stone-700",
  ingested: "text-stone-700",
  "ship-requested": "text-stone-700", // Session B
  // M10 — neutral governance words.
  "bridge-paired": "text-stone-700",
  "bridge-revoked": "text-stone-700",
  "doctor-requested": "text-stone-700",
  "doctor-completed": "text-stone-700",
  // M11 — sky for circle growth (the `joined` precedent), rose for
  // removals, neutral elsewhere (§1.1 tone map).
  invited: "text-sky-700",
  "invite-revoked": "text-stone-700",
  "invite-declined": "text-stone-400",
  "member-added": "text-sky-700",
  "member-removed": "text-rose-600",
  "profile-changed": "text-stone-700",
  "project-linked": "text-stone-700", // M18
  "consult-requested": "text-stone-700", // ADR-0007 Phase 2 — command row
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
