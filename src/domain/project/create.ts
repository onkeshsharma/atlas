/**
 * M7 — createProject: insert the Project AND append its feed-outbox row
 * in ONE SQL statement (the M6 outbox law — a mutation that skips
 * feed_events is invisible to every open cockpit).
 *
 * neon-http has no interactive transactions (M5 law) — atomicity comes
 * from the CTE: the INSERT creates the row, the outer INSERT writes the
 * `project-created` event from it. Either both happen or neither.
 *
 * Ingest honesty: a new Project is born `queued` — the queue is real,
 * the executor (Engine via Bridge) arrives at M9.
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";

import { validateNewProject, type ValidatedNewProject } from "./slug";

export type CreateProjectResult =
  | { ok: true; project: ValidatedNewProject & { id: string } }
  | { ok: false; reason: "invalid"; error: string }
  | { ok: false; reason: "slug-taken"; error: string };

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  if ((err as { code?: string }).code === "23505") return true;
  // drizzle-orm ≥0.45 wraps NeonDbError in DrizzleQueryError — the pg
  // error code lives on `cause` (found by the M7 integration suite).
  return isUniqueViolation((err as { cause?: unknown }).cause);
}

export async function createProject(input: {
  source: string;
  /** display actor for the feed row — "you". */
  actor: string;
}): Promise<CreateProjectResult> {
  const validated = validateNewProject({ source: input.source });
  if (!validated.ok) return { ok: false, reason: "invalid", error: validated.error };
  const { name, slug, repoUrl, localPath } = validated.value;

  const sourceDisplay = (repoUrl ?? localPath ?? "").replace(/^https?:\/\//, "");
  const payload = { slug, repoUrl, localPath };

  try {
    const result = await db.execute(sql`
      with new_project as (
        insert into projects (name, slug, repo_url, local_path, ingest_status, seeded)
        values (${name}, ${slug}, ${repoUrl}, ${localPath}, 'queued', false)
        returning id, name
      )
      insert into feed_events (kind, actor, summary, project_id, payload, seeded)
      select
        'project-created',
        ${input.actor},
        new_project.name || ' — ' || ${sourceDisplay},
        new_project.id,
        ${JSON.stringify(payload)}::jsonb,
        false
      from new_project
      returning project_id
    `);
    const rows = result.rows as Array<{ project_id: string }>;
    if (!rows.length) {
      return { ok: false, reason: "invalid", error: "the project could not be created" };
    }
    return { ok: true, project: { id: rows[0].project_id, ...validated.value } };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        reason: "slug-taken",
        error: `a project named ${slug} already exists`,
      };
    }
    throw err;
  }
}
