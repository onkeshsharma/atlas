/**
 * M9 — stdout chunk ingest (ADR-0002 §4). Idempotent on (run_id, seq) —
 * daemon retries are no-ops. Stdout NEVER rides feed_events (charter
 * hard rule); the browser reads it from the chunk table's own cursor
 * (app/api/runs/[id]/stdout).
 */
import { eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import { runs } from "@/src/db/schema";
import { bridgeFromRequest } from "@/src/domain/bridge/auth";
import { parseBridgeStdout } from "@/src/domain/bridge/protocol";
import { ingestStdoutChunks } from "@/src/domain/run/bridge-writers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bridge = await bridgeFromRequest(req);
  if (!bridge) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const body = parseBridgeStdout(await req.json().catch(() => null));
  if (!body) return new Response("Bad stdout body", { status: 400 });

  const [run] = await db.select({ id: runs.id }).from(runs).where(eq(runs.id, id)).limit(1);
  if (!run) return new Response("Not found", { status: 404 });

  const { inserted } = await ingestStdoutChunks(run.id, body.chunks);
  return Response.json({ ok: true, inserted });
}
