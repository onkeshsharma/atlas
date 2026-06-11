/**
 * The scheduler — a pure decision function (PRD #8 cap + PRD #21 lanes).
 *
 * Rules, in order:
 *  1. Never exceed the cap: starts = max(0, cap - running).
 *  2. Owner runs ALWAYS go first — a Helper Run starts only when no
 *     Owner Run is still waiting ahead of it (helpers yield the queue,
 *     not just the tiebreak).
 *  3. Within a lane: queue_position ascending (nulls last), then ref
 *     for determinism.
 *
 * No preemption in v2.0: a helper already running keeps its slot when
 * an owner run arrives (recorded in notes/M9A-handoff.md).
 */

export type SchedulableRun = {
  runId: string;
  lane: "owner" | "helper";
  queuePosition: number | null;
  ref: string;
};

export function nextToStart(args: {
  cap: number;
  runningCount: number;
  queued: SchedulableRun[];
}): SchedulableRun[] {
  const capacity = Math.max(0, Math.floor(args.cap) - args.runningCount);
  if (capacity === 0 || args.queued.length === 0) return [];

  const byLane = (lane: "owner" | "helper") =>
    args.queued
      .filter((r) => r.lane === lane)
      .sort((a, b) => {
        const pa = a.queuePosition ?? Number.MAX_SAFE_INTEGER;
        const pb = b.queuePosition ?? Number.MAX_SAFE_INTEGER;
        if (pa !== pb) return pa - pb;
        return a.ref.localeCompare(b.ref);
      });

  const owners = byLane("owner");
  const helpers = byLane("helper");

  // owners fill capacity first; helpers only take what owners left over —
  // and only when every queued owner got a slot (full yield).
  const starts = owners.slice(0, capacity);
  if (owners.length <= capacity) {
    starts.push(...helpers.slice(0, capacity - owners.length));
  }
  return starts;
}
