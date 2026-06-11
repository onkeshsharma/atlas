/**
 * M9 — Bridge sync: the snapshot-then-subscribe catch-up (ADR-0002 §2).
 *
 * Returns the queued work (as it exists NOW — runs dispatched while the
 * daemon was down are simply still here: PRD #35 offline queueing), the
 * runs this bridge is supposed to be executing (orphan sweep input), the
 * cap, and the outbox cursor to subscribe from. State beats event replay.
 */
import { bridgeFromRequest } from "@/src/domain/bridge/auth";
import type { BridgeSyncResponse } from "@/src/domain/bridge/protocol";
import { activeRunsForBridge, queuedWorkOrders } from "@/src/domain/dispatch/queries";
import { latestCursor } from "@/src/domain/live/broker";
import { runCap } from "@/src/domain/settings/instance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const bridge = await bridgeFromRequest(req);
  if (!bridge) return new Response("Unauthorized", { status: 401 });

  const [cursor, cap, queued, active] = await Promise.all([
    latestCursor(),
    runCap(),
    queuedWorkOrders(),
    activeRunsForBridge(bridge.id),
  ]);

  const body: BridgeSyncResponse = {
    cursor,
    cap,
    queued: queued.map((w) => ({
      runId: w.runId,
      ref: w.ref,
      lane: w.lane,
      helperKind: w.helperKind,
      queuePosition: w.queuePosition,
    })),
    active: active.map((a) => ({ runId: a.runId, state: a.state })),
  };
  return Response.json(body);
}
