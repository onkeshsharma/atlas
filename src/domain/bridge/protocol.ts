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
  | { type: "run-answered"; cursor: number; runId: string; answer: NeedsInputAnswer };

export type BridgeEventType = BridgeEvent["type"];

export const BRIDGE_EVENT_TYPES = [
  "run-available",
  "run-cancelled",
  "run-answered",
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
  if (typeof value.cursor !== "number" || typeof value.runId !== "string") return null;
  switch (value.type) {
    case "run-available":
      if (value.lane !== "owner" && value.lane !== "helper") return null;
      return value as BridgeEvent;
    case "run-cancelled":
      return value as BridgeEvent;
    case "run-answered":
      if (!parseNeedsInputAnswer(value.answer)) return null;
      return value as BridgeEvent;
    default:
      return null;
  }
}

/** Bridge → Atlas: POST /api/bridge/runs/:id/transition body. */
export type BridgeTransitionBody =
  | { to: "needs-input"; question: unknown }
  | { to: "review-ready"; diffStats?: unknown }
  | { to: "failed"; failureKind: FailureKind; failureDetail?: string }
  | { to: "cancelled"; from: "needs-input" };

export type ParsedTransition =
  | { to: "needs-input"; question: NonNullable<ReturnType<typeof parseNeedsInputQuestion>> }
  | { to: "review-ready"; diffStats: RunDiffStats | null }
  | { to: "failed"; failureKind: FailureKind; failureDetail: string | null }
  | { to: "cancelled"; from: "needs-input" };

export function parseBridgeTransition(value: unknown): ParsedTransition | null {
  if (!isRecord(value)) return null;
  switch (value.to) {
    case "needs-input": {
      const question = parseNeedsInputQuestion(value.question);
      return question ? { to: "needs-input", question } : null;
    }
    case "review-ready": {
      if (value.diffStats === undefined || value.diffStats === null) {
        return { to: "review-ready", diffStats: null };
      }
      const diffStats = parseRunDiffStats(value.diffStats);
      return diffStats ? { to: "review-ready", diffStats } : null;
    }
    case "failed": {
      if (!isFailureKind(value.failureKind)) return null;
      const detail = typeof value.failureDetail === "string" ? value.failureDetail : null;
      return { to: "failed", failureKind: value.failureKind, failureDetail: detail };
    }
    case "cancelled":
      // the daemon may only cancel a needs-input orphan it cannot legally
      // fail (bridge-writers.ts note); browser cancels go through the
      // live-command executor, never this route.
      return value.from === "needs-input" ? { to: "cancelled", from: "needs-input" } : null;
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

/** Bridge → Atlas: POST /api/bridge/heartbeat body. */
export type BridgeHeartbeatBody = {
  version: string;
  engine: "real" | "fake";
  busyRunIds: string[];
  capabilities?: Record<string, unknown>;
};

export function parseBridgeHeartbeat(value: unknown): BridgeHeartbeatBody | null {
  if (!isRecord(value)) return null;
  if (typeof value.version !== "string") return null;
  if (value.engine !== "real" && value.engine !== "fake") return null;
  if (!Array.isArray(value.busyRunIds) || value.busyRunIds.some((id) => typeof id !== "string")) {
    return null;
  }
  if (value.capabilities !== undefined && !isRecord(value.capabilities)) return null;
  return {
    version: value.version,
    engine: value.engine,
    busyRunIds: value.busyRunIds as string[],
    capabilities: value.capabilities as Record<string, unknown> | undefined,
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
};

export function parseBridgeSync(value: unknown): BridgeSyncResponse | null {
  if (!isRecord(value)) return null;
  if (typeof value.cursor !== "number" || typeof value.cap !== "number") return null;
  if (!Array.isArray(value.queued) || !Array.isArray(value.active)) return null;
  for (const q of value.queued) {
    if (!isRecord(q)) return null;
    if (typeof q.runId !== "string" || typeof q.ref !== "string") return null;
    if (q.lane !== "owner" && q.lane !== "helper") return null;
  }
  for (const a of value.active) {
    if (!isRecord(a) || typeof a.runId !== "string" || !isRunState(a.state)) return null;
  }
  return value as unknown as BridgeSyncResponse;
}
