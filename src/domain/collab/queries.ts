/**
 * M13 — Collaborator read models (T list, collab inbox, collab ticket
 * detail). EVERY query here scopes through THE GUARD's vocabulary —
 * `visibleProjectIds` / `projectAccessFor` from src/domain/people/guard.ts
 * (HANDOFF-M11: never re-derive the two-table join) — so a Collaborator
 * can never read a project they are not rostered on.
 */
import { and, desc, eq, gt, inArray, isNotNull, or, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { feedEvents, projects, runs, tickets, type Ticket } from "@/src/db/schema";
import { projectAccessFor, visibleProjectIds } from "@/src/domain/people/guard";
import type { FeedRow } from "@/src/domain/feed/queries";

import { readMarkFor } from "./read-marks";

/** "their" tickets — filed by this user id, or by their email pre-M13. */
function reporterMatch(userId: string, email: string) {
  return or(
    eq(tickets.reporterUserId, userId),
    and(sql`${tickets.reporterUserId} is null`, sql`lower(${tickets.reporter}) = lower(${email})`),
  );
}

export type CollabTicketRow = Ticket & {
  projectName: string;
  projectSlug: string;
  /** newest Owner-authored note on the ticket (needs-info question, decline reason, reply). */
  ownerNote: string | null;
};

/**
 * The T list: this Collaborator's own tickets across their visible
 * projects, newest-touched first. The roster scope is belt-and-braces —
 * their tickets can only exist on visible projects, but a roster
 * removal (member-removed, HANDOFF-M11) must hide the project's rows
 * immediately, so the IN list governs.
 */
export async function collabTickets(userId: string, email: string): Promise<CollabTicketRow[]> {
  const visible = await visibleProjectIds(userId);
  if (visible.length === 0) return [];
  const rows = await db
    .select({
      ticket: tickets,
      projectName: projects.name,
      projectSlug: projects.slug,
      ownerNote: sql<string | null>`(
        select fe.preview from feed_events fe
        where fe.ticket_id = ${tickets.id}
          and fe.preview is not null
          and fe.kind in ('moved', 'replied')
          and lower(fe.actor) not in (lower(${tickets.reporter}), lower(${email}))
        order by fe.id desc limit 1
      )`,
    })
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .where(and(inArray(tickets.projectId, visible), reporterMatch(userId, email)))
    .orderBy(desc(tickets.updatedAt), desc(tickets.id));
  return rows.map((r) => ({ ...r.ticket, projectName: r.projectName, projectSlug: r.projectSlug, ownerNote: r.ownerNote }));
}

export type CollabTicketDetail = {
  ticket: Ticket;
  projectName: string;
  projectSlug: string;
  /** the shipped run's facts, when one landed (verify line inputs). */
  shippedRun: { diffStats: unknown; prUrl: string | null; mergeSha: string | null } | null;
  /** the conversation: replied rows + moved-with-note rows, oldest first. */
  thread: Array<{
    id: number;
    kind: "replied" | "moved";
    actor: string;
    note: string;
    at: Date;
  }>;
};

/**
 * One ticket, GUARDED: resolves only when `projectAccessFor` says this
 * user may see the ticket's project (collab routes 404 otherwise —
 * charter done criterion 2). Owner-role callers use M8's detail module.
 */
export async function collabTicketByRef(
  ref: string,
  userId: string,
): Promise<CollabTicketDetail | null> {
  const [row] = await db
    .select({ ticket: tickets, projectName: projects.name, projectSlug: projects.slug })
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .where(sql`upper(${tickets.ref}) = upper(${ref})`)
    .limit(1);
  if (!row) return null;
  const access = await projectAccessFor(userId, row.ticket.projectId);
  if (!access.ok) return null;

  const [threadRows, shippedRuns] = await Promise.all([
    db
      .select()
      .from(feedEvents)
      .where(
        and(
          eq(feedEvents.ticketId, row.ticket.id),
          isNotNull(feedEvents.preview),
          inArray(feedEvents.kind, ["replied", "moved"]),
        ),
      )
      .orderBy(feedEvents.id),
    db
      .select({ diffStats: runs.diffStats, prUrl: runs.prUrl, mergeSha: runs.mergeSha })
      .from(runs)
      .where(and(eq(runs.ticketId, row.ticket.id), eq(runs.state, "shipped")))
      .orderBy(desc(runs.updatedAt))
      .limit(1),
  ]);

  return {
    ticket: row.ticket,
    projectName: row.projectName,
    projectSlug: row.projectSlug,
    shippedRun: shippedRuns[0] ?? null,
    thread: threadRows.map((e) => ({
      id: e.id,
      kind: e.kind as "replied" | "moved",
      actor: e.actor,
      note: e.preview!,
      at: e.createdAt,
    })),
  };
}

/**
 * The Collaborator inbox feed: rows from their visible projects only.
 * Project-less rows (bridge governance, profile edits…) are excluded by
 * construction — a NULL project_id is never in the roster list, which
 * is exactly the honest scope (Z's rail: "only if you have a stake").
 */
export async function collabFeedEvents(userId: string, limit = 50): Promise<FeedRow[]> {
  const visible = await visibleProjectIds(userId);
  if (visible.length === 0) return [];
  const rows = await db
    .select({ event: feedEvents, projectName: projects.name, runRef: runs.ref })
    .from(feedEvents)
    .innerJoin(projects, eq(feedEvents.projectId, projects.id))
    .leftJoin(runs, eq(feedEvents.runId, runs.id))
    .where(inArray(feedEvents.projectId, visible))
    .orderBy(desc(feedEvents.createdAt), desc(feedEvents.id))
    .limit(limit);
  return rows.map((r) => ({ ...r.event, projectName: r.projectName, runRef: r.runRef }));
}

/** the project picker rows (file-a-request) — visible projects, named. */
export async function collabProjects(userId: string): Promise<Array<{ id: string; name: string }>> {
  const visible = await visibleProjectIds(userId);
  if (visible.length === 0) return [];
  return db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(inArray(projects.id, visible))
    .orderBy(projects.name);
}

/** unread = visible rows above the user's high-water mark. */
export async function collabUnreadCount(userId: string): Promise<number> {
  const visible = await visibleProjectIds(userId);
  if (visible.length === 0) return 0;
  const mark = await readMarkFor(userId);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(feedEvents)
    .where(and(inArray(feedEvents.projectId, visible), gt(feedEvents.id, mark)));
  return row?.n ?? 0;
}
