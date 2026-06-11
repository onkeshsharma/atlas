/**
 * M7 — pin/unpin a Project (PRD #32) — conditional UPDATE claiming
 * `WHERE pinned = NOT target` + outbox INSERT in ONE statement
 * (the applyRunTransition pattern; neon-http has no transactions).
 *
 * Today's pinned strip reads `projects.pinned` through M6's
 * projectRows() — the outbox row is what makes an open Today notice.
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";

export type SetPinnedResult =
  | { ok: true; feedEventId: number }
  | { ok: false; reason: "not-claimed" };

export async function setProjectPinned(input: {
  projectId: string;
  pinned: boolean;
  /** display actor for the feed row — "you". */
  actor: string;
}): Promise<SetPinnedResult> {
  const kind = input.pinned ? "project-pinned" : "project-unpinned";
  const result = await db.execute(sql`
    with updated as (
      update projects
      set pinned = ${input.pinned}
      where id = ${input.projectId} and pinned = ${!input.pinned}
      returning id, name, slug
    )
    insert into feed_events (kind, actor, summary, project_id, payload, seeded)
    select
      ${kind},
      ${input.actor},
      updated.name,
      updated.id,
      jsonb_build_object('slug', updated.slug, 'pinned', ${input.pinned}::boolean),
      false
    from updated
    returning id
  `);
  const rows = result.rows as Array<{ id: number | string }>;
  if (!rows.length) return { ok: false, reason: "not-claimed" };
  return { ok: true, feedEventId: Number(rows[0].id) };
}
