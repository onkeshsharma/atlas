/**
 * M11 — roster + access writers (PRD #38; charter items 1 & 3).
 *
 * THE TWO-TABLE RULE (full statement in src/db/schema/project-members.ts):
 * `memberships` = instance auth truth; `project_members` = per-project
 * visibility. Removing a roster row takes ONE project out of a
 * Collaborator's view; revoking instance access removes the person.
 * Two different verbs, two different writers — M draws one list, so the
 * surface labels them distinctly ("remove from this project" vs the
 * trust circle's "revoke access").
 *
 * THE OUTBOX RULE: every writer here is ONE statement — the durable
 * write CTE feeds the feed_events INSERT (the applyRunTransition /
 * setProjectPinned pattern; neon-http has no transactions). A roster
 * change that skipped the outbox would be invisible to every open
 * cockpit and absent from the audit log.
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";

export type RosterWriteResult =
  | { ok: true; feedEventId: number }
  | { ok: false; reason: "not-claimed" };

/**
 * Grant a Collaborator visibility of one project (M's roster; also the
 * re-add path after a remove — invites are one-shot, roster grants are
 * not). Idempotent via the (project, user) unique index: a duplicate
 * grant claims nothing and emits nothing.
 */
export async function addProjectMember(input: {
  projectId: string;
  /** Neon Auth user id of the Collaborator being granted. */
  userId: string;
  /** Neon Auth user id of the granting Owner. */
  addedBy: string;
  /** display actor for the feed row — "you". */
  actor: string;
}): Promise<RosterWriteResult> {
  const result = await db.execute(sql`
    with granted as (
      insert into project_members (project_id, user_id, added_by)
      values (${input.projectId}, ${input.userId}, ${input.addedBy})
      on conflict do nothing
      returning project_id, user_id
    )
    insert into feed_events (kind, actor, summary, project_id, payload, seeded)
    select
      'member-added',
      ${input.actor},
      coalesce(
        (select m.display_name from memberships m where m.user_id = granted.user_id),
        (select u.name from neon_auth."user" u where u.id::text = granted.user_id),
        'a collaborator'
      ) || ' to ' || (select p.name from projects p where p.id = granted.project_id),
      granted.project_id,
      jsonb_build_object('scope', 'project', 'userId', granted.user_id),
      false
    from granted
    returning id
  `);
  const rows = result.rows as Array<{ id: number | string }>;
  if (!rows.length) return { ok: false, reason: "not-claimed" };
  return { ok: true, feedEventId: Number(rows[0].id) };
}

/**
 * Take one project out of a Collaborator's view (M:184 "remove →").
 * Their instance membership — and their attribution on prior Tickets —
 * is untouched (WW:309's promise: Atlas never rewrites history).
 */
export async function removeProjectMember(input: {
  projectId: string;
  userId: string;
  /** display actor for the feed row — "you". */
  actor: string;
}): Promise<RosterWriteResult> {
  const result = await db.execute(sql`
    with removed as (
      delete from project_members
      where project_id = ${input.projectId} and user_id = ${input.userId}
      returning project_id, user_id
    )
    insert into feed_events (kind, actor, summary, project_id, payload, seeded)
    select
      'member-removed',
      ${input.actor},
      coalesce(
        (select m.display_name from memberships m where m.user_id = removed.user_id),
        (select u.name from neon_auth."user" u where u.id::text = removed.user_id),
        'a collaborator'
      ) || ' from ' || (select p.name from projects p where p.id = removed.project_id),
      removed.project_id,
      jsonb_build_object('scope', 'project', 'userId', removed.user_id),
      false
    from removed
    returning id
  `);
  const rows = result.rows as Array<{ id: number | string }>;
  if (!rows.length) return { ok: false, reason: "not-claimed" };
  return { ok: true, feedEventId: Number(rows[0].id) };
}

/**
 * Revoke a Collaborator's INSTANCE access (WW:220 "revoke access") —
 * the person, not a project: every roster row goes, then the
 * membership. One statement; the feed row rides the membership delete
 * (`role = 'collaborator'` in the WHERE makes revoking the Owner
 * structurally impossible). Their Neon Auth identity and their prior
 * Tickets/feed attributions survive — the M10 delete-account stance:
 * Atlas forgets their access, never their history.
 */
export async function revokeInstanceAccess(input: {
  userId: string;
  /** display actor for the feed row — "you". */
  actor: string;
}): Promise<RosterWriteResult> {
  const result = await db.execute(sql`
    with unrostered as (
      delete from project_members
      where user_id = ${input.userId}
      returning id
    ),
    revoked as (
      delete from memberships
      where user_id = ${input.userId} and role = 'collaborator'
      returning user_id, display_name
    )
    insert into feed_events (kind, actor, summary, payload, seeded)
    select
      'member-removed',
      ${input.actor},
      revoked.display_name || ' from this Atlas',
      jsonb_build_object(
        'scope', 'instance',
        'userId', revoked.user_id,
        'rosterRowsRemoved', (select count(*) from unrostered)
      ),
      false
    from revoked
    returning id
  `);
  const rows = result.rows as Array<{ id: number | string }>;
  if (!rows.length) return { ok: false, reason: "not-claimed" };
  return { ok: true, feedEventId: Number(rows[0].id) };
}
