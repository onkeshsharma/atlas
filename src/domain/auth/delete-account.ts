/**
 * M10 — "Leave Atlas" (BB danger zone; PRD #41). What deletion REALLY
 * does — and the DeleteConfirm modal lists exactly this, nothing more:
 *
 *   goes away: the membership (the Owner slot frees), preferences,
 *   notification preferences, every Bridge token (daemons stop on their
 *   next request — ADR-0002 §1), every API token.
 *
 *   stays: Projects, Tickets, Runs and the feed (the instance's durable
 *   record — the next Owner inherits it), the code on your machines,
 *   and the Neon Auth sign-in identity (Atlas has no deleteUser wired
 *   in this beta; recorded as an Onkesh-ruling candidate in
 *   HANDOFF-M10 if a full teardown is wanted).
 *
 * Bridge revocations go through revokeBridge so each writes its honest
 * outbox row; the rest are plain deletes on Atlas-owned rows.
 */
import { isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { bridges } from "@/src/db/schema";

import { revokeBridge } from "../bridge/pairing";

export async function deleteAccount(userId: string): Promise<void> {
  // every live bridge token dies (one outbox row each — honest history)
  const live = await db
    .select({ id: bridges.id })
    .from(bridges)
    .where(isNull(bridges.revokedAt));
  for (const bridge of live) {
    await revokeBridge({ bridgeId: bridge.id, actor: "you" });
  }
  // api tokens: the governance record keeps the rows, revoked
  await db.execute(sql`update api_tokens set revoked_at = now() where revoked_at is null`);
  // Atlas-owned per-user rows
  await db.execute(sql`delete from notification_preferences where user_id = ${userId}`);
  await db.execute(sql`delete from user_preferences where user_id = ${userId}`);
  // last: the membership — the one-Owner slot frees atomically
  await db.execute(sql`delete from memberships where user_id = ${userId}`);
}
