/**
 * M6 — Today's read models. Every number on the cockpit comes from
 * these queries — no hardcoded counts in JSX (charter §1).
 */
import { and, count, desc, eq, gte, inArray, lt, max, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { feedEvents, projects, runs, tickets, type Ticket } from "@/src/db/schema";

/** the hero sentence's three numerals (E:122–140). */
export type HeroCounts = { triage: number; reviewReady: number; failed: number };

export async function heroCounts(): Promise<HeroCounts> {
  const rows = await db
    .select({ state: tickets.state, n: count() })
    .from(tickets)
    .where(inArray(tickets.state, ["triage", "review-ready", "failed"]))
    .groupBy(tickets.state);
  const by = new Map(rows.map((r) => [r.state, Number(r.n)]));
  return {
    triage: by.get("triage") ?? 0,
    reviewReady: by.get("review-ready") ?? 0,
    failed: by.get("failed") ?? 0,
  };
}

/** open = any non-terminal ticket (E's "7 open"). */
const OPEN_STATES = ["triage", "backlog", "in-progress", "review-ready", "failed"] as const;

export type ProjectRow = {
  id: string;
  name: string;
  /** M7 — route key + honest ingest state for /projects rows. */
  slug: string;
  ingestStatus: "none" | "queued" | "ready";
  createdAt: Date;
  pinned: boolean;
  openCount: number;
  lastActivityAt: Date | null;
};

/** all projects + open counts + last feed activity, pinned first. */
export async function projectRows(): Promise<ProjectRow[]> {
  const openCounts = db
    .select({ projectId: tickets.projectId, n: count().as("n") })
    .from(tickets)
    .where(inArray(tickets.state, [...OPEN_STATES]))
    .groupBy(tickets.projectId)
    .as("open_counts");
  const lastActivity = db
    .select({
      projectId: feedEvents.projectId,
      at: max(feedEvents.createdAt).as("at"),
    })
    .from(feedEvents)
    .groupBy(feedEvents.projectId)
    .as("last_activity");

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      ingestStatus: projects.ingestStatus,
      createdAt: projects.createdAt,
      pinned: projects.pinned,
      openCount: sql<number>`coalesce(${openCounts.n}, 0)`,
      lastActivityAt: lastActivity.at,
    })
    .from(projects)
    .leftJoin(openCounts, eq(openCounts.projectId, projects.id))
    .leftJoin(lastActivity, eq(lastActivity.projectId, projects.id))
    .orderBy(desc(projects.pinned), projects.name);
  return rows.map((r) => ({ ...r, openCount: Number(r.openCount) }));
}

export type RecentTicketRow = Ticket & { projectName: string };

/** the Recent feed (E:248–286) — latest-touched tickets. */
export async function recentTickets(limit = 12): Promise<RecentTicketRow[]> {
  const rows = await db
    .select({ ticket: tickets, projectName: projects.name })
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .orderBy(desc(tickets.updatedAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.ticket, projectName: r.projectName }));
}

/** review-ready tickets for the rail's Ready-to-ship card (E:354–377). */
export async function readyToShipTickets(): Promise<Pick<Ticket, "id" | "ref" | "title">[]> {
  return db
    .select({ id: tickets.id, ref: tickets.ref, title: tickets.title })
    .from(tickets)
    .where(eq(tickets.state, "review-ready"))
    .orderBy(tickets.ref);
}

export type WeekStats = {
  shippedThisWeek: number;
  shippedLastWeek: number;
  runsFinishedThisWeek: number;
  ticketsFiledThisWeek: number;
  /** Mon..Sun shipped counts for the §2.19 WeekBars (E:324–350). */
  weekBars: number[];
  /** 0-based index of today within Mon..Sun. */
  todayIndex: number;
};

/** start of the local Monday for a given date. */
export function weekStart(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day);
  return d;
}

export async function weekStats(now: Date = new Date()): Promise<WeekStats> {
  const thisWeek = weekStart(now);
  const lastWeek = new Date(thisWeek);
  lastWeek.setDate(lastWeek.getDate() - 7);

  // Helper-Run completions also travel review-ready → shipped through
  // applyRunTransition, so their feed rows read `shipped` — but an enrichment
  // landing is NOT a code landing. Count a ship only when it has no run
  // (legacy/seed history) or its run is OWNER-lane. Mirrors the canonical
  // scope in insights/queries.ts (§ownerLaneOnly) so Today and Insights agree.
  const shippedRows = await db
    .select({ at: feedEvents.createdAt })
    .from(feedEvents)
    .leftJoin(runs, eq(feedEvents.runId, runs.id))
    .where(
      and(
        eq(feedEvents.kind, "shipped"),
        sql`(${feedEvents.runId} is null or ${runs.lane} = 'owner')`,
        gte(feedEvents.createdAt, lastWeek),
      ),
    );

  let shippedThisWeek = 0;
  let shippedLastWeek = 0;
  const weekBars = new Array(7).fill(0);
  for (const { at } of shippedRows) {
    if (at >= thisWeek) {
      shippedThisWeek++;
      weekBars[(at.getDay() + 6) % 7]++;
    } else {
      shippedLastWeek++;
    }
  }

  const [finished] = await db
    .select({ n: count() })
    .from(feedEvents)
    .where(
      and(
        inArray(feedEvents.kind, ["review-ready", "shipped", "failed", "cancelled"]),
        gte(feedEvents.createdAt, thisWeek),
        sql`${feedEvents.runId} is not null`,
      ),
    );
  const [filed] = await db
    .select({ n: count() })
    .from(feedEvents)
    .where(and(eq(feedEvents.kind, "filed"), gte(feedEvents.createdAt, thisWeek), lt(feedEvents.createdAt, now)));

  return {
    shippedThisWeek,
    shippedLastWeek,
    runsFinishedThisWeek: Number(finished?.n ?? 0),
    ticketsFiledThisWeek: Number(filed?.n ?? 0),
    weekBars,
    todayIndex: (now.getDay() + 6) % 7,
  };
}
