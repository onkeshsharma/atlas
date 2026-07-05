/**
 * Phase 2 — the Probable-Issues Watcher.
 *
 * Runs the SAME `runHealth` detection the /activity page computes at render
 * time, but on a schedule (Vercel cron), and PUSHES a ranked advisory into the
 * feed for anything unhealthy — so a runaway or stuck run reaches the Owner's
 * Inbox (Notify lane) without them opening the monitor. The whole point of the
 * "buddy that advises": the system reaches out before you go looking.
 *
 * Deduped: at most one advisory per (run, health) per DEDUP_MINUTES, so a
 * long-running problem is surfaced once, not re-nagged every scan.
 *
 * Reuses machinery that today dead-ends at render time (monitorRuns / runHealth
 * / the CIM ResourceSampler). v1 signals: runaway CPU + stuck (no output). The
 * silence-since-last-output and context-near-exhaustion signals wait on the
 * per-run telemetry columns (deferred).
 */
import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { feedEvents } from "@/src/db/schema";
import {
  monitorRuns,
  runHealth,
  type MonitorRunRow,
  type RunHealth,
} from "@/src/domain/monitor/queries";

/** one advisory per (run, health) per hour — surfaced once, never re-nagged. */
const DEDUP_MINUTES = 60;

export type WatcherResult = { scanned: number; emitted: number; advisories: string[] };

export async function runWatcherScan(now: Date = new Date()): Promise<WatcherResult> {
  const rows = await monitorRuns();
  const advisories: string[] = [];

  for (const row of rows) {
    const health = runHealth(row, now);
    if (health === "ok") continue;

    // dedup: was this exact (run, health) already flagged within the window?
    const cutoff = new Date(now.getTime() - DEDUP_MINUTES * 60_000);
    const recent = await db
      .select({ id: feedEvents.id })
      .from(feedEvents)
      .where(
        and(
          eq(feedEvents.kind, "advisory"),
          eq(feedEvents.runId, row.id),
          gte(feedEvents.createdAt, cutoff),
          sql`${feedEvents.payload}->>'health' = ${health}`,
        ),
      )
      .limit(1);
    if (recent.length > 0) continue;

    const summary = advisorySummary(row, health, now);
    const payload = JSON.stringify({
      health,
      cpuPct: row.resources ? Math.round(row.resources.cpuPct) : null,
    });
    // Pull project_id/ticket_id straight off the run so the feed row carries
    // its project + ticket context (a plain insert — advisories are Atlas's
    // own observations, not a Run state transition, so no outbox writer).
    await db.execute(sql`
      insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, payload, seeded)
      select 'advisory', 'Atlas', ${summary}, r.project_id, r.ticket_id, r.id, ${row.ticketRef ?? null}, ${payload}::jsonb, false
      from runs r where r.id = ${row.id}
    `);
    advisories.push(summary);
  }

  return { scanned: rows.length, emitted: advisories.length, advisories };
}

function advisorySummary(row: MonitorRunRow, health: RunHealth, now: Date): string {
  if (health === "runaway") {
    const cpu = row.resources ? Math.round(row.resources.cpuPct) : 0;
    return `${row.ref} — runaway CPU (${cpu}%) on ${row.projectName}. Might be looping; worth a look or a cancel.`;
  }
  const mins = Math.round((now.getTime() - row.since.getTime()) / 60_000);
  return `${row.ref} — quiet ${mins}m with no output on ${row.projectName}. It may be wedged.`;
}
