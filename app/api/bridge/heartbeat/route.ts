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
    ...(body.capabilities ?? {}),
  });
  await db.execute(sql`
    update bridges
    set last_heartbeat_at = now(), capabilities = ${capabilities}::jsonb
    where id = ${bridge.id}
  `);

  return Response.json({ ok: true, cap: await runCap() });
}
