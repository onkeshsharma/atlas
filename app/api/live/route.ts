/**
 * M6 — the Live seam's transport: SSE over the feed-outbox cursor.
 * Decision + trade-offs: docs/adr/0001-live-transport.md.
 *
 * One stream per signed-in tab. Frames carry `id: <cursor>` so the
 * browser's automatic reconnect resumes via Last-Event-ID (at-least-once
 * delivery; the ?since query param seeds first connection).
 *
 * Frame/lifecycle shape rewritten from v1 prior art:
 * atlas/app/api/events/user/route.ts (T41) — provenance per master plan §7.5.
 */
import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/src/domain/auth/current-user";
import { latestCursor, pollLiveEvents } from "@/src/domain/live/broker";
import { sseFrame, sseKeepalive } from "@/src/domain/live/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 2_000;
const KEEPALIVE_INTERVAL_MS = 25_000;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.role) {
    return new Response("Unauthorized", { status: 401 });
  }

  // resume point: Last-Event-ID (reconnect) beats ?since (first connect).
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
          // controller already closed (abort race) — swallow.
        }
      };

      // hello comment so consumers see liveness before any real event.
      send(sseKeepalive());

      const poll = async () => {
        if (closed || polling) return;
        polling = true;
        try {
          const { events, cursor: next } = await pollLiveEvents(cursor);
          for (const event of events) send(sseFrame(event));
          cursor = next;
        } catch {
          // transient DB blip — next tick retries; the browser keeps the
          // manual-refresh escape hatch either way.
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
