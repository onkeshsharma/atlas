/**
 * M8 — Work-surface read models (board G · triage I · detail F · file S).
 * Every number/row those pages render comes from here — no inline SQL in
 * JSX (M6 law). Reuses the M6 outbox (`feed_events`) as the activity log.
 */
import { asc, desc, eq, inArray, or, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import {
  feedEvents,
  projects,
  ticketLinks,
  tickets,
  type FeedEvent,
  type Ticket,
} from "@/src/db/schema";

import { OPEN_TICKET_STATES } from "./states";

export type WorkTicket = Ticket & { projectName: string };

/**
 * The whole board, newest-touched first (the board's per-column ordering
 * law — deterministic, derived; a manual order column waits for a real
 * reorder interaction). Grouping into Categories happens in the page via
 * ticketCategory().
 */
export async function boardTickets(): Promise<WorkTicket[]> {
  const rows = await db
    .select({ ticket: tickets, projectName: projects.name })
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .orderBy(desc(tickets.updatedAt), desc(tickets.ref));
  return rows.map((r) => ({ ...r.ticket, projectName: r.projectName }));
}

/** triage I's queue — oldest filed first ("1 of 5" reads in filing order). */
export async function triageQueue(): Promise<WorkTicket[]> {
  const rows = await db
    .select({ ticket: tickets, projectName: projects.name })
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .where(eq(tickets.state, "triage"))
    .orderBy(asc(tickets.createdAt), asc(tickets.ref));
  return rows.map((r) => ({ ...r.ticket, projectName: r.projectName }));
}

export async function ticketByRef(ref: string): Promise<WorkTicket | null> {
  const rows = await db
    .select({ ticket: tickets, projectName: projects.name })
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .where(sql`upper(${tickets.ref}) = ${ref.toUpperCase()}`)
    .limit(1);
  if (!rows.length) return null;
  return { ...rows[0].ticket, projectName: rows[0].projectName };
}

/** the detail page's Activity section (F:177–199) — this ticket's feed rows, oldest first. */
export async function ticketActivity(ticketId: string): Promise<FeedEvent[]> {
  return db
    .select()
    .from(feedEvents)
    .where(eq(feedEvents.ticketId, ticketId))
    .orderBy(asc(feedEvents.createdAt), asc(feedEvents.id));
}

export type RelatedTicket = {
  id: string;
  ref: string;
  title: string;
  state: Ticket["state"];
  /** how this ticket relates to the page's ticket. */
  relation: "blocks" | "blocked-by";
};

/** F's Related rail + notes-footer blockers — declared edges, both directions (PRD #16). */
export async function relatedTickets(ticketId: string): Promise<RelatedTicket[]> {
  const edges = await db
    .select()
    .from(ticketLinks)
    .where(or(eq(ticketLinks.blockerId, ticketId), eq(ticketLinks.blockedId, ticketId)));
  if (!edges.length) return [];

  const otherIds = edges.map((e) => (e.blockerId === ticketId ? e.blockedId : e.blockerId));
  const others = await db
    .select({ id: tickets.id, ref: tickets.ref, title: tickets.title, state: tickets.state })
    .from(tickets)
    .where(inArray(tickets.id, otherIds));
  const byId = new Map(others.map((t) => [t.id, t]));

  return edges.flatMap((e) => {
    const otherId = e.blockerId === ticketId ? e.blockedId : e.blockerId;
    const other = byId.get(otherId);
    if (!other) return [];
    return [
      {
        ...other,
        // e.blocker === page ticket ⇒ the OTHER ticket is blocked by us.
        relation: e.blockerId === ticketId ? ("blocked-by" as const) : ("blocks" as const),
      },
    ];
  });
}

/** every declared edge — the Hints engine's hard-dependency input. */
export async function allTicketLinks(): Promise<Array<{ blockerId: string; blockedId: string }>> {
  return db
    .select({ blockerId: ticketLinks.blockerId, blockedId: ticketLinks.blockedId })
    .from(ticketLinks);
}

/** S's "Recently filed here" rail (S:244–269) — latest filed, any state. */
export async function recentlyFiled(limit = 3): Promise<WorkTicket[]> {
  const rows = await db
    .select({ ticket: tickets, projectName: projects.name })
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .orderBy(desc(tickets.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.ticket, projectName: r.projectName }));
}

export type StuckInsight = { ref: string; days: number };

/** G:162–165 — the oldest-untouched open ticket, surfaced when it's been quiet ≥2 days. */
export async function stuckInsight(now: Date = new Date()): Promise<StuckInsight | null> {
  const [row] = await db
    .select({ ref: tickets.ref, updatedAt: tickets.updatedAt })
    .from(tickets)
    .where(inArray(tickets.state, [...OPEN_TICKET_STATES]))
    .orderBy(asc(tickets.updatedAt))
    .limit(1);
  if (!row) return null;
  const days = Math.floor((now.getTime() - row.updatedAt.getTime()) / 86_400_000);
  return days >= 2 ? { ref: row.ref, days } : null;
}
