/**
 * M10 — integration against the REAL Neon m10-dev DB (PRD heavy tier):
 * every new writer's single-statement write+outbox atomicity (THE
 * OUTBOX RULE) and the conditional-claim races. Self-cleaning: rows are
 * created here and deleted in afterAll (marker "IT-M10").
 */
import { randomBytes } from "node:crypto";

import { eq, inArray, like, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/src/db/client";
import { apiTokens, bridges, feedEvents, notificationPreferences, projects } from "@/src/db/schema";
import { bridgeFromRequest, hashBridgeToken } from "@/src/domain/bridge/auth";
import {
  applyDoctorResult,
  parseDoctorRequestPayload,
  requestBridgeDoctor,
  type BridgeDoctorResult,
} from "@/src/domain/bridge/doctor";
import { pairBridge, revokeBridge } from "@/src/domain/bridge/pairing";
import { bridgeViews } from "@/src/domain/bridge/queries";
import {
  createApiToken,
  hashApiToken,
  listApiTokens,
  revokeApiToken,
  rotateApiToken,
} from "@/src/domain/tokens/api-tokens";
import {
  defaultEvents,
  notificationPrefs,
  patchNotificationPrefs,
} from "@/src/domain/notifications/preferences";

const MARK = `IT-M10-${Date.now()}`;
const BRIDGE_NAME = `${MARK} machine`;
const USER_ID = `${MARK}-user`;

let projectId: string;

beforeAll(async () => {
  const [project] = await db
    .insert(projects)
    .values({
      name: `${MARK} project`,
      slug: `it-m10-${Date.now()}`,
      localPath: "C:/tmp/it-m10-repo",
      pinned: false,
      seeded: false,
    })
    .returning({ id: projects.id });
  projectId = project.id;
});

afterAll(async () => {
  await db.delete(feedEvents).where(like(feedEvents.summary, `%${MARK}%`));
  // doctor rows carry the bridge name in summaries; sweep by bridge ids too
  const myBridges = await db
    .select({ id: bridges.id })
    .from(bridges)
    .where(like(bridges.name, `${MARK}%`));
  if (myBridges.length) {
    await db
      .delete(feedEvents)
      .where(
        inArray(
          sql`payload->>'bridgeId'`,
          myBridges.map((b) => b.id),
        ),
      );
  }
  await db.delete(bridges).where(like(bridges.name, `${MARK}%`));
  await db.delete(apiTokens).where(like(apiTokens.name, `${MARK}%`));
  await db.delete(notificationPreferences).where(eq(notificationPreferences.userId, USER_ID));
  await db.delete(projects).where(eq(projects.id, projectId));
});

function authedRequest(token: string): Request {
  return new Request("http://localhost/api/bridge/sync", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe("pairing (ONE shared function — UI + script)", () => {
  it("pairs a new machine: hashed at rest + bridge-paired outbox row", async () => {
    const result = await pairBridge({ name: BRIDGE_NAME, actor: "you" });
    expect(result.rotated).toBe(false);
    expect(result.token).toMatch(/^atlas-bridge-[0-9a-f]{48}$/);

    const [row] = await db.select().from(bridges).where(eq(bridges.id, result.bridgeId));
    expect(row.tokenHash).toBe(hashBridgeToken(result.token));
    expect(row.tokenHash).not.toContain(result.token);

    const feed = await db
      .select()
      .from(feedEvents)
      .where(eq(feedEvents.kind, "bridge-paired"))
      .then((rows) => rows.filter((r) => r.summary.includes(MARK)));
    expect(feed).toHaveLength(1);
    expect(feed[0].actor).toBe("you");
  });

  it("re-pairing the same name ROTATES: old token dies, row id survives", async () => {
    const first = await pairBridge({ name: BRIDGE_NAME });
    const second = await pairBridge({ name: BRIDGE_NAME });
    expect(second.rotated).toBe(true);
    expect(second.bridgeId).toBe(first.bridgeId);

    expect(await bridgeFromRequest(authedRequest(first.token))).toBeNull();
    const resolved = await bridgeFromRequest(authedRequest(second.token));
    expect(resolved?.id).toBe(second.bridgeId);
  });

  it("revoke is a mark: auth dies on the NEXT request; re-pair clears it", async () => {
    const paired = await pairBridge({ name: BRIDGE_NAME });
    const revoked = await revokeBridge({ bridgeId: paired.bridgeId, actor: "you" });
    expect(revoked.ok).toBe(true);
    // double-revoke loses the conditional claim
    expect((await revokeBridge({ bridgeId: paired.bridgeId })).ok).toBe(false);
    expect(await bridgeFromRequest(authedRequest(paired.token))).toBeNull();
    // revoked bridges leave the management read model
    expect((await bridgeViews()).find((b) => b.id === paired.bridgeId)).toBeUndefined();

    const repaired = await pairBridge({ name: BRIDGE_NAME });
    expect(repaired.bridgeId).toBe(paired.bridgeId);
    expect(await bridgeFromRequest(authedRequest(repaired.token))).not.toBeNull();
  });
});

describe("doctor round-trip writers (THE OUTBOX RULE)", () => {
  it("request: marks the bridge + ONE doctor-requested row with the inputs payload", async () => {
    const paired = await pairBridge({ name: BRIDGE_NAME });
    const result = await requestBridgeDoctor({ bridgeId: paired.bridgeId, actor: "you" });
    expect(result.ok).toBe(true);

    const [row] = await db.select().from(bridges).where(eq(bridges.id, paired.bridgeId));
    expect(row.doctorRequestedAt).not.toBeNull();

    const feedRow = await db
      .select()
      .from(feedEvents)
      .where(eq(feedEvents.id, (result as { feedEventId: number }).feedEventId))
      .then((rows) => rows[0]);
    expect(feedRow.kind).toBe("doctor-requested");
    const payload = parseDoctorRequestPayload(feedRow.payload);
    expect(payload?.bridgeId).toBe(paired.bridgeId);
    // the IT project has a local_path — it must ride the command
    expect(payload?.projects.map((p) => p.localPath)).toContain("C:/tmp/it-m10-repo");
  });

  it("a second request while one is pending loses the claim (double-click)", async () => {
    const second = await requestBridgeDoctor({
      bridgeId: (await bridgeViews()).find((b) => b.name === BRIDGE_NAME)!.id,
    });
    expect(second.ok).toBe(false);
  });

  it("result: lands the verdict, clears the marker, appends doctor-completed", async () => {
    const bridge = (await bridgeViews()).find((b) => b.name === BRIDGE_NAME)!;
    const verdict: BridgeDoctorResult = {
      ranAt: new Date().toISOString(),
      version: "2.0.0-test",
      engine: "fake",
      lockPort: 9231,
      checks: [
        { key: "git", label: "git available", status: "pass", detail: "git version 2.49.0" },
        { key: "gh", label: "GitHub CLI auth", status: "warn", detail: "gh missing" },
      ],
    };
    const applied = await applyDoctorResult({ bridgeId: bridge.id, result: verdict });
    expect(applied.ok).toBe(true);

    const [row] = await db.select().from(bridges).where(eq(bridges.id, bridge.id));
    expect(row.doctorRequestedAt).toBeNull();
    expect((row.doctor as { lockPort: number }).lockPort).toBe(9231);

    const view = (await bridgeViews()).find((b) => b.id === bridge.id)!;
    expect(view.doctor?.checks).toHaveLength(2);

    const completedRow = await db
      .select()
      .from(feedEvents)
      .where(
        eq(feedEvents.id, (applied as { feedEventId: number }).feedEventId),
      )
      .then((rows) => rows[0]);
    expect(completedRow.kind).toBe("doctor-completed");
    expect(completedRow.summary).toContain("1 passed · 1 to look at");
  });

  it("a result for a REVOKED bridge loses the claim", async () => {
    const bridge = (await bridgeViews()).find((b) => b.name === BRIDGE_NAME)!;
    await revokeBridge({ bridgeId: bridge.id });
    const applied = await applyDoctorResult({
      bridgeId: bridge.id,
      result: {
        ranAt: new Date().toISOString(),
        version: "x",
        engine: "fake",
        lockPort: 1,
        checks: [{ key: "git", label: "git", status: "pass", detail: null }],
      },
    });
    expect(applied.ok).toBe(false);
  });
});

describe("api tokens (PRD #36)", () => {
  it("create: plaintext returned once, hash at rest, listed newest-first", async () => {
    const created = await createApiToken({
      name: `${MARK} ci token`,
      scopes: ["tickets:read"],
      expiresDays: 30,
    });
    expect(created.token).toMatch(/^atp_[0-9a-f]{48}$/);

    const rows = await listApiTokens();
    const mine = rows.find((r) => r.id === created.id)!;
    expect(mine.tokenHash).toBe(hashApiToken(created.token));
    expect(mine.prefix.endsWith("…")).toBe(true);
    expect(mine.scopes).toEqual(["tickets:read"]);
    const days = (mine.expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThanOrEqual(30);
    expect(mine.lastUsedAt).toBeNull(); // honest: nothing consumes tokens yet
  });

  it("create rejects bad scopes at the domain boundary", async () => {
    await expect(
      createApiToken({ name: `${MARK} bad`, scopes: ["*", "tickets:read"] }),
    ).rejects.toThrow(/stands alone/);
  });

  it("rotate: fresh secret + prefix + expiry on the SAME governance row", async () => {
    const created = await createApiToken({ name: `${MARK} rotating`, scopes: ["runs:read"] });
    const rotated = await rotateApiToken({ id: created.id });
    expect(rotated).not.toBeNull();
    expect(rotated!.token).not.toBe(created.token);
    const [row] = await db.select().from(apiTokens).where(eq(apiTokens.id, created.id));
    expect(row.tokenHash).toBe(hashApiToken(rotated!.token));
  });

  it("revoke: a mark, idempotent-down (second revoke is a no-op), rotate refuses", async () => {
    const created = await createApiToken({ name: `${MARK} revoking`, scopes: ["*"] });
    expect(await revokeApiToken({ id: created.id })).toBe(true);
    expect(await revokeApiToken({ id: created.id })).toBe(false);
    expect(await rotateApiToken({ id: created.id })).toBeNull();
  });
});

describe("notification preferences (the rows M13 reads)", () => {
  it("reads honest defaults before any row exists", async () => {
    const prefs = await notificationPrefs(USER_ID);
    expect(prefs.emailEnabled).toBe(true);
    expect(prefs.frequency).toBe("instant");
    expect(prefs.events).toEqual(defaultEvents());
    expect(prefs.quietFrom).toBeNull();
  });

  it("patches merge: single event flips persist beside other fields", async () => {
    expect((await patchNotificationPrefs(USER_ID, { frequency: "daily" })).ok).toBe(true);
    expect(
      (await patchNotificationPrefs(USER_ID, { event: { key: "ticket-moved", on: true } })).ok,
    ).toBe(true);
    expect(
      (
        await patchNotificationPrefs(USER_ID, {
          quietFrom: "22:00",
          quietUntil: "08:00",
          timezone: "Asia/Kolkata",
        })
      ).ok,
    ).toBe(true);

    const prefs = await notificationPrefs(USER_ID);
    expect(prefs.frequency).toBe("daily");
    expect(prefs.events["ticket-moved"]).toBe(true);
    expect(prefs.events["ticket-shipped"]).toBe(true); // default survived the merge
    expect(prefs.quietFrom).toBe("22:00");
    expect(prefs.timezone).toBe("Asia/Kolkata");
  });

  it("validation: bad times / unknown keys are refused, stored rows untouched", async () => {
    expect((await patchNotificationPrefs(USER_ID, { quietFrom: "25:99" })).ok).toBe(false);
    expect(
      (await patchNotificationPrefs(USER_ID, { event: { key: "nope", on: true } })).ok,
    ).toBe(false);
    expect((await notificationPrefs(USER_ID)).quietFrom).toBe("22:00");
  });

  it("clearing the quiet window stores NULLs (honest off)", async () => {
    expect(
      (await patchNotificationPrefs(USER_ID, { quietFrom: null, quietUntil: null })).ok,
    ).toBe(true);
    const prefs = await notificationPrefs(USER_ID);
    expect(prefs.quietFrom).toBeNull();
    expect(prefs.quietUntil).toBeNull();
  });
});
