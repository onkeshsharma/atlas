/**
 * M9 — typed Run failure kinds (PRD #22: per-failure-kind guidance).
 *
 * Stored as text in `runs.failure_kind` (NOT a pg enum — the Bridge
 * package hand-mirrors this list and an enum would couple migrations to
 * daemon releases; v1 prior art: atlas/packages/atlas-bridge/src/lib/
 * failure-codes.ts kept the same vocabulary in sync by hand). Session B's
 * K surface renders the per-kind guidance; this module owns the words.
 */

export const FAILURE_KINDS = [
  "engine-crash", //    the Engine process exited non-zero / died
  "engine-timeout", //  the Engine hit the Bridge's wall clock
  "no-repo", //         the project has no local_path on this machine
  "worktree-failed", // git worktree add failed (disk, locks, repo state)
  "bridge-lost", //     the daemon restarted under the run (orphan sweep)
  "conflict", //        merge conflict at ship time (PRD #23 — Session B)
  "not-mergeable", //   remote refuses the merge (checks, protections)
  "gh-cli-error", //    gh/remote isn't configured or errored (KK honesty)
  "no-changes", //      the Engine finished without touching anything
] as const;

export type FailureKind = (typeof FAILURE_KINDS)[number];

export function isFailureKind(value: unknown): value is FailureKind {
  return typeof value === "string" && (FAILURE_KINDS as readonly string[]).includes(value);
}

/** one quiet sentence per kind — K's guidance hero (§3.7 framing). */
export const FAILURE_GUIDANCE: Record<FailureKind, string> = {
  "engine-crash": "The Engine died mid-run. The stdout tail below shows its last words.",
  "engine-timeout": "The Engine ran past the time wall. Consider a narrower Brief.",
  "no-repo": "This project has no local path on the Bridge's machine — pair one before dispatching.",
  "worktree-failed": "The Bridge couldn't create the run's worktree. Check the repo's state on disk.",
  "bridge-lost": "The Bridge restarted underneath this run. Nothing shipped; dispatch again.",
  conflict: "The merge conflicts with what landed since. Send it back to the Engine to resolve.",
  "not-mergeable": "The remote refused the merge — checks or branch protections are in the way.",
  "gh-cli-error": "The Bridge couldn't drive the remote (gh missing or unauthenticated).",
  "no-changes": "The Engine finished without changing anything — the Brief may already be true.",
};
