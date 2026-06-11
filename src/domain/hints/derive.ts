/**
 * M8 — Hints engine (pure derivation; PRD heavy-investment module).
 *
 * Derives Sequence Hints (per-card: parallel-safe-with / recommended-after
 * / blocked-by — PRD #15) and Ship Groups (review column: independent /
 * sequenced / blocked — PRD #26) from two signals:
 *
 *   1. declared blocks/blocked-by edges (ticket_links — the HARD signal);
 *   2. per-ticket file sets (the SOFT signal). The `fileSets` parameter is
 *      typed NOW and fed from whatever knowledge exists — enrichment
 *      `likelyFiles` today, real per-Run diffs when M9 supplies them.
 *      Pass an empty map until then: the engine only makes soft claims
 *      about pairs where BOTH sides are known — unknown file sets produce
 *      no parallel-safe/sequenced claims (hints never bluff).
 *
 * Pure functions over plain inputs — no storage, no IO. Color/label
 * vocabulary matches v1 CONTEXT + the kit's SequenceHint type:
 *   🟢 parallel-safe (disjoint known file sets) · 🟡 recommended-after /
 *   sequenced (overlapping known file sets) · 🔴 blocked-by / blocked
 *   (open declared edge).
 */
import type { TicketState } from "@/src/db/schema";

export type HintTicket = {
  id: string;
  /** display ref — "T-247". */
  ref: string;
  state: TicketState;
};

export type TicketEdge = { blockerId: string; blockedId: string };

/** ticketId → files the ticket's change touches (known knowledge only). */
export type FileSets = ReadonlyMap<string, readonly string[]>;

export type SequenceHintKind = "parallel-safe-with" | "recommended-after" | "blocked-by";

export type DerivedHint = {
  kind: SequenceHintKind;
  /** the OTHER ticket's ref — "T-247". */
  otherRef: string;
};

export type ShipGroupKind = "independent" | "sequenced" | "blocked";

export type ShipGroup = {
  kind: ShipGroupKind;
  /** member ticket ids, in input order. */
  ticketIds: string[];
};

export type HintsInput = {
  tickets: readonly HintTicket[];
  edges: readonly TicketEdge[];
  fileSets: FileSets;
};

export type HintsOutput = {
  /** at most ONE hint per card (G renders a single hint line) — hard beats soft. */
  hints: ReadonlyMap<string, DerivedHint>;
  /** review-column clustering over review-ready tickets. */
  shipGroups: readonly ShipGroup[];
};

/** a blocker still blocks unless its work landed (shipped) or it will never land (declined). */
const RESOLVED_BLOCKER_STATES: readonly TicketState[] = ["shipped", "declined"];

/** soft hints only advise states where dispatch order is still a live question. */
const SOFT_HINT_STATES: readonly TicketState[] = [
  "backlog",
  "approved",
  "in-progress",
  "review-ready",
];

function refNumber(ref: string): number {
  const n = Number(ref.replace(/^\D+/, ""));
  return Number.isFinite(n) ? n : 0;
}

function overlap(a: readonly string[], b: readonly string[]): string[] {
  const set = new Set(a);
  return b.filter((f) => set.has(f));
}

export function deriveHints(input: HintsInput): HintsOutput {
  const byId = new Map(input.tickets.map((t) => [t.id, t]));

  // ── hard signal: open declared edges ──────────────────────────────
  const openEdges = input.edges.filter((e) => {
    const blocker = byId.get(e.blockerId);
    const blocked = byId.get(e.blockedId);
    return (
      blocker !== undefined &&
      blocked !== undefined &&
      !RESOLVED_BLOCKER_STATES.includes(blocker.state)
    );
  });
  const blockedBy = new Map<string, HintTicket>(); // blocked id → its (first) open blocker
  for (const e of openEdges) {
    if (!blockedBy.has(e.blockedId)) blockedBy.set(e.blockedId, byId.get(e.blockerId)!);
  }

  // ── soft signal: pairwise file-set knowledge ──────────────────────
  const soft = input.tickets.filter(
    (t) => SOFT_HINT_STATES.includes(t.state) && input.fileSets.has(t.id),
  );
  const overlapsWith = new Map<string, HintTicket>(); // later id → earlier overlapping ticket
  const disjointWith = new Map<string, HintTicket>(); // id → nearest known-disjoint peer
  for (let i = 0; i < soft.length; i++) {
    for (let j = i + 1; j < soft.length; j++) {
      const [a, b] = [soft[i], soft[j]];
      const shared = overlap(input.fileSets.get(a.id)!, input.fileSets.get(b.id)!);
      const [earlier, later] =
        refNumber(a.ref) <= refNumber(b.ref) ? [a, b] : [b, a];
      if (shared.length > 0) {
        // overlapping file sets — cleanest sequencing is earlier first.
        if (!overlapsWith.has(later.id)) overlapsWith.set(later.id, earlier);
      } else {
        if (!disjointWith.has(a.id)) disjointWith.set(a.id, b);
        if (!disjointWith.has(b.id)) disjointWith.set(b.id, a);
      }
    }
  }

  // ── per-card hints: blocked-by > recommended-after > parallel-safe ──
  const hints = new Map<string, DerivedHint>();
  for (const t of input.tickets) {
    const blocker = blockedBy.get(t.id);
    if (blocker) {
      hints.set(t.id, { kind: "blocked-by", otherRef: blocker.ref });
      continue;
    }
    const after = overlapsWith.get(t.id);
    if (after) {
      hints.set(t.id, { kind: "recommended-after", otherRef: after.ref });
      continue;
    }
    const peer = disjointWith.get(t.id);
    if (peer) hints.set(t.id, { kind: "parallel-safe-with", otherRef: peer.ref });
  }

  // ── Ship Groups over review-ready tickets (PRD #26) ───────────────
  const review = input.tickets.filter((t) => t.state === "review-ready");
  const shipGroups: ShipGroup[] = [];

  const blocked = review.filter((t) => blockedBy.has(t.id));
  if (blocked.length) {
    shipGroups.push({ kind: "blocked", ticketIds: blocked.map((t) => t.id) });
  }

  // sequenced: review tickets chained by known overlap (either direction).
  const unblocked = review.filter((t) => !blockedBy.has(t.id));
  const sequencedIds = new Set<string>();
  for (let i = 0; i < unblocked.length; i++) {
    for (let j = i + 1; j < unblocked.length; j++) {
      const [a, b] = [unblocked[i], unblocked[j]];
      if (!input.fileSets.has(a.id) || !input.fileSets.has(b.id)) continue;
      if (overlap(input.fileSets.get(a.id)!, input.fileSets.get(b.id)!).length > 0) {
        sequencedIds.add(a.id);
        sequencedIds.add(b.id);
      }
    }
  }
  if (sequencedIds.size) {
    shipGroups.push({
      kind: "sequenced",
      ticketIds: unblocked.filter((t) => sequencedIds.has(t.id)).map((t) => t.id),
    });
  }

  // independent: ≥2 unblocked review tickets, ALL pairwise known-disjoint.
  const independent = unblocked.filter(
    (t) => !sequencedIds.has(t.id) && input.fileSets.has(t.id),
  );
  if (independent.length >= 2) {
    shipGroups.push({ kind: "independent", ticketIds: independent.map((t) => t.id) });
  }

  return { hints, shipGroups };
}
