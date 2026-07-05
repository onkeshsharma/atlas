/**
 * M6 — Run read models for the cockpit (Today's active strip + the
 * §3.3 Needs Input panel). M7/M8/M9 reuse these; extend here, never
 * inline SQL in pages.
 */
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { projects, runs, tickets } from "@/src/db/schema";

import { parseRunDiffStats } from "./diff-stats";
import { parseNeedsInputQuestion, type NeedsInputQuestion } from "./needs-input";
import { ACTIVE_STATES, type RunState } from "./states";

export type ActiveRunRow = {
  id: string;
  ref: string;
  title: string;
  state: RunState;
  projectName: string;
  ticketRef: string | null;
  /** when the run entered its current state. */
  since: Date;
};

/** queued + running + needs-input, oldest first (queue order). */
export async function activeRuns(): Promise<ActiveRunRow[]> {
  const rows = await db
    .select({
      id: runs.id,
      ref: runs.ref,
      title: runs.title,
      state: runs.state,
      projectName: projects.name,
      ticketRef: tickets.ref,
      since: runs.updatedAt,
    })
    .from(runs)
    .innerJoin(projects, eq(runs.projectId, projects.id))
    .leftJoin(tickets, eq(runs.ticketId, tickets.id))
    .where(inArray(runs.state, [...ACTIVE_STATES]))
    .orderBy(asc(runs.createdAt));
  return rows;
}

export type RunStateCounts = { queued: number; running: number; needsInput: number };

/**
 * Phase 1 — the Podium's live numerals: lightweight counts of active runs by
 * state (no row/join fetch, unlike activeRuns). Runs in the shell layout on
 * every route, so it stays a pure grouped count.
 */
export async function runStateCounts(): Promise<RunStateCounts> {
  const rows = await db
    .select({ state: runs.state, n: count() })
    .from(runs)
    .where(inArray(runs.state, [...ACTIVE_STATES]))
    .groupBy(runs.state);
  const by = new Map(rows.map((r) => [r.state, Number(r.n)]));
  return {
    queued: by.get("queued") ?? 0,
    running: by.get("running") ?? 0,
    needsInput: by.get("needs-input") ?? 0,
  };
}

/**
 * M9 Session B — the Hints engine's real file-overlap source
 * (HANDOFF-M8 seam): each ticket's LATEST owner run that captured diff
 * stats → its actual touched paths. Swapped in at the /board call site
 * only; the engine and its tests see the same FileSets shape.
 */
export async function latestRunFileSets(
  ticketIds: readonly string[],
): Promise<Map<string, readonly string[]>> {
  const map = new Map<string, readonly string[]>();
  if (!ticketIds.length) return map;
  const rows = await db
    .select({
      ticketId: runs.ticketId,
      diffStats: runs.diffStats,
      createdAt: runs.createdAt,
    })
    .from(runs)
    .where(
      and(
        inArray(runs.ticketId, [...ticketIds]),
        eq(runs.lane, "owner"),
        sql`${runs.diffStats} is not null`,
      ),
    )
    .orderBy(desc(runs.createdAt));
  for (const row of rows) {
    if (!row.ticketId || map.has(row.ticketId)) continue; // newest first
    const stats = parseRunDiffStats(row.diffStats);
    if (stats && stats.files.length > 0) {
      map.set(
        row.ticketId,
        stats.files.map((f) => f.path),
      );
    }
  }
  return map;
}

/**
 * Session B — the board cluster's "Ship N →": each ticket's
 * review-ready owner run (the one the ship request targets).
 */
export async function reviewReadyRunsForTickets(
  ticketIds: readonly string[],
): Promise<Map<string, { runId: string; ref: string }>> {
  const map = new Map<string, { runId: string; ref: string }>();
  if (!ticketIds.length) return map;
  const rows = await db
    .select({ ticketId: runs.ticketId, id: runs.id, ref: runs.ref, createdAt: runs.createdAt })
    .from(runs)
    .where(
      and(
        inArray(runs.ticketId, [...ticketIds]),
        eq(runs.lane, "owner"),
        eq(runs.state, "review-ready"),
      ),
    )
    .orderBy(desc(runs.createdAt));
  for (const row of rows) {
    if (!row.ticketId || map.has(row.ticketId)) continue;
    map.set(row.ticketId, { runId: row.id, ref: row.ref });
  }
  return map;
}

export type NeedsInputRow = {
  id: string;
  ref: string;
  title: string;
  projectName: string;
  question: NeedsInputQuestion;
  since: Date;
};

/** the §3.3 panel rows — every needs-input Run with a valid question payload. */
export async function needsInputRuns(): Promise<NeedsInputRow[]> {
  const rows = await db
    .select({
      id: runs.id,
      ref: runs.ref,
      title: runs.title,
      projectName: projects.name,
      question: runs.question,
      since: runs.updatedAt,
    })
    .from(runs)
    .innerJoin(projects, eq(runs.projectId, projects.id))
    .where(eq(runs.state, "needs-input"))
    .orderBy(desc(runs.updatedAt));
  return rows.flatMap((r) => {
    const question = parseNeedsInputQuestion(r.question);
    return question ? [{ ...r, question }] : [];
  });
}
