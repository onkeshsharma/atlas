// M5 — integration tests for the Auth & membership module against the
// REAL Neon atlas-v2 DB (PRD testing decisions; charter done-criterion 2):
// role enforcement, invite issue→accept, single-Owner invariant.
//
// Every row created here is tagged with a run-unique marker and deleted
// in afterAll — the suite leaves the shared dev DB as it found it.
import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/src/db/client";
import { invites, memberships } from "@/src/db/schema";
import {
  acceptInvite,
  declineInvite,
  issueInvite,
  validateInvite,
} from "@/src/domain/auth/invites";
import {
  collaboratorCount,
  ensureMembership,
  membershipFor,
  OwnerExistsError,
  ownerExists,
  updateMembershipProfile,
} from "@/src/domain/auth/memberships";

const run = randomUUID().slice(0, 8);
const uid = (label: string) => `it-${run}-${label}`;
const createdUserIds: string[] = [];
const createdInviteIds: string[] = [];

async function user(label: string, role: "owner" | "collaborator") {
  const userId = uid(label);
  createdUserIds.push(userId);
  return ensureMembership({ userId, role, displayName: `IT ${label} ${run}` });
}

afterAll(async () => {
  if (createdInviteIds.length) {
    await db.delete(invites).where(inArray(invites.id, createdInviteIds));
  }
  if (createdUserIds.length) {
    await db.delete(memberships).where(inArray(memberships.userId, createdUserIds));
  }
});

describe("single-Owner invariant (memberships_one_owner)", () => {
  it("admits at most one owner, atomically at the DB", async () => {
    const hadOwner = await ownerExists();
    if (!hadOwner) {
      const first = await user("owner-a", "owner");
      expect(first.role).toBe("owner");
    }
    // whoever the standing owner is, a second one must be refused.
    await expect(user("owner-b", "owner")).rejects.toThrow(OwnerExistsError);
  });

  it("is idempotent per user (the v1 double-insert race shape)", async () => {
    const a = await user("collab-idem", "collaborator");
    const b = await ensureMembership({
      userId: a.userId,
      role: "collaborator",
      displayName: "different name, same user",
    });
    expect(b.id).toBe(a.id);
  });
});

describe("role enforcement at the membership layer", () => {
  it("membershipFor returns the attached role, and none for strangers", async () => {
    const m = await user("collab-role", "collaborator");
    expect((await membershipFor(m.userId))?.role).toBe("collaborator");
    expect(await membershipFor(uid("nobody"))).toBeUndefined();
  });

  it("updateMembershipProfile edits display name / handle / initial (SS step 03)", async () => {
    const m = await user("collab-profile", "collaborator");
    const updated = await updateMembershipProfile({
      userId: m.userId,
      displayName: "Priya Sharma",
      handle: "@priya",
      initial: "PS", // clipped to one letter
    });
    expect(updated?.displayName).toBe("Priya Sharma");
    expect(updated?.handle).toBe("@priya");
    expect(updated?.initial).toBe("P");
  });
});

describe("invite issue → validate → accept", () => {
  async function issue(overrides: Partial<Parameters<typeof issueInvite>[0]> = {}) {
    const out = await issueInvite({
      email: `it-${run}-ada@example.com`,
      invitedBy: uid("issuer"),
      invitedName: "ada",
      welcomeNote: "Welcome aboard.",
      ...overrides,
    });
    createdInviteIds.push(out.invite.id);
    return out;
  }

  it("issues a pending collaborator invite with a working magic link", async () => {
    const { invite, magicLink } = await issue();
    expect(invite.role).toBe("collaborator");
    expect(magicLink).toContain(`/invite/${invite.token}`);
    const validated = await validateInvite(invite.token);
    expect(validated.ok).toBe(true);
  });

  it("accepts once, attaches the membership, and refuses a second claim", async () => {
    const { invite } = await issue();
    const userId = uid("accepter");
    createdUserIds.push(userId);
    const accepted = await acceptInvite({ token: invite.token, userId, displayName: "Ada" });
    expect(accepted.ok).toBe(true);
    if (accepted.ok) {
      expect(accepted.membership.role).toBe("collaborator");
      expect(accepted.invite.acceptedBy).toBe(userId);
    }
    // the same link cannot be claimed again — by anyone.
    const again = await acceptInvite({
      token: invite.token,
      userId: uid("intruder"),
      displayName: "X",
    });
    expect(again).toEqual({ ok: false, reason: "accepted" });
    // counting collaborators sees the new member (U:81 ordinal source).
    expect(await collaboratorCount()).toBeGreaterThan(0);
  });

  it("rejects expired tokens with the precise reason", async () => {
    const { invite } = await issue({ ttlDays: 0 }); // expires immediately
    expect(await validateInvite(invite.token)).toEqual({ ok: false, reason: "expired" });
    const accept = await acceptInvite({
      token: invite.token,
      userId: uid("late"),
      displayName: "Late",
    });
    expect(accept).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects unknown tokens as not-found", async () => {
    expect(await validateInvite("inv_does-not-exist")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("declines only while pending (U:156 'no thanks')", async () => {
    const { invite } = await issue();
    expect(await declineInvite(invite.token)).toBe(true);
    expect(await validateInvite(invite.token)).toEqual({ ok: false, reason: "declined" });
    expect(await declineInvite(invite.token)).toBe(false); // already declined
    // a declined invite cannot be accepted.
    const accept = await acceptInvite({
      token: invite.token,
      userId: uid("decliner"),
      displayName: "D",
    });
    expect(accept).toEqual({ ok: false, reason: "declined" });
    // …and the row it would have created never existed.
    expect(await membershipFor(uid("decliner"))).toBeUndefined();
  });
});
