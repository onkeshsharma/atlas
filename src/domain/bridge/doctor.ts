/**
 * M10 — the Bridge doctor (PRD #34): typed request/result vocabulary +
 * the single-statement writers (THE OUTBOX RULE).
 *
 * Protocol (ADDITIVE in ADR-0002's idioms — recorded in HANDOFF-M10 as
 * the ADR amendment): the doctor request is the ship-requested pattern —
 * `requestBridgeDoctor` marks `bridges.doctor_requested_at` and appends
 * ONE `doctor-requested` outbox row whose payload carries the target
 * bridge id + the preflight inputs the daemon can't know (project
 * local_paths, the run ids whose kept worktrees are LEGITIMATE —
 * HANDOFF-M9 ruling 2's stale-worktree sweep input). The events route
 * maps that row to a `bridge-doctor` command for the addressed daemon
 * only; the daemon runs its checks and posts the result to
 * POST /api/bridge/doctor, which lands the verdict on the bridge row and
 * appends `doctor-completed` — open browsers re-render live.
 *
 * The daemon hand-mirrors these shapes (packages/bridge/src/protocol.ts,
 * the v1 failure-codes precedent); tests/m10-doctor-protocol.test.ts
 * imports BOTH sides and round-trips every frame.
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";

/** a doctor re-request is allowed once a pending one has gone stale. */
export const DOCTOR_RETRY_AFTER_MS = 60_000;

export type DoctorCheckStatus = "pass" | "warn" | "fail";

export type DoctorCheck = {
  /** stable key — "atlas-sync", "git", "gh", "repo:<slug>", "worktrees", "lock". */
  key: string;
  /** display label — "Atlas reachable · DB round-trip". */
  label: string;
  status: DoctorCheckStatus;
  /** one honest mono line — version string, error tail, count. */
  detail: string | null;
};

/** what the daemon posts up (stored verbatim in bridges.doctor). */
export type BridgeDoctorResult = {
  /** ISO timestamp the daemon ran its checks. */
  ranAt: string;
  version: string;
  engine: "real" | "fake";
  /** the single-instance lock port this daemon holds (sanity surface). */
  lockPort: number;
  checks: DoctorCheck[];
};

/** rides the `doctor-requested` outbox row's payload jsonb. */
export type DoctorRequestPayload = {
  bridgeId: string;
  /** every project with a local working copy — existence + git checks. */
  projects: Array<{ slug: string; localPath: string }>;
  /** runs whose kept worktrees are legitimate (review-ready awaiting ship). */
  keepWorktreeRunIds: string[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const CHECK_STATUSES = ["pass", "warn", "fail"] as const;

export function parseDoctorCheck(value: unknown): DoctorCheck | null {
  if (!isRecord(value)) return null;
  if (typeof value.key !== "string" || value.key.length === 0) return null;
  if (typeof value.label !== "string" || value.label.length === 0) return null;
  if (!(CHECK_STATUSES as readonly string[]).includes(value.status as string)) return null;
  if (value.detail !== null && typeof value.detail !== "string") return null;
  return {
    key: value.key,
    label: value.label,
    status: value.status as DoctorCheckStatus,
    detail: (value.detail as string | null) ?? null,
  };
}

export function parseBridgeDoctorResult(value: unknown): BridgeDoctorResult | null {
  if (!isRecord(value)) return null;
  if (typeof value.ranAt !== "string" || Number.isNaN(Date.parse(value.ranAt))) return null;
  if (typeof value.version !== "string") return null;
  if (value.engine !== "real" && value.engine !== "fake") return null;
  if (typeof value.lockPort !== "number" || !Number.isInteger(value.lockPort)) return null;
  if (!Array.isArray(value.checks) || value.checks.length === 0) return null;
  const checks: DoctorCheck[] = [];
  for (const c of value.checks) {
    const parsed = parseDoctorCheck(c);
    if (!parsed) return null;
    checks.push(parsed);
  }
  return {
    ranAt: value.ranAt,
    version: value.version,
    engine: value.engine,
    lockPort: value.lockPort,
    checks,
  };
}

export function parseDoctorRequestPayload(value: unknown): DoctorRequestPayload | null {
  if (!isRecord(value)) return null;
  if (typeof value.bridgeId !== "string" || value.bridgeId.length === 0) return null;
  if (!Array.isArray(value.projects) || !Array.isArray(value.keepWorktreeRunIds)) return null;
  const projects: Array<{ slug: string; localPath: string }> = [];
  for (const p of value.projects) {
    if (!isRecord(p) || typeof p.slug !== "string" || typeof p.localPath !== "string") {
      return null;
    }
    projects.push({ slug: p.slug, localPath: p.localPath });
  }
  if (value.keepWorktreeRunIds.some((id) => typeof id !== "string")) return null;
  return {
    bridgeId: value.bridgeId,
    projects,
    keepWorktreeRunIds: value.keepWorktreeRunIds as string[],
  };
}

/** verdict math for the UI + feed summaries. */
export function doctorVerdict(result: BridgeDoctorResult): {
  passed: number;
  warned: number;
  failed: number;
  total: number;
  healthy: boolean;
} {
  let passed = 0;
  let warned = 0;
  let failed = 0;
  for (const c of result.checks) {
    if (c.status === "pass") passed += 1;
    else if (c.status === "warn") warned += 1;
    else failed += 1;
  }
  return {
    passed,
    warned,
    failed,
    total: result.checks.length,
    healthy: failed === 0,
  };
}

type WriterResult = { ok: true; feedEventId: number } | { ok: false; reason: "not-claimed" };

function asResult(rows: unknown[]): WriterResult {
  if (!rows.length) return { ok: false, reason: "not-claimed" };
  return { ok: true, feedEventId: Number((rows[0] as { id: number | string }).id) };
}

/**
 * The Owner's "run doctor" click. Gathers the preflight inputs, then ONE
 * conditional statement: claim the pending marker (re-requests allowed
 * only once a pending one staled — double-clicks lose) + the outbox row
 * that IS the daemon command.
 */
export async function requestBridgeDoctor(input: {
  bridgeId: string;
  actor?: string;
}): Promise<WriterResult> {
  // preflight inputs the daemon can't know (reads; the write below is atomic)
  const projects = (await db.execute(sql`
    select slug, local_path from projects where local_path is not null
  `)) as unknown as { rows: Array<{ slug: string; local_path: string }> };
  const keeps = (await db.execute(sql`
    select id::text as id from runs
    where bridge_id = ${input.bridgeId} and state = 'review-ready'
  `)) as unknown as { rows: Array<{ id: string }> };

  const payload: DoctorRequestPayload = {
    bridgeId: input.bridgeId,
    projects: projects.rows.map((p) => ({ slug: p.slug, localPath: p.local_path })),
    keepWorktreeRunIds: keeps.rows.map((r) => r.id),
  };

  const retryAfter = new Date(Date.now() - DOCTOR_RETRY_AFTER_MS).toISOString();
  const result = await db.execute(sql`
    with target as (
      update bridges
      set doctor_requested_at = now()
      where id = ${input.bridgeId}
        and revoked_at is null
        and (doctor_requested_at is null or doctor_requested_at < ${retryAfter}::timestamptz)
      returning id, name
    )
    insert into feed_events (kind, actor, summary, payload, seeded)
    select 'doctor-requested', ${input.actor ?? "you"},
           'doctor on ' || target.name,
           ${JSON.stringify(payload)}::jsonb, false
    from target
    returning id
  `);
  return asResult(result.rows);
}

/**
 * The daemon's verdict post (route: POST /api/bridge/doctor). ONE
 * statement: land the result + clear the pending marker + the
 * `doctor-completed` outbox row so open browsers re-render live.
 */
export async function applyDoctorResult(input: {
  bridgeId: string;
  result: BridgeDoctorResult;
}): Promise<WriterResult> {
  const v = doctorVerdict(input.result);
  const summary =
    v.failed > 0
      ? `doctor on %NAME% — ${v.failed} of ${v.total} checks failed`
      : v.warned > 0
        ? `doctor on %NAME% — ${v.passed} passed · ${v.warned} to look at`
        : `doctor on %NAME% — all ${v.total} checks passed`;
  const rows = await db.execute(sql`
    with target as (
      update bridges
      set doctor = ${JSON.stringify(input.result)}::jsonb,
          doctor_requested_at = null
      where id = ${input.bridgeId} and revoked_at is null
      returning id, name
    )
    insert into feed_events (kind, actor, summary, payload, seeded)
    select 'doctor-completed', 'Bridge',
           replace(${summary}, '%NAME%', target.name),
           jsonb_build_object('bridgeId', target.id),
           false
    from target
    returning id
  `);
  return asResult(rows.rows);
}
