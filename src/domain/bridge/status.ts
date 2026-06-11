/**
 * M9 — Bridge liveness read model (the ONE sanctioned shell touch:
 * sidebar BridgeStatus goes live from the heartbeat — charter §4).
 *
 * healthy  = heartbeat within 90 s (3 missed beats at the 30 s cadence)
 * offline  = a Bridge is paired but its heartbeat went stale
 * none     = no Bridge has ever paired (M6's honest default)
 */
import { desc, isNull } from "drizzle-orm";

import { db } from "@/src/db/client";
import { bridges } from "@/src/db/schema";

export const STALE_AFTER_MS = 90_000;

export type BridgePresence = {
  status: "none" | "healthy" | "offline";
  /** machine line for the user popover — "onkesh-desktop" / "no machine paired". */
  machine: string;
};

export async function bridgePresence(now: Date = new Date()): Promise<BridgePresence> {
  const rows = await db
    .select({ name: bridges.name, lastHeartbeatAt: bridges.lastHeartbeatAt })
    .from(bridges)
    // M10 — a revoked bridge is no longer "paired"; it can't heartbeat.
    .where(isNull(bridges.revokedAt))
    .orderBy(desc(bridges.lastHeartbeatAt))
    .limit(1);
  const bridge = rows[0];
  if (!bridge) return { status: "none", machine: "no machine paired" };
  const fresh =
    bridge.lastHeartbeatAt !== null &&
    now.getTime() - bridge.lastHeartbeatAt.getTime() < STALE_AFTER_MS;
  return { status: fresh ? "healthy" : "offline", machine: bridge.name };
}
