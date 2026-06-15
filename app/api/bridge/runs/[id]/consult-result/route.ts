/**
 * ADR-0007 Phase 2 — the Bridge posts an Athena consult's raw verdict here. Atlas
 * gates it through the one decision brain (gateAthenaVerdict) and answers as
 * Athena, or escalates to the Owner. Token-authed like the other bridge routes.
 */
import { resolveConsultResult } from "@/src/domain/athena/run-resolver";
import { bridgeFromRequest } from "@/src/domain/bridge/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bridge = await bridgeFromRequest(req);
  if (!bridge) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { verdict?: unknown } | null;
  if (!body || typeof body.verdict !== "string") {
    return new Response("Bad consult-result body", { status: 400 });
  }

  const outcome = await resolveConsultResult(id, body.verdict);
  return Response.json({ ok: true, outcome });
}
