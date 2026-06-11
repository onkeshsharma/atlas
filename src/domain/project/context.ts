/**
 * M7 — Context-term curation (PRD #31): the add/dismiss affordances on
 * "Words the Engine noticed" (P:241–248).
 *
 * add    = suggested → confirmed (the term joins the Language section)
 * dismiss = the suggested row is deleted
 *
 * Both are conditional single statements claiming `WHERE status =
 * 'suggested'` (concurrent clicks lose cleanly) with the feed-outbox
 * INSERT in the same statement — the M6 outbox law, so an open Context
 * page (and Today) re-renders live.
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";

export type ContextEditResult =
  | { ok: true; feedEventId: number }
  | { ok: false; reason: "not-claimed" };

export async function confirmSuggestedTerm(input: {
  termId: string;
  /** display actor — "you". */
  actor: string;
}): Promise<ContextEditResult> {
  const result = await db.execute(sql`
    with updated as (
      update context_terms
      set status = 'confirmed', updated_at = now()
      where id = ${input.termId} and status = 'suggested'
      returning id, term, project_id
    )
    insert into feed_events (kind, actor, summary, project_id, payload, seeded)
    select
      'context-edited',
      ${input.actor},
      p.name || ' context — added ' || updated.term,
      updated.project_id,
      jsonb_build_object('term', updated.term, 'action', 'added'),
      false
    from updated
    join projects p on p.id = updated.project_id
    returning id
  `);
  const rows = result.rows as Array<{ id: number | string }>;
  if (!rows.length) return { ok: false, reason: "not-claimed" };
  return { ok: true, feedEventId: Number(rows[0].id) };
}

export async function dismissSuggestedTerm(input: {
  termId: string;
  actor: string;
}): Promise<ContextEditResult> {
  const result = await db.execute(sql`
    with deleted as (
      delete from context_terms
      where id = ${input.termId} and status = 'suggested'
      returning id, term, project_id
    )
    insert into feed_events (kind, actor, summary, project_id, payload, seeded)
    select
      'context-edited',
      ${input.actor},
      p.name || ' context — dismissed ' || deleted.term,
      deleted.project_id,
      jsonb_build_object('term', deleted.term, 'action', 'dismissed'),
      false
    from deleted
    join projects p on p.id = deleted.project_id
    returning id
  `);
  const rows = result.rows as Array<{ id: number | string }>;
  if (!rows.length) return { ok: false, reason: "not-claimed" };
  return { ok: true, feedEventId: Number(rows[0].id) };
}
