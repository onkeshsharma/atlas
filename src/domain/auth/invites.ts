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
 */
import { randomBytes } from "node:crypto";

import { and, eq, isNull, sql } from "drizzle-orm";

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
  ttlDays?: number;
}): Promise<{ invite: Invite; magicLink: string }> {
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + (input.ttlDays ?? INVITE_TTL_DAYS) * 86_400_000);
  const [invite] = await db
    .insert(invites)
    .values({
      token,
      email: input.email.trim().toLowerCase(),
      invitedName: input.invitedName?.trim() || null,
      welcomeNote: input.welcomeNote?.trim() || null,
      role: "collaborator",
      invitedBy: input.invitedBy,
      expiresAt,
    })
    .returning();
  return { invite, magicLink: inviteMagicLink(token) };
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
 */
export async function acceptInvite(input: {
  token: string;
  userId: string;
  displayName: string;
}): Promise<AcceptResult> {
  const [claimed] = await db
    .update(invites)
    .set({ acceptedAt: new Date(), acceptedBy: input.userId })
    .where(
      and(
        eq(invites.token, input.token),
        isNull(invites.acceptedAt),
        isNull(invites.revokedAt),
        isNull(invites.declinedAt),
        sql`${invites.expiresAt} > now()`,
      ),
    )
    .returning();
  if (!claimed) {
    // claim failed — report why, precisely.
    const check = await validateInvite(input.token);
    return check.ok ? { ok: false, reason: "not-found" } : { ok: false, reason: check.reason };
  }
  const membership = await ensureMembership({
    userId: input.userId,
    role: claimed.role,
    displayName: input.displayName,
  });
  return { ok: true, invite: claimed, membership };
}

/** invitee-side "no thanks" (U:156) — only a still-pending invite can decline. */
export async function declineInvite(token: string): Promise<boolean> {
  const [declined] = await db
    .update(invites)
    .set({ declinedAt: new Date() })
    .where(
      and(
        eq(invites.token, token),
        isNull(invites.acceptedAt),
        isNull(invites.revokedAt),
        isNull(invites.declinedAt),
      ),
    )
    .returning();
  return Boolean(declined);
}

