/**
 * M11 — People read models: project rosters (M), the trust circle (WW),
 * pending invites, and the per-person activity map presence derives
 * from (src/domain/people/presence.ts).
 *
 * Emails live in Neon Auth's managed `neon_auth."user"` (read-only peek,
 * the M5 users.ts precedent) — memberships deliberately don't duplicate
 * them, so the people queries join across with raw SQL.
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";

import type { ActorActivity } from "./presence";

// ── activity map (presence input) ──────────────────────────────────────

/** newest feed row per actor (lowercased), capped to the last `days`. */
export async function latestActorActivity(days = 30): Promise<ActorActivity> {
  const result = (await db.execute(sql`
    select lower(actor) as actor, max(created_at) as last_at
    from feed_events
    where created_at >= now() - make_interval(days => ${days})
    group by 1
  `)) as unknown as { rows: Array<{ actor: string; last_at: string | Date }> };
  const map: ActorActivity = new Map();
  for (const row of result.rows) map.set(row.actor, new Date(row.last_at));
  return map;
}

// ── rosters ────────────────────────────────────────────────────────────

export type RosterPerson = {
  userId: string;
  displayName: string;
  handle: string | null;
  initial: string;
  email: string | null;
  role: "owner" | "collaborator";
  /** membership creation (owner) / roster grant (collaborator rows). */
  sinceAt: Date;
};

/**
 * One project's roster, Owner first. The Owner row composes from the
 * instance membership (never rostered — two-table rule); Collaborator
 * rows are real project_members grants.
 */
export async function projectRoster(projectId: string): Promise<RosterPerson[]> {
  const result = (await db.execute(sql`
    select
      m.user_id,
      m.display_name,
      m.handle,
      coalesce(m.initial, lower(left(m.display_name, 1))) as initial,
      u.email,
      m.role::text as role,
      m.created_at as since_at
    from memberships m
    left join neon_auth."user" u on u.id::text = m.user_id
    where m.role = 'owner'
    union all
    select
      pm.user_id,
      coalesce(m.display_name, u.name, u.email, 'collaborator') as display_name,
      m.handle,
      coalesce(m.initial, lower(left(coalesce(m.display_name, u.name, u.email, 'c'), 1))) as initial,
      u.email,
      pm.role::text as role,
      pm.added_at as since_at
    from project_members pm
    left join memberships m on m.user_id = pm.user_id
    left join neon_auth."user" u on u.id::text = pm.user_id
    where pm.project_id = ${projectId}
    order by role desc, since_at asc
  `)) as unknown as {
    rows: Array<{
      user_id: string;
      display_name: string;
      handle: string | null;
      initial: string;
      email: string | null;
      role: string;
      since_at: string | Date;
    }>;
  };
  // `role desc` puts 'owner' before 'collaborator' (enum text ordering)
  return result.rows.map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    handle: r.handle,
    initial: r.initial,
    email: r.email,
    role: r.role as "owner" | "collaborator",
    sinceAt: new Date(r.since_at),
  }));
}

export type CirclePerson = {
  userId: string;
  displayName: string;
  handle: string | null;
  initial: string;
  email: string | null;
  joinedAt: Date;
  /** rostered projects, name+slug, grant order. */
  projects: Array<{ name: string; slug: string }>;
  /** Tickets filed by this person (reporter = email / its local part), all time. */
  ticketsFiled: number;
  /** same count windowed to the last 30 days (WW:139's hero sentence). */
  ticketsFiled30d: number;
};

/** every instance Collaborator with their cross-project grants (WW). */
export async function trustCircle(): Promise<CirclePerson[]> {
  const result = (await db.execute(sql`
    select
      m.user_id,
      m.display_name,
      m.handle,
      coalesce(m.initial, lower(left(m.display_name, 1))) as initial,
      u.email,
      m.created_at as joined_at,
      coalesce(
        (
          select jsonb_agg(jsonb_build_object('name', p.name, 'slug', p.slug) order by pm.added_at)
          from project_members pm
          join projects p on p.id = pm.project_id
          where pm.user_id = m.user_id
        ),
        '[]'::jsonb
      ) as projects,
      (
        select count(*) from tickets t
        where u.email is not null
          and (lower(t.reporter) = lower(u.email) or lower(t.reporter) = lower(split_part(u.email, '@', 1)))
      ) as tickets_filed,
      (
        select count(*) from tickets t
        where u.email is not null
          and (lower(t.reporter) = lower(u.email) or lower(t.reporter) = lower(split_part(u.email, '@', 1)))
          and t.created_at >= now() - make_interval(days => 30)
      ) as tickets_filed_30d
    from memberships m
    left join neon_auth."user" u on u.id::text = m.user_id
    where m.role = 'collaborator'
    order by m.created_at asc
  `)) as unknown as {
    rows: Array<{
      user_id: string;
      display_name: string;
      handle: string | null;
      initial: string;
      email: string | null;
      joined_at: string | Date;
      projects: Array<{ name: string; slug: string }>;
      tickets_filed: string | number;
      tickets_filed_30d: string | number;
    }>;
  };
  return result.rows.map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    handle: r.handle,
    initial: r.initial,
    email: r.email,
    joinedAt: new Date(r.joined_at),
    projects: r.projects,
    ticketsFiled: Number(r.tickets_filed),
    ticketsFiled30d: Number(r.tickets_filed_30d),
  }));
}

/**
 * Collaborators NOT yet on this project's roster — M's quiet
 * "add to this project →" rows (the re-add path; invites are one-shot,
 * roster grants are not — charter item 1's writes need a surface).
 */
export async function collaboratorsNotOnProject(projectId: string): Promise<RosterPerson[]> {
  const result = (await db.execute(sql`
    select
      m.user_id,
      m.display_name,
      m.handle,
      coalesce(m.initial, lower(left(m.display_name, 1))) as initial,
      u.email,
      m.role::text as role,
      m.created_at as since_at
    from memberships m
    left join neon_auth."user" u on u.id::text = m.user_id
    where m.role = 'collaborator'
      and not exists (
        select 1 from project_members pm
        where pm.user_id = m.user_id and pm.project_id = ${projectId}
      )
    order by m.created_at asc
  `)) as unknown as {
    rows: Array<{
      user_id: string;
      display_name: string;
      handle: string | null;
      initial: string;
      email: string | null;
      role: string;
      since_at: string | Date;
    }>;
  };
  return result.rows.map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    handle: r.handle,
    initial: r.initial,
    email: r.email,
    role: r.role as "owner" | "collaborator",
    sinceAt: new Date(r.since_at),
  }));
}

// ── pending invites ────────────────────────────────────────────────────

export type PendingInvite = {
  id: string;
  token: string;
  email: string;
  invitedName: string | null;
  welcomeNote: string | null;
  projectId: string | null;
  projectName: string | null;
  projectSlug: string | null;
  createdAt: Date;
  expiresAt: Date;
};

/** still-claimable invites, newest first; optionally scoped to a project. */
export async function pendingInvites(projectId?: string): Promise<PendingInvite[]> {
  const scope = projectId === undefined ? sql`` : sql` and i.project_id = ${projectId}`;
  const result = (await db.execute(sql`
    select
      i.id, i.token, i.email, i.invited_name, i.welcome_note,
      i.project_id, p.name as project_name, p.slug as project_slug,
      i.created_at, i.expires_at
    from invites i
    left join projects p on p.id = i.project_id
    where i.accepted_at is null
      and i.revoked_at is null
      and i.declined_at is null
      and i.expires_at > now()${scope}
    order by i.created_at desc
  `)) as unknown as {
    rows: Array<{
      id: string;
      token: string;
      email: string;
      invited_name: string | null;
      welcome_note: string | null;
      project_id: string | null;
      project_name: string | null;
      project_slug: string | null;
      created_at: string | Date;
      expires_at: string | Date;
    }>;
  };
  return result.rows.map((r) => ({
    id: r.id,
    token: r.token,
    email: r.email,
    invitedName: r.invited_name,
    welcomeNote: r.welcome_note,
    projectId: r.project_id,
    projectName: r.project_name,
    projectSlug: r.project_slug,
    createdAt: new Date(r.created_at),
    expiresAt: new Date(r.expires_at),
  }));
}

// ── owner contact ──────────────────────────────────────────────────────

/**
 * M15 — the 404's Collaborator-only "Ask the Owner · message ↗" mailto
 * (X:96–103, made real per the M14 ask-a-human precedent). Same
 * neon_auth join as projectRoster above; read-only.
 */
export async function ownerEmail(): Promise<string | null> {
  const result = (await db.execute(sql`
    select u.email
    from memberships m
    left join neon_auth."user" u on u.id::text = m.user_id
    where m.role = 'owner'
    limit 1
  `)) as unknown as { rows: Array<{ email: string | null }> };
  return result.rows[0]?.email ?? null;
}
