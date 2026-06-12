/**
 * M12 — the palette's data seam: GET /api/search?q= → the typed
 * SearchResponse (src/domain/search/). Owner-guarded like every cockpit
 * read (the proxy guards GETs at the edge only for matched routes, so
 * the route guards itself — the /api/live precedent).
 */
import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/src/domain/auth/current-user";
import { searchPalette } from "@/src/domain/search/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") {
    return new Response("Unauthorized", { status: 401 });
  }
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const response = await searchPalette(q);
  return Response.json(response);
}
