/**
 * M7 — Project read models: the landing's aggregates (O), the context
 * viewer's terms (P), and the ingest page's parse (J).
 *
 * Cross-project aggregates REUSE M6's helpers (charter §2): the index
 * page + R's rail read cockpit projectRows(); per-project feed slices
 * go through feed/queries' projectId parameter — never re-inlined here.
 */
import { and, asc, count, desc, eq, gte } from "drizzle-orm";

import { db } from "@/src/db/client";
import {
  contextTerms,
  projects,
  ticketPins,
  tickets,
  type ContextTerm,
  type Project,
  type Ticket,
  type TicketState,
} from "@/src/db/schema";

import { parseIngestSummary, type IngestSummary } from "./ingest-summary";

export async function projectBySlug(slug: string): Promise<Project | null> {
  const [row] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
  return row ?? null;
}

/** the parsed Engine summary, or null when absent/malformed (never trust jsonb). */
export function projectIngestSummary(project: Project): IngestSummary | null {
  return project.ingestStatus === "ready" ? parseIngestSummary(project.ingestSummary) : null;
}

/** open = any non-terminal ticket (the M6 vocabulary). */
const OPEN_STATES = ["triage", "backlog", "in-progress", "review-ready", "failed"] as const;

export type TicketStateCounts = {
  open: number;
  byState: Record<TicketState, number>;
};

/** O's count sentence + rail breakdown — one grouped query. */
export async function ticketStateCounts(projectId: string): Promise<TicketStateCounts> {
  const rows = await db
    .select({ state: tickets.state, n: count() })
    .from(tickets)
    .where(eq(tickets.projectId, projectId))
    .groupBy(tickets.state);
  const byState = {
    triage: 0,
    backlog: 0,
    "in-progress": 0,
    "review-ready": 0,
    shipped: 0,
    failed: 0,
    declined: 0,
  } satisfies Record<TicketState, number>;
  for (const r of rows) byState[r.state] = Number(r.n);
  const open = OPEN_STATES.reduce((sum, s) => sum + byState[s], 0);
  return { open, byState };
}

export type PinnedTicketRow = Pick<Ticket, "id" | "ref" | "title" | "state" | "reporter"> & {
  pinnedAt: Date;
  updatedAt: Date;
};

/** the landing's Pinned section (O:193–229) — ticket_pins ∩ this project. */
export async function pinnedTickets(projectId: string): Promise<PinnedTicketRow[]> {
  return db
    .select({
      id: tickets.id,
      ref: tickets.ref,
      title: tickets.title,
      state: tickets.state,
      reporter: tickets.reporter,
      pinnedAt: ticketPins.createdAt,
      updatedAt: tickets.updatedAt,
    })
    .from(ticketPins)
    .innerJoin(tickets, eq(ticketPins.ticketId, tickets.id))
    .where(eq(tickets.projectId, projectId))
    .orderBy(asc(ticketPins.createdAt));
}

/** review-ready tickets for the landing's ship card (O:346–365). */
export async function reviewReadyTickets(
  projectId: string,
): Promise<Pick<Ticket, "id" | "ref" | "title">[]> {
  return db
    .select({ id: tickets.id, ref: tickets.ref, title: tickets.title })
    .from(tickets)
    .where(and(eq(tickets.projectId, projectId), eq(tickets.state, "review-ready")))
    .orderBy(tickets.ref);
}

/** the most recently failed open ticket — O:143's "worth a look" insight. */
export async function latestFailedTicket(
  projectId: string,
): Promise<Pick<Ticket, "ref" | "title" | "updatedAt"> | null> {
  const [row] = await db
    .select({ ref: tickets.ref, title: tickets.title, updatedAt: tickets.updatedAt })
    .from(tickets)
    .where(and(eq(tickets.projectId, projectId), eq(tickets.state, "failed")))
    .orderBy(desc(tickets.updatedAt))
    .limit(1);
  return row ?? null;
}

export type ContextTermsView = {
  confirmed: ContextTerm[];
  suggested: ContextTerm[];
  /** latest updated_at across all terms — the doc's provenance line (P:79–82). */
  updatedAt: Date | null;
};

/** P's Language + "Words the Engine noticed" sections. */
export async function contextTermsFor(projectId: string): Promise<ContextTermsView> {
  const rows = await db
    .select()
    .from(contextTerms)
    .where(eq(contextTerms.projectId, projectId))
    // deterministic render order (seed rows share created_at timestamps)
    .orderBy(asc(contextTerms.createdAt), asc(contextTerms.term));
  const confirmed = rows.filter((t) => t.status === "confirmed");
  const suggested = rows.filter((t) => t.status === "suggested");
  const updatedAt = rows.length
    ? rows.map((t) => t.updatedAt).reduce((a, b) => (a > b ? a : b))
    : null;
  return { confirmed, suggested, updatedAt };
}

/** shipped tickets this week for the landing rail (O:303–306). */
export async function shippedThisWeek(projectId: string, weekStart: Date): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(tickets)
    .where(
      and(
        eq(tickets.projectId, projectId),
        eq(tickets.state, "shipped"),
        gte(tickets.updatedAt, weekStart),
      ),
    );
  return Number(row?.n ?? 0);
}

