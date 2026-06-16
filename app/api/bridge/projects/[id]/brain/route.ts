/**
 * ADR-0008 Phase 2 — the Bridge reports a project's harvested Brain (capabilities
 * facet + constitution hash) from the live worktree.
 * POST /api/bridge/projects/:id/brain
 * Auth: Bearer token (bridgeFromRequest).
 * Body: { skills: [{name, description?, modelInvocable, userInvocable}], constitutionHash: string }
 * Returns: { ok: true } | 400 | 401 | 404
 */
import { eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import { projects } from "@/src/db/schema";
import { bridgeFromRequest } from "@/src/domain/bridge/auth";
import { applyProjectBrain, parseProjectBrainBody } from "@/src/domain/project/brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bridge = await bridgeFromRequest(req);
  if (!bridge) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const body = parseProjectBrainBody(await req.json().catch(() => null));
  if (!body) return new Response("Bad brain body", { status: 400 });

  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) return new Response("Not found", { status: 404 });

  await applyProjectBrain(id, body);
  return Response.json({ ok: true });
}
