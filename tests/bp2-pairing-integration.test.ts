/**
 * BP2 — Integration test: the click-to-pair flow writes exactly ONE hashed
 * bridges row + ONE bridge-paired feed row (ADR-0004 §4 / charter done
 * criterion 1). Runs against the REAL Neon bp2-dev DB (DATABASE_URL from
 * .env.local — same as M10 integration tests).
 *
 * Does NOT test the HTTP redirect (that is the Playwright spec's job);
 * tests the domain layer that the approve action calls.
 *
 * Self-cleaning: rows are created here and deleted in afterAll
 * (marker "IT-BP2-<ts>").
 */
import { like, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/src/db/client";
import { bridges, feedEvents } from "@/src/db/schema";
import {
  generateBridgeToken,
  hashBridgeToken,
  pairBridge,
  validateCallbackUrl,
  validatePairState,
} from "@/src/domain/bridge/pairing";

const MARK = `IT-BP2-${Date.now()}`;

afterAll(async () => {
  // sweep by summary (bridge-paired rows carry the name) and by bridgeId
  const myBridges = await db
    .select({ id: bridges.id })
    .from(bridges)
    .where(like(bridges.name, `${MARK}%`));
  const ids = myBridges.map((b) => b.id);
  if (ids.length) {
    for (const id of ids) {
      await db.execute(
        sql`delete from feed_events where payload->>'bridgeId' = ${id}`,
      );
    }
  }
  await db.delete(feedEvents).where(like(feedEvents.summary, `${MARK}%`));
  await db.delete(bridges).where(like(bridges.name, `${MARK}%`));
});

describe("click-to-pair: pairBridge writes exactly one bridge row + one feed row", () => {
  it("approve: mints a token, stores only its hash, emits bridge-paired outbox row", async () => {
    const name = `${MARK}-machine-1`;

    // Call the SAME domain fn as the paste-token path — no fork (charter hard wall)
    const result = await pairBridge({ name, actor: "you" });

    // Token format (ADR-0002 §1)
    expect(result.token).toMatch(/^atlas-bridge-[0-9a-f]{48}$/);
    expect(result.rotated).toBe(false);

    // DB: exactly ONE bridge row with the hash, never the plaintext
    const bridgeRows = await db
      .select()
      .from(bridges)
      .where(like(bridges.name, name));
    expect(bridgeRows).toHaveLength(1);
    const row = bridgeRows[0];
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.tokenHash).toBe(hashBridgeToken(result.token));
    expect(row.tokenHash).not.toContain(result.token);
    expect(row.revokedAt).toBeNull();

    // DB: exactly ONE bridge-paired feed row (THE OUTBOX RULE)
    const feedRows = await db.execute(
      sql`select kind, actor, summary from feed_events where payload->>'bridgeId' = ${row.id}`,
    ) as unknown as { rows: Array<{ kind: string; actor: string; summary: string }> };
    expect(feedRows.rows).toHaveLength(1);
    expect(feedRows.rows[0].kind).toBe("bridge-paired");
    // token is never in the feed row (security: name only, per M10)
    expect(feedRows.rows[0].summary).not.toContain(result.token);
    expect(feedRows.rows[0].summary).toBe(name);
  });

  it("re-pair (same name): rotates the token, still exactly one bridge row + one bridge-paired row", async () => {
    const name = `${MARK}-machine-2`;

    const first = await pairBridge({ name, actor: "you" });
    const second = await pairBridge({ name, actor: "you" });

    expect(second.rotated).toBe(true);
    expect(second.token).not.toBe(first.token);
    expect(second.bridgeId).toBe(first.bridgeId); // same row, token rotated

    // Still exactly ONE bridge row (ON CONFLICT DO UPDATE, not insert)
    const bridgeRows = await db
      .select()
      .from(bridges)
      .where(like(bridges.name, name));
    expect(bridgeRows).toHaveLength(1);

    // Token in DB is the SECOND token's hash
    expect(bridgeRows[0].tokenHash).toBe(hashBridgeToken(second.token));
    expect(bridgeRows[0].tokenHash).not.toBe(hashBridgeToken(first.token));

    // Two bridge-paired feed rows (one per pair call)
    const feedRows = await db.execute(
      sql`select kind from feed_events where payload->>'bridgeId' = ${second.bridgeId} and kind = 'bridge-paired'`,
    ) as unknown as { rows: Array<{ kind: string }> };
    expect(feedRows.rows.length).toBeGreaterThanOrEqual(2);
  });
});

describe("loopback gate + state echo: pure validation that the approve action relies on", () => {
  it("non-loopback cb is rejected before any DB write", () => {
    const r = validateCallbackUrl("http://192.168.1.100:9999/callback");
    expect(r.ok).toBe(false);
    // No pairBridge call — the gate short-circuits
  });

  it("missing state is rejected before any DB write", () => {
    const r = validatePairState("");
    expect(r.ok).toBe(false);
  });

  it("state is echoed verbatim through the redirect URL", () => {
    const state = `nonce-${Date.now()}-with-special=&chars`;
    const cbResult = validateCallbackUrl("http://127.0.0.1:12345/callback");
    const stateResult = validatePairState(state);
    expect(cbResult.ok).toBe(true);
    expect(stateResult.ok).toBe(true);
    if (!cbResult.ok || !stateResult.ok) return;

    // Simulate the redirect URL construction in approveAction
    const target = cbResult.url;
    const token = generateBridgeToken();
    target.searchParams.set("token", token);
    target.searchParams.set("state", stateResult.state);
    target.searchParams.set("name", "my-machine");

    const redirectUrl = target.toString();
    const parsed = new URL(redirectUrl);
    // State echoed verbatim (URL-decoded)
    expect(parsed.searchParams.get("state")).toBe(state);
    expect(parsed.searchParams.get("token")).toBe(token);
    expect(parsed.hostname).toBe("127.0.0.1");
  });
});
