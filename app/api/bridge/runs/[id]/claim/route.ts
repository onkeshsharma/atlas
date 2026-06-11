/**
 * M9 — the claim: queued → running + bridge assignment + worktree fields
 * in ONE conditional statement (`started` outbox row). Two daemons (or a
 * retry) racing: exactly one wins; the loser gets 409 not-claimed and
 * drops the run (ADR-0002 §3).
 */
import { bridgeFromRequest } from "@/src/domain/bridge/auth";
import { parseBridgeClaim } from "@/src/domain/bridge/protocol";
import { claimRun } from "@/src/domain/run/bridge-writers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bridge = await bridgeFromRequest(req);
  if (!bridge) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const body = parseBridgeClaim(await req.json().catch(() => null));
  if (!body) return new Response("Bad claim body", { status: 400 });

  const result = await claimRun({
    runId: id,
    bridgeId: bridge.id,
    worktreePath: body.worktreePath,
    branch: body.branch,
  });
  if (!result.ok) return Response.json({ ok: false, reason: result.reason }, { status: 409 });
  return Response.json({ ok: true });
}
