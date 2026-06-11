/**
 * M5 — invite issuance + acceptance (PRD #37, #46; charter §2).
 *
 * Delivery is DEFERRED to the Notifier module (charter-sanctioned
 * deviation): `issueInvite` returns the magic link for in-UI surfacing;
 * no email is sent from M5.
 *
 * neon-http has no interactive transactions (see src/db/client.ts), so
 * acceptance is built race-safe without one: the conditional UPDATE that
 * claims the invite is the atomic gate, and the membership INSERT is
 * idempotent (`on conflict do nothing` + re-select — the v1 race lesson).
 *
 * M11 (sanctioned surgical edits — charter item 2): invites can scope
 * to a project (`invites.project_id`, migration 0008) — still
 * INSTANCE-level grants (M5 deviation 3 stands), but acceptance of a
 * scoped invite ALSO lands the project_members roster row. Every invite
 * mutation now follows THE OUTBOX RULE: the durable write CTE feeds a
 * feed_events INSERT in the same statement (`invited` / `joined` /
 * `invite-declined` / `invite-revoked`), so open cockpits and the audit
 * log see the trust circle move.
 */
import { randomBytes } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { invites, type Invite, type Membership } from "@/src/db/schema";

import { ensureMembership } from "./memberships";

export const INVITE_TTL_DAYS = 14;

// ── pure helpers (unit-tested) ─────────────────────────────────────────

export function generateInviteToken(): string {
  return `inv_${randomBytes(24).toString("base64url")}`;
}

export function inviteMagicLink(token: string, appUrl = process.env.ATLAS_APP_URL): string {
  const base = (appUrl ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/invite/${token}`;
}

export type InviteStatus = "pending" | "accepted" | "revoked" | "declined" | "expired";

/** status precedence: accepted > revoked > declined > expired > pending. */
export function deriveInviteStatus(
  invite: Pick<Invite, "acceptedAt" | "revokedAt" | "declinedAt" | "expiresAt">,
  now: Date = new Date(),
): InviteStatus {
  if (invite.acceptedAt) return "accepted";
  if (invite.revokedAt) return "revoked";
  if (invite.declinedAt) return "declined";
  if (invite.expiresAt.getTime() <= now.getTime()) return "expired";
  return "pending";
}

/** whole days until expiry, floored at 0 — "expires in 12 days" (U:160). */
export function daysUntilExpiry(expiresAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000));
}

// ── DB operations ──────────────────────────────────────────────────────

export async function issueInvite(input: {
  email: string;
  invitedBy: string;
  invitedName?: string;
  welcomeNote?: string;
  /** M11 — scope the grant to a project (roster row lands on accept). */
  projectId?: string;
  /** display actor for the feed row — "you". M11. */
  actor?: string;
  ttlDays?: number;
}): Promise<{ invite: Invite; magicLink: string }> {
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + (input.ttlDays ?? INVITE_TTL_DAYS) * 86_400_000);
  const email = input.email.trim().toLowerCase();
  // M11 — THE OUTBOX RULE: the invite INSERT and its `invited` feed row
  // are one statement; the welcome note rides `preview` (Z's italic line).
  const result = (await db.execute(sql`
    with issued as (
      insert into invites (token, email, invited_name, welcome_note, role, project_id, invited_by, expires_at)
      values (
        ${token}, ${email}, ${input.invitedName?.trim() || null},
        ${input.welcomeNote?.trim() || null}, 'collaborator',
        ${input.projectId ?? null}, ${input.invitedBy}, ${expiresAt.toISOString()}::timestamptz
      )
      returning *
    ),
    outbox as (
      insert into feed_events (kind, actor, summary, preview, project_id, payload, seeded)
      select
        'invited',
        ${input.actor ?? "you"},
        issued.email || coalesce(
          ' — ' || (select p.name from projects p where p.id = issued.project_id), ''
        ),
        issued.welcome_note,
        issued.project_id,
        jsonb_build_object('inviteId', issued.id),
        false
      from issued
      returning id
    )
    select * from issued
  `)) as unknown as { rows: Array<Record<string, unknown>> };
  const invite = rowToInvite(result.rows[0]);
  return { invite, magicLink: inviteMagicLink(token) };
}

/** raw-SQL row (snake_case) → the drizzle Invite shape. */
function rowToInvite(r: Record<string, unknown>): Invite {
  return {
    id: r.id as string,
    token: r.token as string,
    email: r.email as string,
    invitedName: (r.invited_name as string | null) ?? null,
    welcomeNote: (r.welcome_note as string | null) ?? null,
    role: r.role as Invite["role"],
    projectId: (r.project_id as string | null) ?? null,
    invitedBy: r.invited_by as string,
    createdAt: new Date(r.created_at as string),
    expiresAt: new Date(r.expires_at as string),
    acceptedAt: r.accepted_at ? new Date(r.accepted_at as string) : null,
    acceptedBy: (r.accepted_by as string | null) ?? null,
    revokedAt: r.revoked_at ? new Date(r.revoked_at as string) : null,
    declinedAt: r.declined_at ? new Date(r.declined_at as string) : null,
  };
}

export async function getInviteByToken(token: string): Promise<Invite | undefined> {
  return db.query.invites.findFirst({ where: eq(invites.token, token) });
}

/** the invite a signed-in Collaborator joined through (SS step 01). */
export async function inviteAcceptedBy(userId: string): Promise<Invite | undefined> {
  return db.query.invites.findFirst({ where: eq(invites.acceptedBy, userId) });
}

export type InviteValidation =
  | { ok: true; invite: Invite }
  | { ok: false; reason: Exclude<InviteStatus, "pending"> | "not-found" };

export async function validateInvite(token: string): Promise<InviteValidation> {
  const invite = await getInviteByToken(token);
  if (!invite) return { ok: false, reason: "not-found" };
  const status = deriveInviteStatus(invite);
  return status === "pending" ? { ok: true, invite } : { ok: false, reason: status };
}

export type AcceptResult =
  | { ok: true; invite: Invite; membership: Membership }
  | { ok: false; reason: Exclude<InviteStatus, "pending"> | "not-found" };

/**
 * Claim the invite for `userId` and attach the Collaborator membership.
 * The UPDATE's WHERE re-checks every pending condition, so two racing
 * accepts can't both claim it.
 *
 * M11 — the claim statement now ALSO lands the project roster row (for
 * scoped invites) and the `joined` feed row (THE OUTBOX RULE): claim +
 * grant + outbox are atomic; the membership INSERT after it stays
 * idempotent (the M5 race posture, unchanged).
 */
export async function acceptInvite(input: {
  token: string;
  userId: string;
  displayName: string;
  /** "the circle as the 3rd Collaborator" ordinal — computed by the caller. */
  ordinal?: string;
}): Promise<AcceptResult> {
  const result = (await db.execute(sql`
    with claimed as (
      update invites
      set accepted_at = now(), accepted_by = ${input.userId}
      where token = ${input.token}
        and accepted_at is null
        and revoked_at is null
        and declined_at is null
        and expires_at > now()
      returning *
    ),
    rostered as (
      insert into project_members (project_id, user_id, added_by)
      select claimed.project_id, ${input.userId}, claimed.invited_by
      from claimed
      where claimed.project_id is not null
      on conflict do nothing
      returning project_id
    ),
    outbox as (
      insert into feed_events (kind, actor, summary, project_id, payload, seeded)
      select
        'joined',
        ${input.displayName}::text,
        'the circle as ' || ${input.ordinal ?? "a Collaborator"}::text || coalesce(
          ' · ' || (select p.name from projects p where p.id = claimed.project_id), ''
        ),
        claimed.project_id,
        jsonb_build_object('inviteId', claimed.id, 'userId', ${input.userId}::text),
        false
      from claimed
      returning id
    )
    select * from claimed
  `)) as unknown as { rows: Array<Record<string, unknown>> };
  if (!result.rows.length) {
    // claim failed — report why, precisely.
    const check = await validateInvite(input.token);
    return check.ok ? { ok: false, reason: "not-found" } : { ok: false, reason: check.reason };
  }
  const claimed = rowToInvite(result.rows[0]);
  const membership = await ensureMembership({
    userId: input.userId,
    role: claimed.role,
    displayName: input.displayName,
  });
  return { ok: true, invite: claimed, membership };
}

/** invitee-side "no thanks" (U:156) — only a still-pending invite can decline. */
export async function declineInvite(token: string): Promise<boolean> {
  // M11 — outbox: the decline and its feed row are one statement; the
  // invitee has no membership yet, so the actor is their invite identity.
  const result = (await db.execute(sql`
    with declined as (
      update invites
      set declined_at = now()
      where token = ${token}
        and accepted_at is null
        and revoked_at is null
        and declined_at is null
      returning *
    )
    insert into feed_events (kind, actor, summary, project_id, payload, seeded)
    select
      'invite-declined',
      coalesce(declined.invited_name, declined.email),
      declined.email,
      declined.project_id,
      jsonb_build_object('inviteId', declined.id),
      false
    from declined
    returning id
  `)) as unknown as { rows: unknown[] };
  return result.rows.length > 0;
}

/**
 * M11 — Owner-side withdrawal (M:274 "revoke ✕" / WW:265 "cancel
 * invite"). Only a still-pending invite can be revoked; the mark + its
 * feed row are one statement (THE OUTBOX RULE).
 */
export async function revokeInvite(input: {
  inviteId: string;
  /** display actor for the feed row — "you". */
  actor: string;
}): Promise<boolean> {
  const result = (await db.execute(sql`
    with revoked as (
      update invites
      set revoked_at = now()
      where id = ${input.inviteId}
        and accepted_at is null
        and revoked_at is null
        and declined_at is null
      returning *
    )
    insert into feed_events (kind, actor, summary, project_id, payload, seeded)
    select
      'invite-revoked',
      ${input.actor},
      revoked.email,
      revoked.project_id,
      jsonb_build_object('inviteId', revoked.id),
      false
    from revoked
    returning id
  `)) as unknown as { rows: unknown[] };
  return result.rows.length > 0;
}

