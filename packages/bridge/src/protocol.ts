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
  "clone-failed", // the Bridge couldn't clone the repo — git error or dest conflict
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
  | { type: "run-ship"; cursor: number; runId: string }
  // M10 — run preflight (doctor.ts) and post the verdict back. Addressed
  // to ONE bridge; the inputs ride the command (mirrors DoctorRequestPayload).
  | {
      type: "bridge-doctor";
      cursor: number;
      bridgeId: string;
      projects: Array<{ slug: string; localPath: string }>;
      keepWorktreeRunIds: string[];
    }
  // ADR-0007 Phase 2 — run an Athena consult through `claude` (in the run's
  // worktree when repoAware) and POST the raw verdict to /consult-result.
  | {
      type: "consult-ask";
      cursor: number;
      runId: string;
      prompt: { system: string; user: string };
      repoAware: boolean;
    };

export function parseBridgeEvent(value: unknown): BridgeEvent | null {
  if (!isRecord(value)) return null;
  if (typeof value.cursor !== "number") return null;
  // M10 — the doctor command addresses a bridge, not a run.
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

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === "string");
}
function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((n) => typeof n === "number" && Number.isFinite(n));
}
const INGEST_SEVERITIES = new Set(["high", "medium", "low"]);

/**
 * Validate an ingest-project summary against the EXACT shape Atlas requires.
 * MIRROR of src/domain/project/ingest-summary.ts `parseIngestSummary` — they MUST
 * stay in lockstep: the bridge rejecting in-turn is what gives the Engine a Gap-3
 * retry instead of a post-hoc 422 that strands the run (the R-723 failure).
 */
export function isValidIngestSummary(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== 1) return false;
  if (typeof value.tagline !== "string") return false;
  if (!isStringArray(value.engineRead)) return false;
  if (!isStringArray(value.stack)) return false;
  if (typeof value.stackProse !== "string") return false;
  if (typeof value.architectureProse !== "string") return false;
  if (!Array.isArray(value.architecture)) return false;
  for (const n of value.architecture) {
    if (!isRecord(n) || typeof n.name !== "string" || typeof n.sub !== "string" || typeof n.detail !== "string")
      return false;
  }
  if (!Array.isArray(value.smells)) return false;
  for (const s of value.smells) {
    if (!isRecord(s) || typeof s.severity !== "string" || !INGEST_SEVERITIES.has(s.severity)) return false;
    if (typeof s.title !== "string" || typeof s.file !== "string" || typeof s.detail !== "string") return false;
  }
  if (!Array.isArray(value.health)) return false;
  for (const c of value.health) {
    if (!isRecord(c) || typeof c.label !== "string" || typeof c.value !== "string" || typeof c.ok !== "boolean")
      return false;
  }
  if (!isNumberArray(value.churnWeeks)) return false;
  if (!Array.isArray(value.coverage)) return false;
  for (const a of value.coverage) {
    if (!isRecord(a) || typeof a.area !== "string" || typeof a.pct !== "number") return false;
    if (a.hero !== undefined && typeof a.hero !== "boolean") return false;
  }
  if (!isRecord(value.stats)) return false;
  const st = value.stats;
  if (typeof st.coveragePct !== "number") return false;
  if (st.prevCoveragePct !== null && typeof st.prevCoveragePct !== "number") return false;
  if (typeof st.linesOfCode !== "string" || typeof st.files !== "number") return false;
  if (!Array.isArray(value.commits)) return false;
  for (const c of value.commits) {
    if (!isRecord(c) || typeof c.sha !== "string" || typeof c.subject !== "string" || typeof c.at !== "string")
      return false;
  }
  if (typeof value.commitsTotal !== "number") return false;
  if (!isRecord(value.repo)) return false;
  if (typeof value.repo.branch !== "string" || typeof value.repo.commitsSinceIngest !== "number") return false;
  return true;
}

/**
 * Validate an untrusted `submit_result` payload (ADR-0006) into a
 * HelperResultBody. Returns null on any shape mismatch so the MCP tool can
 * reject it and the Engine retries BEFORE the turn ends — the helper Run only
 * succeeds by submitting a well-formed deliverable. Mirrors the defensive
 * style of `parseNeedsInputAnswer`.
 */
export function parseHelperResultBody(value: unknown): HelperResultBody | null {
  if (!isRecord(value)) return null;
  switch (value.kind) {
    case "enrich-ticket":
      // enrichment is opaque to the Bridge (Atlas validates against
      // TicketEnrichment) — require only that it is present.
      if (!("enrichment" in value) || value.enrichment === undefined) return null;
      return { kind: "enrich-ticket", enrichment: value.enrichment };
    case "draft-brief":
      if (typeof value.body !== "string" || value.body.length === 0) return null;
      return { kind: "draft-brief", body: value.body };
    case "ingest-project": {
      // strict (mirrors Atlas) so a malformed summary is rejected in-turn — the
      // Engine then retries within the same turn instead of the run being
      // stranded by a post-hoc 422 (the R-723 failure).
      if (!isValidIngestSummary(value.summary)) return null;
      let suggestedTerms: Array<{ term: string; uses: number }> | undefined;
      if (value.suggestedTerms !== undefined) {
        if (!Array.isArray(value.suggestedTerms)) return null;
        const terms: Array<{ term: string; uses: number }> = [];
        for (const t of value.suggestedTerms) {
          if (!isRecord(t) || typeof t.term !== "string" || typeof t.uses !== "number") {
            return null;
          }
          terms.push({ term: t.term, uses: t.uses });
        }
        suggestedTerms = terms;
      }
      return {
        kind: "ingest-project",
        summary: value.summary,
        ...(suggestedTerms ? { suggestedTerms } : {}),
      };
    }
    default:
      return null;
  }
}

/** M17 — per-run resource sample (CPU / memory / disk). */
export type ResourceSample = {
  /** 0–100 CPU %. */
  cpuPct: number;
  /** resident memory bytes. */
  memBytes: number;
  /** worktree directory bytes. */
  diskBytes: number;
};

export type HeartbeatBody = {
  version: string;
  engine: "real" | "fake";
  busyRunIds: string[];
  /** M10 — the cap this daemon currently holds, echoed for the N page. */
  cap?: number;
  capabilities?: Record<string, unknown>;
  /**
   * M17 — per-run resource telemetry. Rides the heartbeat ONLY
   * (ADR-0002 hard wall: resources NEVER go to feed_events).
   * Keyed by runId; omitted when no runs are active.
   */
  resources?: Record<string, ResourceSample>;
};

// ── M10 doctor (mirrors src/domain/bridge/doctor.ts) ──

export type DoctorCheckStatus = "pass" | "warn" | "fail";

export type DoctorCheck = {
  key: string;
  label: string;
  status: DoctorCheckStatus;
  detail: string | null;
};

export type BridgeDoctorResult = {
  ranAt: string;
  version: string;
  engine: "real" | "fake";
  lockPort: number;
  checks: DoctorCheck[];
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
  /** M10 — a pending doctor request with fresh inputs (null/absent = none). */
  doctorRequest?: {
    projects: Array<{ slug: string; localPath: string }>;
    keepWorktreeRunIds: string[];
  } | null;
};

export function parseSyncResponse(value: unknown): SyncResponse | null {
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
  project: { id: string; name: string; slug: string; localPath: string | null; repoUrl: string | null };
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
  // M18 — repoUrl may be absent from pre-M18 server responses; tolerate.
  if ('repoUrl' in value.project) {
    if (value.project.repoUrl !== null && typeof value.project.repoUrl !== 'string') return null;
  }
  return value as unknown as WorkOrder;
}
