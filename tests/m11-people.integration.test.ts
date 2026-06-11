/**
 * M11 — integration against the REAL Neon m11-dev DB (PRD heavy tier):
 * every new writer's single-statement write+outbox atomicity (THE
 * OUTBOX RULE), the invite lifecycle with project scoping, the
 * two-table guard, and the profile-change emission gate. Self-cleaning
 * via the "IT-M11" marker (the m10 idiom).
 */
import { eq, inArray, like, or, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/src/db/client";
import { feedEvents, invites, memberships, projectMembers, projects } from "@/src/db/schema";
import {
  acceptInvite,
  declineInvite,
  issueInvite,
  revokeInvite,
} from "@/src/domain/auth/invites";
import {
  ensureMembership,
  ownerMembership,
  OwnerExistsError,
} from "@/src/domain/auth/memberships";
import { updateDisplayName } from "@/src/domain/auth/profile";
import { canSeeProject, projectAccessFor, visibleProjectIds } from "@/src/domain/people/guard";
import { latestActorActivity, pendingInvites, projectRoster, trustCircle } from "@/src/domain/people/queries";
import {
  addProjectMember,
  removeProjectMember,
  revokeInstanceAccess,
} from "@/src/domain/people/roster";

const MARK = `IT-M11-${Date.now()}`;
const USER_A = `${MARK}-user-a`;
const USER_B = `${MARK}-user-b`;
const OWNER_ID = `${MARK}-owner`;
const EMAIL = `it-m11-${Date.now()}@example.com`;

let projectId: string;

async function feedRowsMarked() {
  return db
    .select()
    .from(feedEvents)
    .where(or(like(feedEvents.summary, `%${MARK}%`), like(feedEvents.summary, `%${EMAIL}%`)));
}

beforeAll(async () => {
  const [project] = await db
    .insert(projects)
    .values({ name: `${MARK} project`, slug: `it-m11-${Date.now()}`, pinned: false, seeded: false })
    .returning({ id: projects.id });
  projectId = project.id;
});

afterAll(async () => {
  await db.delete(feedEvents).where(
    or(
      like(feedEvents.summary, `%${MARK}%`),
      like(feedEvents.summary, `%${EMAIL}%`),
      eq(feedEvents.projectId, projectId),
      sql`${feedEvents.payload}->>'userId' like ${`${MARK}%`}`,
    ),
  );
  await db
    .delete(projectMembers)
    .where(inArray(projectMembers.userId, [USER_A, USER_B, OWNER_ID]));
  await db.delete(invites).where(eq(invites.email, EMAIL));
  await db.delete(memberships).where(like(memberships.userId, `${MARK}%`));
  await db.delete(projects).where(eq(projects.id, projectId));
});

describe("roster writers (THE OUTBOX RULE)", () => {
  it("grant: roster row + member-added feed row in one statement", async () => {
    await ensureMembership({ userId: USER_A, role: "collaborator", displayName: `${MARK} Ada` });
    const result = await addProjectMember({
      projectId,
      userId: USER_A,
      addedBy: OWNER_ID,
      actor: "you",
    });
    expect(result.ok).toBe(true);

    const roster = await projectRoster(projectId);
    const ada = roster.find((p) => p.userId === USER_A);
    expect(ada?.role).toBe("collaborator");
    expect(ada?.displayName).toBe(`${MARK} Ada`);

    const feed = (await feedRowsMarked()).filter((r) => r.kind === "member-added");
    expect(feed).toHaveLength(1);
    expect(feed[0].summary).toBe(`${MARK} Ada to ${MARK} project`);
    expect(feed[0].projectId).toBe(projectId);
  });

  it("a duplicate grant claims nothing and emits nothing", async () => {
    const result = await addProjectMember({
      projectId,
      userId: USER_A,
      addedBy: OWNER_ID,
      actor: "you",
    });
    expect(result).toEqual({ ok: false, reason: "not-claimed" });
    const feed = (await feedRowsMarked()).filter((r) => r.kind === "member-added");
    expect(feed).toHaveLength(1);
  });

  it("the two-table guard: membership alone is NOT enough", async () => {
    await ensureMembership({ userId: USER_B, role: "collaborator", displayName: `${MARK} Max` });
    expect(await projectAccessFor(USER_B, projectId)).toEqual({
      ok: false,
      reason: "not-on-roster",
    });
    expect(await canSeeProject(USER_A, projectId)).toBe(true);
    expect(await projectAccessFor(`${MARK}-stranger`, projectId)).toEqual({
      ok: false,
      reason: "no-membership",
    });
    // the Owner sees everything, roster or not
    expect(await projectAccessFor(OWNER_ID, projectId, "owner")).toEqual({
      ok: true,
      role: "owner",
    });
    expect(await visibleProjectIds(USER_A)).toContain(projectId);
  });

  it("remove: roster row gone + member-removed (scope project); membership stays", async () => {
    const result = await removeProjectMember({ projectId, userId: USER_A, actor: "you" });
    expect(result.ok).toBe(true);
    expect(await canSeeProject(USER_A, projectId)).toBe(false);
    const membership = await db.query.memberships.findFirst({
      where: eq(memberships.userId, USER_A),
    });
    expect(membership).toBeDefined(); // instance access untouched

    const feed = (await feedRowsMarked()).filter((r) => r.kind === "member-removed");
    expect(feed).toHaveLength(1);
    expect(feed[0].payload).toMatchObject({ scope: "project", userId: USER_A });

    // double-remove claims nothing
    expect(await removeProjectMember({ projectId, userId: USER_A, actor: "you" })).toEqual({
      ok: false,
      reason: "not-claimed",
    });
  });

  it("revoke instance access: membership + roster rows go, one feed row", async () => {
    await addProjectMember({ projectId, userId: USER_B, addedBy: OWNER_ID, actor: "you" });
    const result = await revokeInstanceAccess({ userId: USER_B, actor: "you" });
    expect(result.ok).toBe(true);
    expect(
      await db.query.memberships.findFirst({ where: eq(memberships.userId, USER_B) }),
    ).toBeUndefined();
    expect(await visibleProjectIds(USER_B)).toHaveLength(0);

    const feed = (await feedRowsMarked()).filter(
      (r) => r.kind === "member-removed" && (r.payload as { scope?: string })?.scope === "instance",
    );
    expect(feed).toHaveLength(1);
    expect(feed[0].summary).toBe(`${MARK} Max from this Atlas`);
  });

  it("the Owner is structurally irrevocable (role gate in the WHERE)", async () => {
    // the one-Owner slot is instance-wide and other suite files may hold
    // it concurrently (vitest runs files in parallel) — prove the gate
    // against whichever Owner row stands.
    let ownerId = OWNER_ID;
    let slotIsOurs = true;
    try {
      await ensureMembership({ userId: OWNER_ID, role: "owner", displayName: `${MARK} Owner` });
    } catch (err) {
      if (!(err instanceof OwnerExistsError)) throw err;
      slotIsOurs = false;
      const standing = await ownerMembership();
      expect(standing).toBeDefined();
      ownerId = standing!.userId;
    }
    expect(await revokeInstanceAccess({ userId: ownerId, actor: "you" })).toEqual({
      ok: false,
      reason: "not-claimed",
    });
    if (slotIsOurs) {
      expect(
        await db.query.memberships.findFirst({ where: eq(memberships.userId, OWNER_ID) }),
      ).toBeDefined();
    }
  });
});

describe("invite lifecycle (project-scoped, outboxed)", () => {
  it("issue: invite row + `invited` feed row carrying note + project", async () => {
    const { invite, magicLink } = await issueInvite({
      email: EMAIL,
      invitedBy: OWNER_ID,
      invitedName: "dev",
      welcomeNote: "Welcome aboard.",
      projectId,
      actor: "you",
    });
    expect(invite.projectId).toBe(projectId);
    expect(magicLink).toContain(`/invite/${invite.token}`);

    const pending = await pendingInvites(projectId);
    expect(pending.map((p) => p.email)).toContain(EMAIL);
    expect(pending[0].projectName).toBe(`${MARK} project`);

    const feed = (await feedRowsMarked()).filter((r) => r.kind === "invited");
    expect(feed).toHaveLength(1);
    expect(feed[0].summary).toBe(`${EMAIL} — ${MARK} project`);
    expect(feed[0].preview).toBe("Welcome aboard.");
  });

  it("accept: claim + membership + roster grant + `joined` feed row", async () => {
    const { invite } = await issueInvite({
      email: EMAIL,
      invitedBy: OWNER_ID,
      projectId,
      actor: "you",
    });
    const result = await acceptInvite({
      token: invite.token,
      userId: USER_A,
      displayName: `${MARK} Ada`,
      ordinal: "the 1st Collaborator",
    });
    expect(result.ok).toBe(true);
    expect(await canSeeProject(USER_A, projectId)).toBe(true);

    const feed = (await feedRowsMarked()).filter((r) => r.kind === "joined");
    expect(feed).toHaveLength(1);
    expect(feed[0].actor).toBe(`${MARK} Ada`);
    expect(feed[0].summary).toBe(`the circle as the 1st Collaborator · ${MARK} project`);

    // double-accept reports precisely
    const again = await acceptInvite({
      token: invite.token,
      userId: USER_B,
      displayName: "someone",
    });
    expect(again).toEqual({ ok: false, reason: "accepted" });
  });

  it("the trust circle reads the accepted Collaborator's grants", async () => {
    const circle = await trustCircle();
    const ada = circle.find((p) => p.userId === USER_A);
    expect(ada?.projects.map((p) => p.name)).toContain(`${MARK} project`);
  });

  it("decline + revoke each mark once and emit once", async () => {
    const { invite: toDecline } = await issueInvite({
      email: EMAIL,
      invitedBy: OWNER_ID,
      actor: "you",
    });
    expect(await declineInvite(toDecline.token)).toBe(true);
    expect(await declineInvite(toDecline.token)).toBe(false);

    const { invite: toRevoke } = await issueInvite({
      email: EMAIL,
      invitedBy: OWNER_ID,
      actor: "you",
    });
    expect(await revokeInvite({ inviteId: toRevoke.id, actor: "you" })).toBe(true);
    expect(await revokeInvite({ inviteId: toRevoke.id, actor: "you" })).toBe(false);

    const rows = await feedRowsMarked();
    expect(rows.filter((r) => r.kind === "invite-declined")).toHaveLength(1);
    expect(rows.filter((r) => r.kind === "invite-revoked")).toHaveLength(1);
  });
});

describe("profile-change emission (M10 seam, charter item 6)", () => {
  it("a real change emits ONE profile-changed row; a no-op emits none", async () => {
    expect((await updateDisplayName(USER_A, `${MARK} Ada Lovelace`)).ok).toBe(true);
    expect((await updateDisplayName(USER_A, `${MARK} Ada Lovelace`)).ok).toBe(true); // no-op

    const rows = (await feedRowsMarked()).filter((r) => r.kind === "profile-changed");
    expect(rows).toHaveLength(1);
    expect(rows[0].summary).toBe(`display name — now "${MARK} Ada Lovelace"`);
    expect(rows[0].payload).toMatchObject({ field: "display_name", userId: USER_A });
  });
});

describe("presence inputs", () => {
  it("the activity map carries the newest row per lowercased actor", async () => {
    const map = await latestActorActivity(30);
    // "you" exists from this suite's own writer rows
    expect(map.get("you")).toBeInstanceOf(Date);
  });
});
