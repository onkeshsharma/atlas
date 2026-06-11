/**
 * M9 — the Bridge command stream (ADR-0002 §2): token-authed SSE over
 * the SAME polled feed-outbox cursor as ADR-0001's browser stream,
 * mapped to the daemon vocabulary (run-available / run-cancelled /
 * run-answered). Frames carry `id: <cursor>` → the daemon's SSE consumer
 * resumes via Last-Event-ID. Lifecycle shape mirrors app/api/live/route.ts.
 */
import type { NextRequest } from "next/server";
import { asc, gt } from "drizzle-orm";

import { db } from "@/src/db/client";
import { feedEvents } from "@/src/db/schema";
import { bridgeFromRequest } from "@/src/domain/bridge/auth";
import { rowToBridgeEvents } from "@/src/domain/bridge/events";
import { bridgeSseFrame } from "@/src/domain/bridge/protocol";
import { latestCursor } from "@/src/domain/live/broker";
import { sseKeepalive } from "@/src/domain/live/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 2_000;
const KEEPALIVE_INTERVAL_MS = 25_000;

export async function GET(req: NextRequest) {
  const bridge = await bridgeFromRequest(req);
  if (!bridge) return new Response("Unauthorized", { status: 401 });

  const lastEventId = req.headers.get("last-event-id");
  const sinceParam = req.nextUrl.searchParams.get("since");
  const requested = lastEventId ?? sinceParam;
  let cursor =
    requested !== null && /^\d+$/.test(requested) ? Number(requested) : await latestCursor();

  const encoder = new TextEncoder();
  let closed = false;
  let polling = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // abort race — swallow.
        }
      };

      send(sseKeepalive());

      const poll = async () => {
        if (closed || polling) return;
        polling = true;
        try {
          const rows = await db
            .select()
            .from(feedEvents)
            .where(gt(feedEvents.id, cursor))
            .orderBy(asc(feedEvents.id))
            .limit(100);
          for (const row of rows) {
            // M10 — pass the caller so addressed commands (bridge-doctor)
            // reach only their machine.
            for (const event of rowToBridgeEvents(row, bridge.id)) send(bridgeSseFrame(event));
          }
          if (rows.length) cursor = rows[rows.length - 1].id;
        } catch {
          // transient DB blip — next tick retries.
        } finally {
          polling = false;
        }
      };

      void poll();
      pollTimer = setInterval(() => void poll(), POLL_INTERVAL_MS);
      keepaliveTimer = setInterval(() => send(sseKeepalive()), KEEPALIVE_INTERVAL_MS);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (keepaliveTimer) clearInterval(keepaliveTimer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      closed = true;
      if (pollTimer) clearInterval(pollTimer);
      if (keepaliveTimer) clearInterval(keepaliveTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
