/**
 * M10 — the Bridges page read model (N over M9's REAL data; charter
 * item 3). Everything here is derived from rows the daemon actually
 * wrote: heartbeat liveness, reported capabilities (engine flavor,
 * version, busy run ids, the echoed cap), run tallies, the last doctor
 * verdict. No number on the page is invented.
 */
import { desc, isNull, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { bridges, type Bridge } from "@/src/db/schema";

import { parseBridgeDoctorResult, type BridgeDoctorResult } from "./doctor";
import { STALE_AFTER_MS } from "./status";

export type BridgeHealth = "healthy" | "offline" | "never";

export type BridgeCapabilities = {
  version: string | null;
  engine: "real" | "fake" | null;
  busyRunIds: string[];
  /** the cap the daemon itself reported holding at its last beat (M10 echo). */
  cap: number | null;
  node: string | null;
  platform: string | null;
};

export type BridgeView = {
  id: string;
  name: string;
  health: BridgeHealth;
  lastHeartbeatAt: Date | null;
  createdAt: Date;
  capabilities: BridgeCapabilities;
  doctor: BridgeDoctorResult | null;
  doctorRequestedAt: Date | null;
  /** runs this bridge ever claimed (real tally, not the variant's mock). */
  totalRuns: number;
  /** runs claimed in the last 30 days. */
  runs30d: number;
  shipped30d: number;
  failed30d: number;
};

function parseCapabilities(value: unknown): BridgeCapabilities {
  const empty: BridgeCapabilities = {
    version: null,
    engine: null,
    busyRunIds: [],
    cap: null,
    node: null,
    platform: null,
  };
  if (typeof value !== "object" || value === null || Array.isArray(value)) return empty;
  const v = value as Record<string, unknown>;
  return {
    version: typeof v.version === "string" ? v.version : null,
    engine: v.engine === "real" || v.engine === "fake" ? v.engine : null,
    busyRunIds: Array.isArray(v.busyRunIds)
      ? v.busyRunIds.filter((id): id is string => typeof id === "string")
      : [],
    cap: typeof v.cap === "number" && Number.isInteger(v.cap) ? v.cap : null,
    node: typeof v.node === "string" ? v.node : null,
    platform: typeof v.platform === "string" ? v.platform : null,
  };
}

export function bridgeHealth(b: Pick<Bridge, "lastHeartbeatAt">, now: Date): BridgeHealth {
  if (!b.lastHeartbeatAt) return "never";
  return now.getTime() - b.lastHeartbeatAt.getTime() < STALE_AFTER_MS ? "healthy" : "offline";
}

/** every paired (non-revoked) bridge with its honest derived facts. */
export async function bridgeViews(now: Date = new Date()): Promise<BridgeView[]> {
  const rows = await db
    .select()
    .from(bridges)
    .where(isNull(bridges.revokedAt))
    .orderBy(desc(bridges.lastHeartbeatAt), desc(bridges.createdAt));
  if (rows.length === 0) return [];

  const tallies = (await db.execute(sql`
    select bridge_id::text as bridge_id,
           count(*)::int as total,
           count(*) filter (where created_at > now() - interval '30 days')::int as recent,
           count(*) filter (where state = 'shipped' and created_at > now() - interval '30 days')::int as shipped,
           count(*) filter (where state = 'failed' and created_at > now() - interval '30 days')::int as failed
    from runs
    where bridge_id is not null
    group by bridge_id
  `)) as unknown as {
    rows: Array<{ bridge_id: string; total: number; recent: number; shipped: number; failed: number }>;
  };
  const byBridge = new Map(tallies.rows.map((t) => [t.bridge_id, t]));

  return rows.map((b) => {
    const tally = byBridge.get(b.id);
    return {
      id: b.id,
      name: b.name,
      health: bridgeHealth(b, now),
      lastHeartbeatAt: b.lastHeartbeatAt,
      createdAt: b.createdAt,
      capabilities: parseCapabilities(b.capabilities),
      doctor: parseBridgeDoctorResult(b.doctor),
      doctorRequestedAt: b.doctorRequestedAt,
      totalRuns: tally?.total ?? 0,
      runs30d: tally?.recent ?? 0,
      shipped30d: tally?.shipped ?? 0,
      failed30d: tally?.failed ?? 0,
    };
  });
}
