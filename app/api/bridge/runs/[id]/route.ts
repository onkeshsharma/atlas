/**
 * M9 — work-order fetch: everything the daemon needs to execute a Run
 * (ADR-0002 §3 — fetched BEFORE the claim so the worktree path can ride
 * the claim statement).
 */
import { bridgeFromRequest } from "@/src/domain/bridge/auth";
import { workOrder } from "@/src/domain/dispatch/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bridge = await bridgeFromRequest(req);
  if (!bridge) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const order = await workOrder(id);
  if (!order) return new Response("Not found", { status: 404 });
  return Response.json(order);
}
