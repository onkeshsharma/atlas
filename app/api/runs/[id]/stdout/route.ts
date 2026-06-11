/**
 * M9 — the browser's per-run stdout stream (PRD #5; ADR-0002 §4): SSE
 * over the chunk table's OWN cursor (`seq`), 1 s poll, frames carry
 * `id: <seq>` for Last-Event-ID resume. Session-authed like /api/live —
 * stdout is Owner-eyes-only. Session B's RR TerminalBlock consumes this;
 * Session A proves it browser-deep in the e2e.
 */
import type { NextRequest } from "next/server";
import { and, asc, eq, gt } from "drizzle-orm";

import { db } from "@/src/db/client";
import { runStdoutChunks } from "@/src/db/schema";
import { getCurrentUser } from "@/src/domain/auth/current-user";
import { ssePing } from "@/src/domain/live/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 1_000;
const KEEPALIVE_INTERVAL_MS = 25_000;

function stdoutFrame(seq: number, chunks: Array<{ seq: number; content: string }>): string {
  return `id: ${seq}\nevent: stdout\ndata: ${JSON.stringify({ chunks })}\n\n`;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.role) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const lastEventId = req.headers.get("last-event-id");
  const sinceParam = req.nextUrl.searchParams.get("since");
  const requested = lastEventId ?? sinceParam;
  let cursor = requested !== null && /^\d+$/.test(requested) ? Number(requested) : 0;

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

      // hello ping — a real event so EventSource clients can hear
      // liveness (comment keepalives are invisible to the browser API).
      send(ssePing());

      const poll = async () => {
        if (closed || polling) return;
        polling = true;
        try {
          const rows = await db
            .select({ seq: runStdoutChunks.seq, content: runStdoutChunks.content })
            .from(runStdoutChunks)
            .where(and(eq(runStdoutChunks.runId, id), gt(runStdoutChunks.seq, cursor)))
            .orderBy(asc(runStdoutChunks.seq))
            .limit(200);
          if (rows.length) {
            cursor = rows[rows.length - 1].seq;
            send(stdoutFrame(cursor, rows));
          }
        } catch {
          // transient DB blip — next tick retries.
        } finally {
          polling = false;
        }
      };

      void poll();
      pollTimer = setInterval(() => void poll(), POLL_INTERVAL_MS);
      keepaliveTimer = setInterval(() => send(ssePing()), KEEPALIVE_INTERVAL_MS);

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
