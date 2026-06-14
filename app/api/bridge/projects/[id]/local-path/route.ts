/**
 * M18 — Bridge reports a resolved local checkout path back to Atlas.
 * POST /api/bridge/projects/:id/local-path
 * Auth: Bearer token (bridgeFromRequest).
 * Body: { localPath: string }
 * Returns: { ok: true } | 400 | 401
 */
import { bridgeFromRequest } from "@/src/domain/bridge/auth";
import { setProjectLocalPath } from "@/src/domain/project/link-local-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bridge = await bridgeFromRequest(req);
  if (!bridge) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request body", { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).localPath !== "string" ||
    (body as Record<string, unknown>).localPath === ""
  ) {
    return new Response("Missing localPath", { status: 400 });
  }

  const localPath = (body as { localPath: string }).localPath;

  await setProjectLocalPath({
    projectId: id,
    localPath,
    actor: "Bridge",
  });

  return Response.json({ ok: true });
}
