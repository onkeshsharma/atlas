/**
 * M5 — membership attach + the single-Owner invariant + Owner bootstrap
 * (PRD "Auth & membership" deep module; "exactly one Owner — schema may
 * allow multi, product won't" — we enforce it at the DB with the
 * memberships_one_owner partial unique index, closing the race).
 */
import { timingSafeEqual } from "node:crypto";

import { count, eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import { memberships, type Membership } from "@/src/db/schema";

/** the single-Owner invariant (partial unique index memberships_one_owner). */
export class OwnerExistsError extends Error {
  constructor() {
    super("an owner already exists for this atlas instance");
    this.name = "OwnerExistsError";
  }
}

/**
 * Idempotent membership attach — `on conflict do nothing` with NO target
 * (handles any unique violation) + re-select, per the v1 race lesson.
 * A swallowed conflict with no row for this user can only be the
 * one-owner partial unique index → typed OwnerExistsError.
 */
export async function ensureMembership(input: {
  userId: string;
  role: "owner" | "collaborator";
  displayName: string;
}): Promise<Membership> {
  const [inserted] = await db
    .insert(memberships)
    .values(input)
    .onConflictDoNothing()
    .returning();
  if (inserted) return inserted;
  const existing = await db.query.memberships.findFirst({
    where: eq(memberships.userId, input.userId),
  });
  if (existing) return existing; // idempotent re-run for the same user
  if (input.role === "owner") throw new OwnerExistsError();
  throw new Error(`membership insert conflicted but no row exists for user ${input.userId}`);
}

export async function membershipFor(userId: string): Promise<Membership | undefined> {
  return db.query.memberships.findFirst({ where: eq(memberships.userId, userId) });
}

export async function ownerMembership(): Promise<Membership | undefined> {
  return db.query.memberships.findFirst({ where: eq(memberships.role, "owner") });
}

export async function ownerExists(): Promise<boolean> {
  return Boolean(await ownerMembership());
}

/** Collaborator headcount — "You'd be the 3rd Collaborator" (U:76–83). */
export async function collaboratorCount(): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(memberships)
    .where(eq(memberships.role, "collaborator"));
  return row?.n ?? 0;
}

/** SS step 03 — display name / handle / initial, editable in onboarding. */
export async function updateMembershipProfile(input: {
  userId: string;
  displayName: string;
  handle?: string | null;
  initial?: string | null;
}): Promise<Membership | undefined> {
  const [updated] = await db
    .update(memberships)
    .set({
      displayName: input.displayName.trim(),
      handle: input.handle?.trim() || null,
      initial: input.initial?.trim().slice(0, 1) || null,
    })
    .where(eq(memberships.userId, input.userId))
    .returning();
  return updated;
}

/**
 * Constant-time Owner-code check (DD:87 "Owner code"). The code is a
 * bootstrap secret: it gates creation of THE Owner account only.
 */
export function verifyOwnerCode(candidate: string, expected = process.env.ATLAS_OWNER_CODE) {
  if (!expected) return false;
  const a = Buffer.from(candidate.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
