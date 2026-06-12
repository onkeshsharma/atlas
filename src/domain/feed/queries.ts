/**
 * M6 — feed_events read/write models: the inbox (Z), Today's activity
 * rail (E:389–441), presence, and unread counts.
 */
import { and, count, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { feedEvents, projects, runs, type FeedEvent } from "@/src/db/schema";

// M12 — `runRef` rides along so inbox Run rows can link to /runs/[ref]
// (the charter's Today/inbox wiring; feed rows store run_id only).
export type FeedRow = FeedEvent & { projectName: string | null; runRef: string | null };

/** newest first, with project display name. `projectId` scopes to one project (M7). */
export async function recentFeedEvents(limit = 50, projectId?: string): Promise<FeedRow[]> {
  const rows = await db
    .select({ event: feedEvents, projectName: projects.name, runRef: runs.ref })
    .from(feedEvents)
    .leftJoin(projects, eq(feedEvents.projectId, projects.id))
    .leftJoin(runs, eq(feedEvents.runId, runs.id))
    .where(projectId ? eq(feedEvents.projectId, projectId) : undefined)
    .orderBy(desc(feedEvents.createdAt), desc(feedEvents.id))
    .limit(limit);
  return rows.map((r) => ({ ...r.event, projectName: r.projectName, runRef: r.runRef }));
}

/** inbox unread badge (instance-level read marker — see schema note). */
export async function unreadCount(): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(feedEvents)
    .where(isNull(feedEvents.readAt));
  return row?.n ?? 0;
}

/** "mark all read →" (Z:165, glyph per canon §3.6). */
export async function markAllRead(): Promise<void> {
  await db.update(feedEvents).set({ readAt: new Date() }).where(isNull(feedEvents.readAt));
}

/**
 * distinct actors with events since local midnight — the presence line
 * (E:143–152). `projectId` scopes to one project (M7 — O:131's
 * project-level presence).
 */
export async function actorsActiveToday(dayStart: Date, projectId?: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ actor: feedEvents.actor })
    .from(feedEvents)
    .where(
      projectId
        ? and(gte(feedEvents.createdAt, dayStart), eq(feedEvents.projectId, projectId))
        : gte(feedEvents.createdAt, dayStart),
    );
  return rows.map((r) => r.actor).sort();
}

/** count of events per kind within [from, to) — week stats + inbox rail. */
export async function kindCountSince(
  kind: FeedEvent["kind"],
  from: Date,
  to?: Date,
): Promise<number> {
  const conditions = [eq(feedEvents.kind, kind), gte(feedEvents.createdAt, from)];
  if (to) conditions.push(lt(feedEvents.createdAt, to));
  const [row] = await db
    .select({ n: count() })
    .from(feedEvents)
    .where(and(...conditions));
  return row?.n ?? 0;
}

/** total events within [from, to). */
export async function eventCountSince(from: Date, to?: Date): Promise<number> {
  const conditions = [gte(feedEvents.createdAt, from)];
  if (to) conditions.push(lt(feedEvents.createdAt, to));
  const [row] = await db
    .select({ n: count() })
    .from(feedEvents)
    .where(and(...conditions));
  return row?.n ?? 0;
}

/**
 * per-project event counts for the pinned-strip sparklines (E:222–237):
 * 7 buckets, oldest → today, per project id.
 */
export async function activitySparklines(days = 7): Promise<Map<string, number[]>> {
  const rows = await db
    .select({
      projectId: feedEvents.projectId,
      day: sql<string>`to_char(date_trunc('day', ${feedEvents.createdAt}), 'YYYY-MM-DD')`,
      n: count(),
    })
    .from(feedEvents)
    .where(
      and(
        gte(feedEvents.createdAt, sql`now() - make_interval(days => ${days - 1})`),
        sql`${feedEvents.projectId} is not null`,
      ),
    )
    .groupBy(feedEvents.projectId, sql`date_trunc('day', ${feedEvents.createdAt})`);

  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  const map = new Map<string, number[]>();
  for (const row of rows) {
    if (!row.projectId) continue;
    const spark = map.get(row.projectId) ?? new Array(days).fill(0);
    const idx = keys.indexOf(row.day);
    if (idx >= 0) spark[idx] = Number(row.n);
    map.set(row.projectId, spark);
  }
  return map;
}
