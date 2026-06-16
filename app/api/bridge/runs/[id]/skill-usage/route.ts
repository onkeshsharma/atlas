/**
 * ADR-0008 Phase 2 — the Bridge reports a Run's skill invocations (observed from
 * the engine stream's `Skill` tool_use blocks).
 * POST /api/bridge/runs/:id/skill-usage
 * Auth: Bearer token (bridgeFromRequest).
 * Body: { skills: [{ skill: string, count: number }] }
 * Returns: { ok: true } | 400 | 401 | 404
 */
import { bridgeFromRequest } from "@/src/domain/bridge/auth";
import { parseSkillUsageBody, recordSkillUsage } from "@/src/domain/project/brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bridge = await bridgeFromRequest(req);
  if (!bridge) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const body = parseSkillUsageBody(await req.json().catch(() => null));
  if (!body) return new Response("Bad skill-usage body", { status: 400 });

  const r = await recordSkillUsage(id, body.skills);
  if (!r.ok) return new Response("Not found", { status: 404 });
  return Response.json({ ok: true });
}
