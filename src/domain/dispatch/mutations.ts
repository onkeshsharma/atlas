/**
 * M9 — Dispatch pipeline writers (PRD #19–21; charter §6).
 *
 * Ticket → Brief (drafted by a Helper Run) → Run (queued) → queue. Every
 * write is a single-statement CTE mutation + feed_events INSERT (THE
 * OUTBOX RULE) so open cockpits see dispatches the moment they exist —
 * and so the Bridge's command stream (ADR-0002 §2: `dispatched` rows ARE
 * `run-available` commands) can never miss one.
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import type { RunHelperKind } from "@/src/db/schema";

import { applyRunTransition } from "../run/transitions";
import { applyTicketTransition } from "../ticket/mutations";

export type EnqueueHelperInput = {
  projectId: string;
  /** enrich-ticket / draft-brief carry the Ticket; ingest-project doesn't. */
  ticketId?: string;
  helperKind: RunHelperKind;
  /** display title — "Enrich T-401", "Draft Brief for T-401". */
  title: string;
  actor: string;
};

export type EnqueueHelperResult =
  | { ok: true; runId: string; ref: string }
  | { ok: false; reason: "already-active" };

/**
 * Queue a Helper Run (helper lane — always yields to Owner Runs, PRD
 * #21). The WHERE NOT EXISTS guard makes double-enqueue a clean no-op:
 * one active helper of a kind per ticket/project at a time.
 */
export async function enqueueHelperRun(input: EnqueueHelperInput): Promise<EnqueueHelperResult> {
  const ticketId = input.ticketId ?? null;
  const payload = JSON.stringify({ from: null, to: "queued", lane: "helper", helperKind: input.helperKind });
  const result = await db.execute(sql`
    with created as (
      insert into runs (ref, project_id, ticket_id, title, state, lane, helper_kind, queue_position)
      select
        'R-' || nextval('run_ref_seq'),
        ${input.projectId},
        ${ticketId},
        ${input.title},
        'queued',
        'helper',
        ${input.helperKind},
        coalesce((select max(queue_position) from runs where state = 'queued'), 0) + 1
      where not exists (
        select 1 from runs
        where helper_kind = ${input.helperKind}
          and state in ('queued', 'running', 'needs-input')
          and (
            (${ticketId}::uuid is not null and ticket_id = ${ticketId})
            or (${ticketId}::uuid is null and project_id = ${input.projectId} and ticket_id is null)
          )
      )
      returning id, ref, project_id, ticket_id, title
    ),
    outbox as (
      insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, payload, seeded)
      select
        'dispatched',
        ${input.actor},
        created.ref || ' — ' || created.title,
        created.project_id,
        created.ticket_id,
        created.id,
        (select t.ref from tickets t where t.id = created.ticket_id),
        ${payload}::jsonb,
        false
      from created
      returning id
    )
    select created.id, created.ref from created
  `);

  const rows = result.rows as Array<{ id: string; ref: string }>;
  if (!rows.length) return { ok: false, reason: "already-active" };
  return { ok: true, runId: rows[0].id, ref: rows[0].ref };
}

/**
 * Session B — the send-back's run creator (KK "send back to Engine" /
 * K's Conflict recovery, PRD #22–23): same single-statement shape as
 * dispatchTicket but conditioned on `review-ready` (the legal table's
 * "sent back for another pass" edge), then review-ready → in-progress.
 * The conflict path (ticket at failed) routes through approved +
 * dispatchTicket instead — failed → in-progress is not a legal move.
 */
export async function redispatchTicket(input: {
  ticketId: string;
  briefId: string;
  actor: string;
}): Promise<DispatchTicketResult> {
  const payload = JSON.stringify({ from: null, to: "queued", lane: "owner" });
  const result = await db.execute(sql`
    with brief as (
      update briefs
      set status = 'final', updated_at = now()
      where id = ${input.briefId}
        and ticket_id = ${input.ticketId}
        and exists (select 1 from tickets t where t.id = ${input.ticketId} and t.state = 'review-ready')
      returning id
    ),
    created as (
      insert into runs (ref, project_id, ticket_id, title, state, lane, brief_id, queue_position)
      select
        'R-' || nextval('run_ref_seq'),
        t.project_id,
        t.id,
        t.title,
        'queued',
        'owner',
        brief.id,
        coalesce((select max(queue_position) from runs where state = 'queued'), 0) + 1
      from tickets t, brief
      where t.id = ${input.ticketId} and t.state = 'review-ready'
      returning id, ref, project_id, ticket_id, title
    ),
    outbox as (
      insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, payload, seeded)
      select
        'dispatched',
        ${input.actor},
        created.ref || ' — ' || created.title,
        created.project_id,
        created.ticket_id,
        created.id,
        (select t.ref from tickets t where t.id = created.ticket_id),
        ${payload}::jsonb,
        false
      from created
      returning id
    )
    select created.id, created.ref from created
  `);

  const rows = result.rows as Array<{ id: string; ref: string }>;
  if (!rows.length) return { ok: false, reason: "no-brief" };
  const run = rows[0];

  const claimed = await applyTicketTransition({
    ticketId: input.ticketId,
    from: "review-ready",
    to: "in-progress",
    actor: input.actor,
    note: "Sent back to the Engine",
  });
  if (!claimed.ok) {
    await applyRunTransition({
      runId: run.id,
      from: "queued",
      to: "cancelled",
      actor: "atlas",
    });
    return { ok: false, reason: "not-approved" };
  }

  return { ok: true, runId: run.id, ref: run.ref };
}

export type DispatchTicketResult =
  | { ok: true; runId: string; ref: string }
  | { ok: false; reason: "not-approved" | "no-brief" };

/**
 * The real dispatch (PRD #19–20): finalize the Ticket's Brief + create
 * the Owner Run (queued; the Bridge assigns the worktree at start) in ONE
 * statement, then drive the Ticket approved → in-progress through
 * `applyTicketTransition` with the dispatch actor — the verb is
 * deliberately absent from OWNER_MOVES (HANDOFF-M8).
 *
 * Race shape: the run INSERT is conditional on `tickets.state =
 * 'approved'`; the ticket claim then transitions it. If two dispatches
 * race, both may create runs but exactly one claims the ticket — the
 * loser's run is cancelled here, atomically, and the caller sees
 * not-approved. Self-healing, no distributed lock (ADR-0002).
 */
export async function dispatchTicket(input: {
  ticketId: string;
  briefId: string;
  actor: string;
}): Promise<DispatchTicketResult> {
  const payload = JSON.stringify({ from: null, to: "queued", lane: "owner" });
  const result = await db.execute(sql`
    with brief as (
      update briefs
      set status = 'final', updated_at = now()
      where id = ${input.briefId}
        and ticket_id = ${input.ticketId}
        and exists (select 1 from tickets t where t.id = ${input.ticketId} and t.state = 'approved')
      returning id
    ),
    created as (
      insert into runs (ref, project_id, ticket_id, title, state, lane, brief_id, queue_position)
      select
        'R-' || nextval('run_ref_seq'),
        t.project_id,
        t.id,
        t.title,
        'queued',
        'owner',
        brief.id,
        coalesce((select max(queue_position) from runs where state = 'queued'), 0) + 1
      from tickets t, brief
      where t.id = ${input.ticketId} and t.state = 'approved'
      returning id, ref, project_id, ticket_id, title
    ),
    outbox as (
      insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, payload, seeded)
      select
        'dispatched',
        ${input.actor},
        created.ref || ' — ' || created.title,
        created.project_id,
        created.ticket_id,
        created.id,
        (select t.ref from tickets t where t.id = created.ticket_id),
        ${payload}::jsonb,
        false
      from created
      returning id
    )
    select created.id, created.ref from created
  `);

  const rows = result.rows as Array<{ id: string; ref: string }>;
  if (!rows.length) return { ok: false, reason: "no-brief" };
  const run = rows[0];

  const claimed = await applyTicketTransition({
    ticketId: input.ticketId,
    from: "approved",
    to: "in-progress",
    actor: input.actor,
  });
  if (!claimed.ok) {
    // raced — another dispatch claimed the ticket; withdraw our run.
    await applyRunTransition({
      runId: run.id,
      from: "queued",
      to: "cancelled",
      actor: "atlas",
    });
    return { ok: false, reason: "not-approved" };
  }

  return { ok: true, runId: run.id, ref: run.ref };
}
