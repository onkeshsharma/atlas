/**
 * M9 — the Bridge↔Atlas wire vocabulary, Atlas side (ADR-0002).
 *
 * The daemon package hand-mirrors these shapes
 * (`packages/bridge/src/protocol.ts` — the v1 failure-codes precedent:
 * the daemon never imports app code). `tests/m9-bridge-protocol.test.ts`
 * imports BOTH sides and round-trips every frame so drift fails CI.
 * The M6 live vocabulary (`src/domain/live/events.ts`) is untouched —
 * this is the DAEMON's dialect of the same outbox, not a fork of the
 * browser's.
 */
import type { RunHelperKind } from "@/src/db/schema";

import {
  parseNeedsInputAnswer,
  parseNeedsInputQuestion,
  type NeedsInputAnswer,
} from "../run/needs-input";
import { isRunState, type RunState } from "../run/states";
import { isFailureKind, type FailureKind } from "../run/failure";
import { parseRunDiffStats, type RunDiffStats } from "../run/diff-stats";

/** Atlas → Bridge over the command SSE stream (ADR-0002 §2). */
export type BridgeEvent =
  | { type: "run-available"; cursor: number; runId: string; lane: "owner" | "helper" }
  | { type: "run-cancelled"; cursor: number; runId: string }
  | { type: "run-answered"; cursor: number; runId: string; answer: NeedsInputAnswer }
  // Session B — approve-and-ship (PRD #25): commit/merge from the run's
  // KEPT review-ready worktree; outcome posts back as shipped / failed.
  | { type: "run-ship"; cursor: number; runId: string }
  // M10 — the doctor request (PRD #34): the `doctor-requested` outbox
  // row, delivered ONLY to the addressed daemon (events route filters by
  // payload.bridgeId). Carries the preflight inputs the daemon can't
  // know (src/domain/bridge/doctor.ts DoctorRequestPayload).
  | {
      type: "bridge-doctor";
      cursor: number;
      bridgeId: string;
      projects: Array<{ slug: string; localPath: string }>;
      keepWorktreeRunIds: string[];
    }
  // ADR-0007 Phase 2 — Athena bridge consult: the daemon runs the prompt
  // through `claude` (in the Run's worktree when repoAware) and posts the raw
  // verdict to /consult-result. Atlas parses + gates it (one decision brain).
  | {
      type: "consult-ask";
      cursor: number;
      runId: string;
      prompt: { system: string; user: string };
      repoAware: boolean;
    };

export type BridgeEventType = BridgeEvent["type"];

export const BRIDGE_EVENT_TYPES = [
  "run-available",
  "run-cancelled",
  "run-answered",
  "run-ship",
  "bridge-doctor",
  "consult-ask",
] as const satisfies readonly BridgeEventType[];

/** one SSE frame — id: carries the outbox cursor for Last-Event-ID resume. */
export function bridgeSseFrame(event: BridgeEvent): string {
  return `id: ${event.cursor}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** parse an incoming frame payload; null when malformed. */
export function parseBridgeEvent(value: unknown): BridgeEvent | null {
  if (!isRecord(value)) return null;
  if (typeof value.cursor !== "number") return null;
  // M10 — bridge-doctor addresses a BRIDGE, not a run.
  if (value.type === "bridge-doctor") {
    if (typeof value.bridgeId !== "string" || value.bridgeId.length === 0) return null;
    if (!Array.isArray(value.projects) || !Array.isArray(value.keepWorktreeRunIds)) return null;
    for (const p of value.projects) {
      if (!isRecord(p) || typeof p.slug !== "string" || typeof p.localPath !== "string") {
        return null;
      }
    }
    if (value.keepWorktreeRunIds.some((id) => typeof id !== "string")) return null;
    return value as BridgeEvent;
  }
  if (typeof value.runId !== "string") return null;
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
    case "consult-ask": {
      const p = value.prompt;
      if (!isRecord(p) || typeof p.system !== "string" || typeof p.user !== "string") return null;
      if (typeof value.repoAware !== "boolean") return null;
      return value as BridgeEvent;
    }
    default:
      return null;
  }
}

/** Bridge → Atlas: POST /api/bridge/runs/:id/transition body. */
export type BridgeTransitionBody =
  | { to: "needs-input"; question: unknown }
  | { to: "review-ready"; diffStats?: unknown; diffPatch?: string }
  | {
      to: "failed";
      failureKind: FailureKind;
      failureDetail?: string;
      /** ship failures claim from review-ready (Session B); default running. */
      from?: "running" | "review-ready";
      /** the gh path may have opened a PR before the merge refused (K:307). */
      prUrl?: string;
    }
  | { to: "cancelled"; from: "needs-input" }
  // Session B — the ship executor's success post (PRD #25/#27).
  | { to: "shipped"; prUrl?: string; mergeSha?: string };

export type ParsedTransition =
  | { to: "needs-input"; question: NonNullable<ReturnType<typeof parseNeedsInputQuestion>> }
  | { to: "review-ready"; diffStats: RunDiffStats | null; diffPatch: string | null }
  | {
      to: "failed";
      failureKind: FailureKind;
      failureDetail: string | null;
      from: "running" | "review-ready";
      prUrl: string | null;
    }
  | { to: "cancelled"; from: "needs-input" }
  | { to: "shipped"; prUrl: string | null; mergeSha: string | null };

export function parseBridgeTransition(value: unknown): ParsedTransition | null {
  if (!isRecord(value)) return null;
  switch (value.to) {
    case "needs-input": {
      const question = parseNeedsInputQuestion(value.question);
      return question ? { to: "needs-input", question } : null;
    }
    case "review-ready": {
      const diffPatch = typeof value.diffPatch === "string" ? value.diffPatch : null;
      if (value.diffStats === undefined || value.diffStats === null) {
        return { to: "review-ready", diffStats: null, diffPatch };
      }
      const diffStats = parseRunDiffStats(value.diffStats);
      return diffStats ? { to: "review-ready", diffStats, diffPatch } : null;
    }
    case "failed": {
      if (!isFailureKind(value.failureKind)) return null;
      const detail = typeof value.failureDetail === "string" ? value.failureDetail : null;
      const from = value.from === "review-ready" ? "review-ready" : "running";
      if (value.from !== undefined && value.from !== "running" && value.from !== "review-ready") {
        return null;
      }
      const prUrl = typeof value.prUrl === "string" ? value.prUrl : null;
      return { to: "failed", failureKind: value.failureKind, failureDetail: detail, from, prUrl };
    }
    case "cancelled":
      // the daemon may only cancel a needs-input orphan it cannot legally
      // fail (bridge-writers.ts note); browser cancels go through the
      // live-command executor, never this route.
      return value.from === "needs-input" ? { to: "cancelled", from: "needs-input" } : null;
    case "shipped": {
      if (value.prUrl !== undefined && typeof value.prUrl !== "string") return null;
      if (value.mergeSha !== undefined && typeof value.mergeSha !== "string") return null;
      return {
        to: "shipped",
        prUrl: (value.prUrl as string | undefined) ?? null,
        mergeSha: (value.mergeSha as string | undefined) ?? null,
      };
    }
    default:
      return null;
  }
}

/** Bridge → Atlas: POST /api/bridge/runs/:id/claim body. */
export type BridgeClaimBody = {
  worktreePath: string | null;
  branch: string | null;
};

export function parseBridgeClaim(value: unknown): BridgeClaimBody | null {
  if (!isRecord(value)) return null;
  const worktreePath = value.worktreePath;
  const branch = value.branch;
  if (worktreePath !== null && typeof worktreePath !== "string") return null;
  if (branch !== null && typeof branch !== "string") return null;
  return { worktreePath: worktreePath ?? null, branch: branch ?? null };
}

/** Bridge → Atlas: POST /api/bridge/runs/:id/stdout body. */
export type BridgeStdoutBody = { chunks: Array<{ seq: number; content: string }> };

export function parseBridgeStdout(value: unknown): BridgeStdoutBody | null {
  if (!isRecord(value) || !Array.isArray(value.chunks)) return null;
  const chunks: Array<{ seq: number; content: string }> = [];
  for (const c of value.chunks) {
    if (!isRecord(c)) return null;
    if (typeof c.seq !== "number" || !Number.isInteger(c.seq) || c.seq < 1) return null;
    if (typeof c.content !== "string") return null;
    chunks.push({ seq: c.seq, content: c.content });
  }
  return { chunks };
}

/** Bridge → Atlas: POST /api/bridge/runs/:id/helper-result body (validated downstream per kind). */
export type BridgeHelperResultBody =
  | { kind: "enrich-ticket"; enrichment: unknown }
  | { kind: "draft-brief"; body: string }
  | { kind: "ingest-project"; summary: unknown; suggestedTerms?: Array<{ term: string; uses: number }> };

export function parseBridgeHelperResult(value: unknown): BridgeHelperResultBody | null {
  if (!isRecord(value)) return null;
  switch (value.kind) {
    case "enrich-ticket":
      return value.enrichment !== undefined
        ? { kind: "enrich-ticket", enrichment: value.enrichment }
        : null;
    case "draft-brief":
      return typeof value.body === "string" ? { kind: "draft-brief", body: value.body } : null;
    case "ingest-project": {
      if (value.summary === undefined) return null;
      let suggestedTerms: Array<{ term: string; uses: number }> | undefined;
      if (value.suggestedTerms !== undefined) {
        if (!Array.isArray(value.suggestedTerms)) return null;
        suggestedTerms = [];
        for (const t of value.suggestedTerms) {
          if (!isRecord(t) || typeof t.term !== "string" || typeof t.uses !== "number") {
            return null;
          }
          suggestedTerms.push({ term: t.term, uses: t.uses });
        }
      }
      return { kind: "ingest-project", summary: value.summary, suggestedTerms };
    }
    default:
      return null;
  }
}

/**
 * M17 — per-run resource sample carried in the heartbeat body.
 * Mirrors packages/bridge/src/protocol.ts ResourceSample.
 */
export type BridgeResourceSample = {
  cpuPct: number;
  memBytes: number;
  diskBytes: number;
};

/** Bridge → Atlas: POST /api/bridge/heartbeat body. */
export type BridgeHeartbeatBody = {
  version: string;
  engine: "real" | "fake";
  busyRunIds: string[];
  /**
   * M10 — the cap the daemon currently HOLDS, echoed back so the
   * Bridges page can show honestly that a cap edit reached the machine
   * ("daemon confirmed cap 3 · 12s ago"). Optional — M9 daemons without
   * it still parse.
   */
  cap?: number;
  capabilities?: Record<string, unknown>;
  /**
   * M17 — per-run resource telemetry (CPU / memory / disk).
   * Rides the heartbeat ONLY (ADR-0002 hard wall: NEVER feed_events).
   * Keyed by runId; absent when no runs are active or the daemon is old.
   */
  resources?: Record<string, BridgeResourceSample>;
};

function isResourceSample(v: unknown): v is BridgeResourceSample {
  if (!isRecord(v)) return false;
  return (
    typeof v.cpuPct === "number" &&
    typeof v.memBytes === "number" &&
    typeof v.diskBytes === "number"
  );
}

export function parseBridgeHeartbeat(value: unknown): BridgeHeartbeatBody | null {
  if (!isRecord(value)) return null;
  if (typeof value.version !== "string") return null;
  if (value.engine !== "real" && value.engine !== "fake") return null;
  if (!Array.isArray(value.busyRunIds) || value.busyRunIds.some((id) => typeof id !== "string")) {
    return null;
  }
  if (value.cap !== undefined && (typeof value.cap !== "number" || !Number.isInteger(value.cap))) {
    return null;
  }
  if (value.capabilities !== undefined && !isRecord(value.capabilities)) return null;
  // M17 — optional resources map; malformed entries are skipped (non-fatal).
  let resources: Record<string, BridgeResourceSample> | undefined;
  if (isRecord(value.resources)) {
    resources = {};
    for (const [runId, sample] of Object.entries(value.resources)) {
      if (isResourceSample(sample)) resources[runId] = sample;
    }
  }
  return {
    version: value.version,
    engine: value.engine,
    busyRunIds: value.busyRunIds as string[],
    cap: value.cap as number | undefined,
    capabilities: value.capabilities as Record<string, unknown> | undefined,
    resources,
  };
}

/** Atlas → Bridge: GET /api/bridge/sync response (ADR-0002 §2 snapshot-then-subscribe). */
export type BridgeSyncResponse = {
  cursor: number;
  cap: number;
  queued: Array<{
    runId: string;
    ref: string;
    lane: "owner" | "helper";
    helperKind: RunHelperKind | null;
    queuePosition: number | null;
  }>;
  active: Array<{ runId: string; state: RunState }>;
  /** Session B — ship requests pending on THIS bridge's kept worktrees
   * (review-ready + ship_requested_at set): a ship clicked while the
   * daemon was offline executes on reconnect (PRD #35's sibling). */
  shipRequested: string[];
  /**
   * M10 — a pending doctor request for THIS bridge, inputs included
   * (the same catch-up-is-DB-state move: a doctor clicked while the
   * daemon was away still runs on reconnect, with FRESH inputs computed
   * at sync time). Optional/null on the wire — M9 servers/daemons
   * without it interoperate.
   */
  doctorRequest?: {
    projects: Array<{ slug: string; localPath: string }>;
    keepWorktreeRunIds: string[];
  } | null;
};

export function parseBridgeSync(value: unknown): BridgeSyncResponse | null {
  if (!isRecord(value)) return null;
  if (typeof value.cursor !== "number" || typeof value.cap !== "number") return null;
  if (!Array.isArray(value.queued) || !Array.isArray(value.active)) return null;
  if (!Array.isArray(value.shipRequested)) return null;
  if (value.doctorRequest !== undefined && value.doctorRequest !== null) {
    const d = value.doctorRequest;
    if (!isRecord(d) || !Array.isArray(d.projects) || !Array.isArray(d.keepWorktreeRunIds)) {
      return null;
    }
    for (const p of d.projects) {
      if (!isRecord(p) || typeof p.slug !== "string" || typeof p.localPath !== "string") {
        return null;
      }
    }
    if (d.keepWorktreeRunIds.some((id) => typeof id !== "string")) return null;
  }
  for (const q of value.queued) {
    if (!isRecord(q)) return null;
    if (typeof q.runId !== "string" || typeof q.ref !== "string") return null;
    if (q.lane !== "owner" && q.lane !== "helper") return null;
  }
  for (const a of value.active) {
    if (!isRecord(a) || typeof a.runId !== "string" || !isRunState(a.state)) return null;
  }
  if (value.shipRequested.some((id) => typeof id !== "string")) return null;
  return value as unknown as BridgeSyncResponse;
}
