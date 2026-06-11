/**
 * M5 — route protection (Next 16 proxy convention; middleware.ts is the
 * deprecated name). Signed-out GETs to guarded routes bounce to /sign-in;
 * the session cookie refreshes in-flight.
 *
 * Non-GET requests (server-action POSTs) bypass the edge guard:
 * @neondatabase/auth 0.4.2-beta's middleware verifies sessions by
 * proxying `get-session` upstream WITH THE ORIGINAL METHOD, so an action
 * POST becomes `POST /get-session` → non-2xx → a spurious login bounce
 * (diagnosed 2026-06-11; see HANDOFF-M5). Safe: every mutating action
 * runs the layer-2 domain guards (src/domain/auth/guard.ts) itself.
 *
 * M6+: extend the matcher as authed surfaces arrive (Today, projects,
 * settings, …).
 */
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/src/domain/auth/server";

const edgeGuard = auth.middleware({ loginUrl: "/sign-in" });

export default async function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }
  return edgeGuard(request);
}

export const config = {
  matcher: ["/welcome", "/setup", "/onboarding"],
};
