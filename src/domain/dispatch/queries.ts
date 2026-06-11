/**
 * M9 — Dispatch read models: Brief lookups for the detail page, work
 * orders for the Bridge (sync + per-run fetch), and the queue view.
 * No inline SQL in JSX or route handlers (M6 law).
 */
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import {
  briefs,
  projects,
  runs,
  tickets,
  type Brief,
  type Run,
  type RunHelperKind,
  type RunLane,
} from "@/src/db/schema";

import { parseNeedsInputQuestion, type NeedsInputQuestion } from "../run/needs-input";

/** the Brief the dispatch CTA / detail page acts on — newest first. */
export async function latestBriefForTicket(ticketId: string): Promise<Brief | null> {
  const rows = await db
    .select()
    .from(briefs)
    .where(eq(briefs.ticketId, ticketId))
    .orderBy(desc(briefs.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/** is a Helper Run of this kind already queued/working for the ticket? (CTA honesty) */
export async function activeHelperRun(
  ticketId: string,
  helperKind: RunHelperKind,
): Promise<Run | null> {
  const rows = await db
    .select()
    .from(runs)
    .where(
      and(
        eq(runs.ticketId, ticketId),
        eq(runs.helperKind, helperKind),
        inArray(runs.state, ["queued", "running", "needs-input"]),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** the ticket's most recent Run, any lane — the detail rail's honest hint. */
export async function latestRunForTicket(ticketId: string): Promise<Run | null> {
  const rows = await db
    .select()
    .from(runs)
    .where(and(eq(runs.ticketId, ticketId), eq(runs.lane, "owner")))
    .orderBy(desc(runs.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The work order — everything the Bridge needs to execute a Run
 * (ADR-0002 §3: fetched before claim; localPath decides the worktree).
 */
export type WorkOrder = {
  runId: string;
  ref: string;
  title: string;
  state: Run["state"];
  lane: RunLane;
  helperKind: RunHelperKind | null;
  queuePosition: number | null;
  project: { id: string; name: string; slug: string; localPath: string | null };
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

function toWorkOrder(row: {
  run: Run;
  projectId: string;
  projectName: string;
  projectSlug: string;
  localPath: string | null;
  ticketId: string | null;
  ticketRef: string | null;
  ticketTitle: string | null;
  ticketBody: string | null;
  ticketKind: string | null;
  ticketPriority: string | null;
  briefBody: string | null;
}): WorkOrder {
  return {
    runId: row.run.id,
    ref: row.run.ref,
    title: row.run.title,
    state: row.run.state,
    lane: row.run.lane,
    helperKind: row.run.helperKind,
    queuePosition: row.run.queuePosition,
    project: {
      id: row.projectId,
      name: row.projectName,
      slug: row.projectSlug,
      localPath: row.localPath,
    },
    ticket:
      row.ticketId && row.ticketRef && row.ticketTitle !== null
        ? {
            id: row.ticketId,
            ref: row.ticketRef,
            title: row.ticketTitle,
            body: row.ticketBody ?? "",
            kind: row.ticketKind,
            priority: row.ticketPriority ?? "whenever",
          }
        : null,
    briefBody: row.briefBody,
    question: parseNeedsInputQuestion(row.run.question),
  };
}

const workOrderSelection = {
  run: runs,
  projectId: projects.id,
  projectName: projects.name,
  projectSlug: projects.slug,
  localPath: projects.localPath,
  ticketId: tickets.id,
  ticketRef: tickets.ref,
  ticketTitle: tickets.title,
  ticketBody: tickets.body,
  ticketKind: sql<string | null>`${tickets.kind}::text`,
  ticketPriority: sql<string | null>`${tickets.priority}::text`,
  briefBody: briefs.body,
};

/** one run's work order (Bridge GET before claim). */
export async function workOrder(runId: string): Promise<WorkOrder | null> {
  const rows = await db
    .select(workOrderSelection)
    .from(runs)
    .innerJoin(projects, eq(runs.projectId, projects.id))
    .leftJoin(tickets, eq(runs.ticketId, tickets.id))
    .leftJoin(briefs, eq(runs.briefId, briefs.id))
    .where(eq(runs.id, runId))
    .limit(1);
  return rows.length ? toWorkOrder(rows[0]) : null;
}

/**
 * Every queued run as a work order, owner lane first then queue order —
 * the Bridge sync snapshot (offline queueing, PRD #35) and the
 * scheduler's input ordering (PRD #21: helpers always yield).
 */
export async function queuedWorkOrders(): Promise<WorkOrder[]> {
  const rows = await db
    .select(workOrderSelection)
    .from(runs)
    .innerJoin(projects, eq(runs.projectId, projects.id))
    .leftJoin(tickets, eq(runs.ticketId, tickets.id))
    .leftJoin(briefs, eq(runs.briefId, briefs.id))
    .where(eq(runs.state, "queued"))
    .orderBy(asc(runs.lane), asc(runs.queuePosition), asc(runs.createdAt));
  // pg enum order is declaration order (owner before helper) — explicit
  // sort keeps the contract independent of enum internals.
  return rows
    .map(toWorkOrder)
    .sort((a, b) =>
      a.lane === b.lane
        ? (a.queuePosition ?? 0) - (b.queuePosition ?? 0)
        : a.lane === "owner"
          ? -1
          : 1,
    );
}

/** runs a given Bridge is supposed to be executing (sync orphan sweep). */
export async function activeRunsForBridge(
  bridgeId: string,
): Promise<Array<{ runId: string; state: Run["state"] }>> {
  const rows = await db
    .select({ runId: runs.id, state: runs.state })
    .from(runs)
    .where(and(eq(runs.bridgeId, bridgeId), inArray(runs.state, ["running", "needs-input"])));
  return rows;
}

/**
 * Session B — ship requests pending on this Bridge's kept worktrees
 * (review-ready + ship_requested_at set). Sync carries these so an
 * approve-and-ship clicked while the daemon was offline executes on
 * reconnect (ADR-0002 §2: catch-up is DB state, the PRD #35 sibling).
 */
export async function shipRequestedRunsForBridge(bridgeId: string): Promise<string[]> {
  const rows = await db
    .select({ runId: runs.id })
    .from(runs)
    .where(
      and(
        eq(runs.bridgeId, bridgeId),
        eq(runs.state, "review-ready"),
        sql`${runs.shipRequestedAt} is not null`,
      ),
    );
  return rows.map((r) => r.runId);
}
