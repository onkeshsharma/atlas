/**
 * M9 — Bridge heartbeat (ADR-0002 §3; v1 prior art: heartbeat.ts,
 * rewritten). Updates the bridge row's liveness + reported capabilities;
 * NO outbox row (heartbeats are chrome, not history — the sidebar reads
 * the column at render). The response carries the current run cap so cap
 * changes propagate at the 30 s cadence without a reconnect.
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { bridgeFromRequest } from "@/src/domain/bridge/auth";
import { parseBridgeHeartbeat } from "@/src/domain/bridge/protocol";
import { runCap } from "@/src/domain/settings/instance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const bridge = await bridgeFromRequest(req);
  if (!bridge) return new Response("Unauthorized", { status: 401 });

  const body = parseBridgeHeartbeat(await req.json().catch(() => null));
  if (!body) return new Response("Bad heartbeat body", { status: 400 });

  const capabilities = JSON.stringify({
    version: body.version,
    engine: body.engine,
    // M10 — busy run ids + the daemon's echoed cap land in the stored
    // capabilities so N renders "what the daemon can actually do" and
    // "daemon confirmed cap N" from real reports, never inference.
    busyRunIds: body.busyRunIds,
    ...(body.cap !== undefined ? { cap: body.cap } : {}),
    ...(body.capabilities ?? {}),
    // M17 — per-run resource telemetry stored alongside capabilities.
    // Rides the heartbeat column; NEVER written to feed_events.
    ...(body.resources !== undefined ? { resources: body.resources } : {}),
  });
  await db.execute(sql`
    update bridges
    set last_heartbeat_at = now(), capabilities = ${capabilities}::jsonb
    where id = ${bridge.id}
  `);

  return Response.json({ ok: true, cap: await runCap() });
}
