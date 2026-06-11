/**
 * M8 — Ticket mutations: every write is a single-statement conditional
 * write + feed_events INSERT (THE OUTBOX RULE — HANDOFF-M6; pattern:
 * src/domain/run/transitions.ts). neon-http has no interactive
 * transactions, so atomicity comes from one SQL statement: the CTE
 * mutation claims/creates the row and the outbox INSERT reads from it —
 * both happen or neither, and the live seam (ADR-0001) can't observe a
 * half-applied mutation.
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import type { TicketKind, TicketPriority, TicketState } from "@/src/db/schema";

import { ticketTransition } from "./transitions";

export type FileTicketInput = {
  projectId: string;
  title: string;
  body: string;
  kind: TicketKind | null;
  priority: TicketPriority;
  /** display actor — "you", "ada@acme.io". */
  reporter: string;
};

export type FileTicketResult =
  | { ok: true; id: string; ref: string }
  | { ok: false; reason: "empty-title" };

/**
 * INSERT the ticket (ref drawn from ticket_ref_seq inside the statement)
 * + its `filed` outbox row, atomically. S:169–177's "File this Ticket".
 */
export async function fileTicket(input: FileTicketInput): Promise<FileTicketResult> {
  const title = input.title.trim();
  if (!title) return { ok: false, reason: "empty-title" };

  const result = await db.execute(sql`
    with created as (
      insert into tickets (ref, project_id, title, body, state, kind, priority, reporter)
      values (
        'T-' || nextval('ticket_ref_seq'),
        ${input.projectId},
        ${title},
        ${input.body},
        'triage',
        ${input.kind},
        ${input.priority},
        ${input.reporter}
      )
      returning id, ref, project_id, title
    ),
    outbox as (
      insert into feed_events (kind, actor, summary, project_id, ticket_id, ticket_ref, payload, seeded)
      select
        'filed',
        ${input.reporter},
        created.ref || ' — ' || created.title,
        created.project_id,
        created.id,
        created.ref,
        ${JSON.stringify({ from: null, to: "triage" })}::jsonb,
        false
      from created
      returning id
    )
    select created.id, created.ref from created
  `);

  const rows = result.rows as Array<{ id: string; ref: string }>;
  return { ok: true, id: rows[0].id, ref: rows[0].ref };
}

export type ApplyTicketTransitionInput = {
  ticketId: string;
  /** the state we believe the ticket is in — the conditional claim. */
  from: TicketState;
  to: TicketState;
  /** display actor for the feed row — "you". */
  actor: string;
  /** optional decision note (needs-info question to the reporter, decline reason — I:170–178). */
  note?: string;
};

export type ApplyTicketTransitionResult =
  | { ok: true; feedEventId: number }
  | { ok: false; reason: "illegal-transition" | "not-claimed" };

/**
 * Flip a Ticket's state AND append its `moved` outbox row in ONE
 * statement. The UPDATE claims the row conditionally (WHERE state =
 * expected `from`) so concurrent writers lose cleanly. The note travels
 * as the feed event's italic preview line (Z:264–269 shape) + payload.
 */
export async function applyTicketTransition(
  input: ApplyTicketTransitionInput,
): Promise<ApplyTicketTransitionResult> {
  const check = ticketTransition(input.from, input.to);
  if (!check.ok) return { ok: false, reason: "illegal-transition" };

  const note = input.note?.trim() || null;
  const payload = { from: input.from, to: input.to, ...(note ? { note } : {}) };

  const result = await db.execute(sql`
    with updated as (
      update tickets
      set state = ${input.to},
          updated_at = now()
      where id = ${input.ticketId} and state = ${input.from}
      returning id, ref, project_id, title
    )
    insert into feed_events (kind, actor, summary, preview, project_id, ticket_id, ticket_ref, payload, seeded)
    select
      'moved',
      ${input.actor},
      updated.ref || ' — ' || updated.title,
      ${note},
      updated.project_id,
      updated.id,
      updated.ref,
      ${JSON.stringify(payload)}::jsonb,
      false
    from updated
    returning id
  `);

  const rows = result.rows as Array<{ id: number | string }>;
  if (!rows.length) return { ok: false, reason: "not-claimed" };
  return { ok: true, feedEventId: Number(rows[0].id) };
}

export type AddTicketLinkInput = {
  /** the ticket whose page declared the edge (feed summary anchors here). */
  ticketId: string;
  /** the OTHER ticket's ref as typed — resolved inside the statement. */
  otherRef: string;
  /** "blocks": this ticket blocks otherRef; "blocked-by": otherRef blocks this. */
  direction: "blocks" | "blocked-by";
  actor: string;
};

export type AddTicketLinkResult =
  | { ok: true; feedEventId: number }
  | { ok: false; reason: "unknown-ref" | "self-link" | "duplicate" };

/**
 * Declare a blocks/blocked-by edge (PRD #16) + its `linked` outbox row,
 * atomically. ON CONFLICT DO NOTHING keeps duplicates idempotent (the
 * outbox row is only written when the edge row actually lands).
 */
export async function addTicketLink(input: AddTicketLinkInput): Promise<AddTicketLinkResult> {
  const otherRef = input.otherRef.trim().toUpperCase();
  if (!otherRef) return { ok: false, reason: "unknown-ref" };

  const [other] = (
    await db.execute(sql`select id, ref from tickets where upper(ref) = ${otherRef}`)
  ).rows as Array<{ id: string; ref: string }>;
  if (!other) return { ok: false, reason: "unknown-ref" };
  if (other.id === input.ticketId) return { ok: false, reason: "self-link" };

  const blockerId = input.direction === "blocks" ? input.ticketId : other.id;
  const blockedId = input.direction === "blocks" ? other.id : input.ticketId;
  const verb = input.direction === "blocks" ? "blocks" : "blocked by";

  const result = await db.execute(sql`
    with edge as (
      insert into ticket_links (blocker_id, blocked_id)
      values (${blockerId}, ${blockedId})
      on conflict (blocker_id, blocked_id) do nothing
      returning id
    )
    insert into feed_events (kind, actor, summary, project_id, ticket_id, ticket_ref, payload, seeded)
    select
      'linked',
      ${input.actor},
      t.ref || ' — ' || ${verb} || ' ' || ${other.ref},
      t.project_id,
      t.id,
      t.ref,
      ${JSON.stringify({ direction: input.direction, otherRef: other.ref })}::jsonb,
      false
    from edge, tickets t
    where t.id = ${input.ticketId}
    returning id
  `);

  const rows = result.rows as Array<{ id: number | string }>;
  if (!rows.length) return { ok: false, reason: "duplicate" };
  return { ok: true, feedEventId: Number(rows[0].id) };
}
