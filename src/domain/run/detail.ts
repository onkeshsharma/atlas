/**
 * M9 Session B — the Run detail read model (K / V / RR / KK all read
 * THIS; no inline SQL in pages — M6 law).
 *
 * Milestones come from the run's own feed_events rows — every transition
 * wrote one in the same statement that flipped the row (THE OUTBOX
 * RULE), so the state track renders REAL timestamps, not the M8
 * "earlier" placeholder.
 */
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/src/db/client";
import {
  bridges,
  feedEvents,
  projects,
  runs,
  tickets,
  type FeedEventKind,
  type Run,
} from "@/src/db/schema";

export type RunMilestone = {
  kind: FeedEventKind;
  actor: string;
  at: Date;
};

export type RunDetail = {
  run: Run;
  project: { id: string; name: string; slug: string };
  ticket: { id: string; ref: string; title: string; state: string } | null;
  bridge: { name: string; engine: string | null } | null;
  milestones: RunMilestone[];
};

const MILESTONE_KINDS: FeedEventKind[] = [
  "dispatched",
  "started",
  "needs-input",
  "answered",
  "review-ready",
  "ship-requested",
  "shipped",
  "failed",
  "cancelled",
];

/** the newest run wearing this ref (refs are sequence-drawn and unique in practice). */
export async function runDetailByRef(ref: string): Promise<RunDetail | null> {
  const rows = await db
    .select({
      run: runs,
      projectId: projects.id,
      projectName: projects.name,
      projectSlug: projects.slug,
      ticketId: tickets.id,
      ticketRef: tickets.ref,
      ticketTitle: tickets.title,
      ticketState: tickets.state,
      bridgeName: bridges.name,
      bridgeCapabilities: bridges.capabilities,
    })
    .from(runs)
    .innerJoin(projects, eq(runs.projectId, projects.id))
    .leftJoin(tickets, eq(runs.ticketId, tickets.id))
    .leftJoin(bridges, eq(runs.bridgeId, bridges.id))
    .where(eq(runs.ref, ref))
    .orderBy(desc(runs.createdAt))
    .limit(1);
  if (!rows.length) return null;
  const row = rows[0];

  const milestoneRows = await db
    .select({
      kind: feedEvents.kind,
      actor: feedEvents.actor,
      at: feedEvents.createdAt,
    })
    .from(feedEvents)
    .where(and(eq(feedEvents.runId, row.run.id), inArray(feedEvents.kind, MILESTONE_KINDS)))
    .orderBy(asc(feedEvents.id));

  const capabilities =
    typeof row.bridgeCapabilities === "object" &&
    row.bridgeCapabilities !== null &&
    !Array.isArray(row.bridgeCapabilities)
      ? (row.bridgeCapabilities as Record<string, unknown>)
      : null;

  return {
    run: row.run,
    project: { id: row.projectId, name: row.projectName, slug: row.projectSlug },
    ticket:
      row.ticketId && row.ticketRef
        ? {
            id: row.ticketId,
            ref: row.ticketRef,
            title: row.ticketTitle ?? "",
            state: String(row.ticketState ?? ""),
          }
        : null,
    bridge: row.bridgeName
      ? {
          name: row.bridgeName,
          engine: typeof capabilities?.engine === "string" ? capabilities.engine : null,
        }
      : null,
    milestones: milestoneRows,
  };
}

export type QueuedAfterRow = {
  id: string;
  ref: string;
  title: string;
  ticketRef: string | null;
  queuePosition: number | null;
  createdAt: Date;
};

/** RR:340–362 "Queue after this" — the real queue, this run excluded. */
export async function queuedRuns(excludeRunId?: string): Promise<QueuedAfterRow[]> {
  const rows = await db
    .select({
      id: runs.id,
      ref: runs.ref,
      title: runs.title,
      ticketRef: tickets.ref,
      queuePosition: runs.queuePosition,
      createdAt: runs.createdAt,
      lane: runs.lane,
    })
    .from(runs)
    .leftJoin(tickets, eq(runs.ticketId, tickets.id))
    .where(eq(runs.state, "queued"))
    .orderBy(asc(runs.lane), asc(runs.queuePosition), asc(runs.createdAt));
  return rows
    .filter((r) => r.id !== excludeRunId)
    .map((r) => ({
      id: r.id,
      ref: r.ref,
      title: r.title,
      ticketRef: r.ticketRef,
      queuePosition: r.queuePosition,
      createdAt: r.createdAt,
    }));
}

/** first milestone of a kind — "started 37s ago", duration math. */
export function milestoneAt(milestones: RunMilestone[], kind: FeedEventKind): Date | null {
  return milestones.find((m) => m.kind === kind)?.at ?? null;
}

/** who clicked dispatch (RR:317 "Dispatched by"). */
export function dispatchedBy(milestones: RunMilestone[]): string | null {
  const m = milestones.find((row) => row.kind === "dispatched");
  if (!m) return null;
  return m.actor === "you" ? "you" : m.actor;
}
