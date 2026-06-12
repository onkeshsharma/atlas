/**
 * M13 — the reply mutation (PRD #47). THE OUTBOX RULE: the reply's
 * durable record IS its feed row (`replied` has been in the kind enum
 * since M6, waiting for this writer), and the ticket's last-touch bump
 * rides the same single statement — one CTE, both or neither (the
 * src/domain/ticket/mutations.ts pattern; neon-http has no transactions).
 *
 * The row's `preview` carries the reply text (Z:264–269's italic quote
 * line — the inbox, the Owner's ticket Activity, and the collab thread
 * all already render previews). Owner-side replies can reuse this
 * writer untouched (actor is the caller's display string).
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";

export type ReplyOnTicketInput = {
  ticketId: string;
  /** display actor — "carmen@acme.io", "you". */
  actor: string;
  text: string;
};

export type ReplyOnTicketResult =
  | { ok: true; feedEventId: number }
  | { ok: false; reason: "empty-reply" | "unknown-ticket" };

export async function replyOnTicket(input: ReplyOnTicketInput): Promise<ReplyOnTicketResult> {
  const text = input.text.trim();
  if (!text) return { ok: false, reason: "empty-reply" };

  const result = await db.execute(sql`
    with touched as (
      update tickets
      set updated_at = now()
      where id = ${input.ticketId}
      returning id, ref, project_id, title
    )
    insert into feed_events (kind, actor, summary, preview, project_id, ticket_id, ticket_ref, seeded)
    select
      'replied',
      ${input.actor},
      touched.ref || ' — ' || touched.title,
      ${text},
      touched.project_id,
      touched.id,
      touched.ref,
      false
    from touched
    returning id
  `);

  const rows = result.rows as Array<{ id: number | string }>;
  if (!rows.length) return { ok: false, reason: "unknown-ticket" };
  return { ok: true, feedEventId: Number(rows[0].id) };
}
