/**
 * M18 — setProjectLocalPath: record that the Bridge resolved a local
 * checkout for a URL-only project, and emit ONE `project-linked` feed row.
 *
 * Single-statement CTE (neon-http, no interactive tx — M6 outbox law):
 *   UPDATE projects SET local_path = ? WHERE id = ? AND local_path IS DISTINCT FROM ?
 *   returning id INTO updated;
 *   INSERT INTO feed_events ... FROM updated (only when a row was updated)
 *
 * Changed-guard: only emits the feed row when the value actually changed,
 * so re-runs don't spam the feed.
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";

export async function setProjectLocalPath(args: {
  projectId: string;
  localPath: string;
  actor: string;
}): Promise<{ ok: boolean; linked: boolean }> {
  const result = await db.execute(sql`
    with updated as (
      update projects
      set    local_path = ${args.localPath}
      where  id = ${args.projectId}
        and  local_path is distinct from ${args.localPath}
      returning id, name, slug
    )
    insert into feed_events (kind, actor, summary, project_id, payload, seeded)
    select
      'project-linked',
      ${args.actor},
      updated.name || ' — linked at ' || ${args.localPath},
      updated.id,
      ${JSON.stringify({ localPath: args.localPath })}::jsonb,
      false
    from updated
    returning project_id
  `);
  const rows = result.rows as Array<{ project_id: string }>;
  return { ok: true, linked: rows.length > 0 };
}
