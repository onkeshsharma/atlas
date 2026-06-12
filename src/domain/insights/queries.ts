/**
 * M16 — the Insights read model: one query pass assembling everything
 * /insights (and its CSV export) renders. All numbers are derived by
 * ./derive.ts pure functions over real rows — feed_events (the
 * timestamped record), tickets, runs, projects, context_terms. ZERO new
 * tables (charter hard wall); where the record holds nothing (Engine
 * hours), the SURFACE names the gap — this module never fabricates.
 */
import { and, count, eq, gte, inArray, lt, max, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { contextTerms, feedEvents, projects, runs, ticketLinks, tickets } from "@/src/db/schema";
import { OPEN_TICKET_STATES } from "@/src/domain/ticket/states";

import {
  halfWindowMedians,
  helperLoad,
  perProject,
  percentileRows,
  rangeWindow,
  runOutcomes,
  slowestProject,
  stragglers,
  timeToShipPairs,
  velocity,
  weeklyThroughput,
  type HelperLoad,
  type InsightsRange,
  type OutcomeEvent,
  type PercentileRow,
  type ProjectInsightRow,
  type RangeWindow,
  type RunOutcomes,
  type ShipPair,
  type StragglerRow,
  type Throughput,
  type Velocity,
} from "./derive";

export type ContextFreshness = {
  /** confirmed terms on the project; 0 = no curated Context yet. */
  confirmedTerms: number;
  lastTouchedAt: Date | null;
};

export type InsightsData = {
  window: RangeWindow;
  now: Date;
  throughput: Throughput;
  /** median filed→shipped over the window's pairs; null = unmeasured. */
  medianMs: number | null;
  pairCount: number;
  percentiles: PercentileRow[];
  /** first-half vs second-half medians for the Engine-read trend. */
  trend: { firstMs: number | null; secondMs: number | null };
  velocity: Velocity;
  outcomes: RunOutcomes;
  helpers: HelperLoad;
  projects: ProjectInsightRow[];
  slowest: ProjectInsightRow | null;
  /** Context freshness for the slowest project (Engine-suggests card). */
  slowestContext: ContextFreshness | null;
  stragglers: StragglerRow[];
};

export async function insightsData(
  range: InsightsRange,
  now: Date = new Date(),
): Promise<InsightsData> {
  const window = rangeWindow(range, now);

  const [outcomeRows, lifecycleRows, projectRows, laneRows, openRows, prevShipped] =
    await Promise.all([
      // terminal outcome events in window (plus none before — the window
      // filter happens here; weeklyThroughput re-checks for safety).
      db
        .select({
          kind: feedEvents.kind,
          at: feedEvents.createdAt,
          projectId: feedEvents.projectId,
          ticketId: feedEvents.ticketId,
          runId: feedEvents.runId,
        })
        .from(feedEvents)
        .where(
          and(
            inArray(feedEvents.kind, ["shipped", "failed", "cancelled"]),
            ...(window.from ? [gte(feedEvents.createdAt, window.from)] : []),
          ),
        ),
      // full filed/shipped history with the ticket's project — pairs may
      // begin before the window; only the SHIP date decides membership.
      db
        .select({
          kind: feedEvents.kind,
          at: feedEvents.createdAt,
          ticketId: feedEvents.ticketId,
          projectId: tickets.projectId,
        })
        .from(feedEvents)
        .innerJoin(tickets, eq(feedEvents.ticketId, tickets.id))
        .where(inArray(feedEvents.kind, ["filed", "shipped"])),
      db.select({ id: projects.id, name: projects.name, slug: projects.slug }).from(projects),
      db
        .select({ lane: runs.lane })
        .from(runs)
        .where(window.from ? gte(runs.createdAt, window.from) : undefined),
      openTicketRows(),
      window.from && window.prevFrom
        ? db
            .select({ n: count() })
            .from(feedEvents)
            .where(
              and(
                eq(feedEvents.kind, "shipped"),
                gte(feedEvents.createdAt, window.prevFrom),
                lt(feedEvents.createdAt, window.from),
              ),
            )
            .then((r) => Number(r[0]?.n ?? 0))
        : Promise.resolve(null),
    ]);

  const outcomes: OutcomeEvent[] = outcomeRows.map((r) => ({
    kind: r.kind as OutcomeEvent["kind"],
    at: r.at,
    projectId: r.projectId,
    ticketId: r.ticketId,
    runId: r.runId,
  }));

  const allPairs = timeToShipPairs(
    lifecycleRows.flatMap((r) =>
      r.ticketId ? [{ kind: r.kind as "filed" | "shipped", ticketId: r.ticketId, at: r.at }] : [],
    ),
  );
  const pairs: ShipPair[] = window.from
    ? allPairs.filter((p) => p.shippedAt >= window.from!)
    : allPairs;
  const ticketProject = new Map<string, string>();
  for (const r of lifecycleRows) {
    if (r.ticketId) ticketProject.set(r.ticketId, r.projectId);
  }

  const throughput = weeklyThroughput(outcomes, window, now);
  const projectInsights = perProject(outcomes, pairs, ticketProject, projectRows);
  const slowest = slowestProject(projectInsights);
  const deltas = pairs.map((p) => p.deltaMs);

  return {
    window,
    now,
    throughput,
    medianMs: deltas.length ? percentileRows(deltas)[1].ms : null,
    pairCount: pairs.length,
    percentiles: percentileRows(deltas),
    trend: halfWindowMedians(pairs, window, now),
    velocity: velocity(throughput.totalShipped, prevShipped),
    outcomes: runOutcomes(outcomes),
    helpers: helperLoad(laneRows.map((r) => r.lane)),
    projects: projectInsights,
    slowest,
    slowestContext: slowest ? await contextFreshness(slowest.slug) : null,
    stragglers: stragglers(openRows, now),
  };
}

/**
 * open tickets with best-evidence state-entry time:
 * latest feed row whose payload.to equals the current state (the M8
 * `moved` rows + M9 run-driven moves) → the `filed` row for
 * triage-born tickets → last touch (updatedAt) as the honest floor.
 */
async function openTicketRows() {
  const rows = await db
    .select({
      id: tickets.id,
      ref: tickets.ref,
      title: tickets.title,
      state: tickets.state,
      projectName: projects.name,
      // epoch ms — raw sql fragments come back as driver strings, and
      // numerics survive Number() where timestamp text formats don't.
      enteredStateAtMs: sql<string | null>`extract(epoch from (
        select max(fe.created_at) from feed_events fe
        where fe.ticket_id = ${tickets.id}
          and (
            fe.payload->>'to' = ${tickets.state}::text
            or (fe.kind = 'filed' and ${tickets.state}::text = 'triage')
          )
      )) * 1000`,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .where(inArray(tickets.state, [...OPEN_TICKET_STATES]));

  // open blockers per blocked ticket (the OO "blocked-by T-279" meta).
  const blockers = await db
    .select({ blockedId: ticketLinks.blockedId, blockerRef: tickets.ref })
    .from(ticketLinks)
    .innerJoin(tickets, eq(ticketLinks.blockerId, tickets.id))
    .where(inArray(tickets.state, [...OPEN_TICKET_STATES]));
  const blockedBy = new Map(blockers.map((b) => [b.blockedId, b.blockerRef]));

  return rows.map((r) => ({
    ref: r.ref,
    title: r.title,
    state: r.state as string,
    projectName: r.projectName,
    enteredStateAt: r.enteredStateAtMs ? new Date(Number(r.enteredStateAtMs)) : r.updatedAt,
    blockedBy: blockedBy.get(r.id),
  }));
}

/** Context curation freshness for one project (Engine-suggests evidence). */
async function contextFreshness(slug: string): Promise<ContextFreshness | null> {
  const [row] = await db
    .select({
      confirmedTerms: count(sql`case when ${contextTerms.status} = 'confirmed' then 1 end`),
      lastTouchedAt: max(contextTerms.updatedAt),
    })
    .from(contextTerms)
    .innerJoin(projects, eq(contextTerms.projectId, projects.id))
    .where(eq(projects.slug, slug));
  if (!row) return { confirmedTerms: 0, lastTouchedAt: null };
  return {
    confirmedTerms: Number(row.confirmedTerms ?? 0),
    lastTouchedAt: row.lastTouchedAt,
  };
}
