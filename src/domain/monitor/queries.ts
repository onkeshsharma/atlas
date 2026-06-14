/**
 * M17 — /activity monitor read models.
 *
 * Queries the active runs (queued/running/needs-input) plus resource
 * telemetry from the bridge's heartbeat capabilities column. Resources
 * arrive via the heartbeat, NOT feed_events (ADR-0002 hard wall).
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { bridges, projects, runs, runStdoutChunks, tickets } from "@/src/db/schema";

import { ACTIVE_STATES, type RunState } from "../run/states";
import { DEFAULT_RUN_CAP } from "../settings/instance";

export type ResourceSample = {
  cpuPct: number;
  memBytes: number;
  diskBytes: number;
};

export type MonitorRunRow = {
  id: string;
  ref: string;
  title: string;
  state: RunState;
  projectName: string;
  projectSlug: string;
  ticketRef: string | null;
  /** when the run entered its current state. */
  since: Date;
  /** the run was created at this time (for elapsed computation). */
  startedAt: Date;
  /** last stdout line (null if no stdout yet). */
  lastStdout: string | null;
  /** resource telemetry from the latest heartbeat; null if not yet available. */
  resources: ResourceSample | null;
};

export type MonitorAggregate = {
  running: number;
  queued: number;
  needsInput: number;
  cap: number;
  totalCpuPct: number;
  totalMemBytes: number;
};

function parseCapabilities(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function isResourceSample(v: unknown): v is ResourceSample {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.cpuPct === "number" &&
    typeof r.memBytes === "number" &&
    typeof r.diskBytes === "number"
  );
}

/**
 * Build a map of runId → latest resource sample from ALL connected bridges
 * (the capabilities column stores the last heartbeat's resource snapshot).
 */
async function resourcesFromBridges(): Promise<Map<string, ResourceSample>> {
  const result = new Map<string, ResourceSample>();
  const rows = await db
    .select({ capabilities: bridges.capabilities, lastBeat: bridges.lastHeartbeatAt })
    .from(bridges)
    .where(sql`${bridges.lastHeartbeatAt} > now() - interval '2 minutes'`);

  for (const row of rows) {
    const caps = parseCapabilities(row.capabilities);
    const resources = caps.resources;
    if (typeof resources === "object" && resources !== null && !Array.isArray(resources)) {
      for (const [runId, sample] of Object.entries(resources as Record<string, unknown>)) {
        if (isResourceSample(sample)) {
          result.set(runId, sample);
        }
      }
    }
  }
  return result;
}

/**
 * All active runs (queued/running/needs-input) with resource telemetry.
 * Ordered by state urgency (needs-input first §3.3), then oldest first.
 */
export async function monitorRuns(): Promise<MonitorRunRow[]> {
  const [activeRows, resourceMap] = await Promise.all([
    db
      .select({
        id: runs.id,
        ref: runs.ref,
        title: runs.title,
        state: runs.state,
        projectName: projects.name,
        projectSlug: projects.slug,
        ticketRef: tickets.ref,
        since: runs.updatedAt,
        startedAt: runs.createdAt,
      })
      .from(runs)
      .innerJoin(projects, eq(runs.projectId, projects.id))
      .leftJoin(tickets, eq(runs.ticketId, tickets.id))
      .where(inArray(runs.state, [...ACTIVE_STATES]))
      .orderBy(asc(runs.createdAt)),
    resourcesFromBridges(),
  ]);

  // fetch last stdout chunk per active run — we use MAX(seq) per run_id
  // via a plain subquery; cheap because run_stdout_chunks is indexed on
  // (run_id, seq) and active runs have few rows.
  const runIds = activeRows.map((r) => r.id);
  const stdoutMap = new Map<string, string>();
  if (runIds.length > 0) {
    const maxSeqRows = await db
      .select({
        runId: runStdoutChunks.runId,
        maxSeq: sql<number>`max(${runStdoutChunks.seq})`,
      })
      .from(runStdoutChunks)
      .where(inArray(runStdoutChunks.runId, runIds))
      .groupBy(runStdoutChunks.runId);

    // now fetch those exact rows
    for (const { runId, maxSeq } of maxSeqRows) {
      if (!runId) continue;
      const [chunk] = await db
        .select({ content: runStdoutChunks.content })
        .from(runStdoutChunks)
        .where(
          and(
            eq(runStdoutChunks.runId, runId),
            eq(runStdoutChunks.seq, maxSeq),
          ),
        )
        .limit(1);
      if (chunk) {
        const lines = chunk.content.split("\n").filter(Boolean);
        stdoutMap.set(runId, lines[lines.length - 1] ?? chunk.content.trim());
      }
    }
  }

  // state priority: needs-input (0) > running (1) > queued (2)
  const statePriority = (s: RunState): number =>
    s === "needs-input" ? 0 : s === "running" ? 1 : 2;

  return activeRows
    .map((row) => ({
      id: row.id,
      ref: row.ref,
      title: row.title,
      state: row.state,
      projectName: row.projectName,
      projectSlug: row.projectSlug,
      ticketRef: row.ticketRef,
      since: row.since,
      startedAt: row.startedAt,
      lastStdout: stdoutMap.get(row.id) ?? null,
      resources: resourceMap.get(row.id) ?? null,
    }))
    .sort((a, b) => {
      const pa = statePriority(a.state);
      const pb = statePriority(b.state);
      if (pa !== pb) return pa - pb;
      return a.startedAt.getTime() - b.startedAt.getTime();
    });
}

/** Aggregate metrics across all active runs. */
export function computeAggregate(
  rows: MonitorRunRow[],
  cap: number,
): MonitorAggregate {
  let totalCpuPct = 0;
  let totalMemBytes = 0;
  let running = 0;
  let queued = 0;
  let needsInput = 0;

  for (const row of rows) {
    if (row.state === "running") running++;
    else if (row.state === "queued") queued++;
    else if (row.state === "needs-input") needsInput++;
    if (row.resources) {
      totalCpuPct += row.resources.cpuPct;
      totalMemBytes += row.resources.memBytes;
    }
  }

  return {
    running,
    queued,
    needsInput,
    cap,
    totalCpuPct: Math.round(totalCpuPct * 10) / 10,
    totalMemBytes,
  };
}

/**
 * Flag a run as "runaway" (suspiciously high CPU) or "stuck"
 * (no new stdout in > STUCK_MINUTES while in running state).
 */
export const RUNAWAY_CPU_PCT = 80;
export const STUCK_MINUTES = 5;

export type RunHealth = "runaway" | "stuck" | "ok";

export function runHealth(row: MonitorRunRow, now: Date = new Date()): RunHealth {
  if (row.state !== "running") return "ok";
  if (row.resources && row.resources.cpuPct >= RUNAWAY_CPU_PCT) return "runaway";
  const elapsedMs = now.getTime() - row.since.getTime();
  if (elapsedMs > STUCK_MINUTES * 60 * 1_000 && row.lastStdout === null) return "stuck";
  return "ok";
}

/** convenience: instance cap (same source as Today's strip). */
export async function monitorCap(): Promise<number> {
  const { runCap } = await import("../settings/instance");
  return runCap().catch(() => DEFAULT_RUN_CAP);
}
