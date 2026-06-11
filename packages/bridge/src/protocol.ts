/**
 * Bridge↔Atlas wire vocabulary — DAEMON side (ADR-0002).
 *
 * Hand-mirrors `src/domain/bridge/protocol.ts` + the M6 needs-input
 * shapes (the v1 failure-codes precedent: the daemon never imports app
 * code, so it can ship standalone). Drift is fenced by
 * `tests/m9-bridge-protocol.test.ts` in the app suite, which imports
 * BOTH sides and round-trips every frame.
 */

// ── run vocabulary (mirrors src/domain/run/states.ts) ──

export const RUN_STATES = [
  "queued",
  "running",
  "needs-input",
  "review-ready",
  "shipped",
  "failed",
  "cancelled",
] as const;

export type RunState = (typeof RUN_STATES)[number];

export type RunLane = "owner" | "helper";

export type HelperKind = "enrich-ticket" | "draft-brief" | "ingest-project";

/** mirrors src/domain/run/failure.ts FAILURE_KINDS. */
export const FAILURE_KINDS = [
  "engine-crash",
  "engine-timeout",
  "no-repo",
  "worktree-failed",
  "bridge-lost",
  "conflict",
  "not-mergeable",
  "gh-cli-error",
  "no-changes",
] as const;

export type FailureKind = (typeof FAILURE_KINDS)[number];

// ── needs-input payloads (mirrors src/domain/run/needs-input.ts) ──

export type NeedsInputQuestion = {
  kind: "question" | "permission";
  prompt: string;
  options?: string[];
  context?: string;
  raisedAt: string;
};

export type NeedsInputAnswer = {
  text?: string;
  choice?: string;
  answeredBy: string;
  answeredAt: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseNeedsInputAnswer(value: unknown): NeedsInputAnswer | null {
  if (!isRecord(value)) return null;
  if (typeof value.answeredBy !== "string" || value.answeredBy.length === 0) return null;
  if (typeof value.answeredAt !== "string") return null;
  const text = value.text;
  const choice = value.choice;
  if (text !== undefined && typeof text !== "string") return null;
  if (choice !== undefined && typeof choice !== "string") return null;
  if (text === undefined && choice === undefined) return null;
  return {
    text: text as string | undefined,
    choice: choice as string | undefined,
    answeredBy: value.answeredBy,
    answeredAt: value.answeredAt,
  };
}

// ── diff stats (mirrors src/domain/run/diff-stats.ts) ──

export type RunDiffFile = { path: string; insertions: number; deletions: number };

export type RunDiffStats = {
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: RunDiffFile[];
};

// ── Atlas → Bridge command stream (mirrors BridgeEvent) ──

export type BridgeEvent =
  | { type: "run-available"; cursor: number; runId: string; lane: RunLane }
  | { type: "run-cancelled"; cursor: number; runId: string }
  | { type: "run-answered"; cursor: number; runId: string; answer: NeedsInputAnswer }
  // Session B — approve-and-ship: commit/merge from the run's kept
  // review-ready worktree (ship.ts), then post shipped / failed back.
  | { type: "run-ship"; cursor: number; runId: string };

export function parseBridgeEvent(value: unknown): BridgeEvent | null {
  if (!isRecord(value)) return null;
  if (typeof value.cursor !== "number" || typeof value.runId !== "string") return null;
  switch (value.type) {
    case "run-available":
      if (value.lane !== "owner" && value.lane !== "helper") return null;
      return value as BridgeEvent;
    case "run-cancelled":
    case "run-ship":
      return value as BridgeEvent;
    case "run-answered":
      if (!parseNeedsInputAnswer(value.answer)) return null;
      return value as BridgeEvent;
    default:
      return null;
  }
}

// ── Bridge → Atlas bodies (mirrors the route parsers) ──

export type TransitionBody =
  | { to: "needs-input"; question: NeedsInputQuestion }
  | { to: "review-ready"; diffStats?: RunDiffStats | null; diffPatch?: string }
  | {
      to: "failed";
      failureKind: FailureKind;
      failureDetail?: string;
      /** ship failures claim from review-ready (Session B); default running. */
      from?: "running" | "review-ready";
      /** the gh path may have opened a PR before the merge refused. */
      prUrl?: string;
    }
  | { to: "cancelled"; from: "needs-input" }
  // Session B — the ship executor's success post.
  | { to: "shipped"; prUrl?: string; mergeSha?: string };

export type StdoutChunk = { seq: number; content: string };

export type HelperResultBody =
  | { kind: "enrich-ticket"; enrichment: unknown }
  | { kind: "draft-brief"; body: string }
  | {
      kind: "ingest-project";
      summary: unknown;
      suggestedTerms?: Array<{ term: string; uses: number }>;
    };

export type HeartbeatBody = {
  version: string;
  engine: "real" | "fake";
  busyRunIds: string[];
  capabilities?: Record<string, unknown>;
};

// ── Atlas → Bridge responses ──

export type SyncResponse = {
  cursor: number;
  cap: number;
  queued: Array<{
    runId: string;
    ref: string;
    lane: RunLane;
    helperKind: HelperKind | null;
    queuePosition: number | null;
  }>;
  active: Array<{ runId: string; state: RunState }>;
  /** Session B — pending approve-and-ship requests on this bridge's
   * kept worktrees; executed on (re)connect like queued runs. */
  shipRequested: string[];
};

export function parseSyncResponse(value: unknown): SyncResponse | null {
  if (!isRecord(value)) return null;
  if (typeof value.cursor !== "number" || typeof value.cap !== "number") return null;
  if (!Array.isArray(value.queued) || !Array.isArray(value.active)) return null;
  if (!Array.isArray(value.shipRequested)) return null;
  for (const q of value.queued) {
    if (!isRecord(q) || typeof q.runId !== "string" || typeof q.ref !== "string") return null;
    if (q.lane !== "owner" && q.lane !== "helper") return null;
  }
  for (const a of value.active) {
    if (!isRecord(a) || typeof a.runId !== "string" || typeof a.state !== "string") return null;
    if (!(RUN_STATES as readonly string[]).includes(a.state)) return null;
  }
  if (value.shipRequested.some((id) => typeof id !== "string")) return null;
  return value as unknown as SyncResponse;
}

/** the work order (mirrors src/domain/dispatch/queries.ts WorkOrder). */
export type WorkOrder = {
  runId: string;
  ref: string;
  title: string;
  state: RunState;
  lane: RunLane;
  helperKind: HelperKind | null;
  queuePosition: number | null;
  project: { id: string; name: string; slug: string; localPath: string | null };
  ticket: {
    id: string;
    ref: string;
    title: string;
    body: string;
    kind: string | null;
    priority: string;
  } | null;
  briefBody: string | null;
  question: NeedsInputQuestion | null;
};

export function parseWorkOrder(value: unknown): WorkOrder | null {
  if (!isRecord(value)) return null;
  if (typeof value.runId !== "string" || typeof value.ref !== "string") return null;
  if (typeof value.title !== "string") return null;
  if (value.lane !== "owner" && value.lane !== "helper") return null;
  if (!isRecord(value.project)) return null;
  if (typeof value.project.name !== "string" || typeof value.project.id !== "string") return null;
  if (value.ticket !== null && !isRecord(value.ticket)) return null;
  if (value.briefBody !== null && typeof value.briefBody !== "string") return null;
  return value as unknown as WorkOrder;
}
