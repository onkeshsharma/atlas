/**
 * M5 — route protection (Next 16 proxy convention; middleware.ts is the
 * deprecated name). Signed-out requests to guarded routes bounce to
 * /sign-in; the session cookie refreshes in-flight.
 *
 * M6+: extend the matcher as authed surfaces arrive (Today, projects,
 * settings, …). Per-role precision lives in src/domain/auth/guard.ts.
 */
import { auth } from "@/src/domain/auth/server";

export default auth.middleware({ loginUrl: "/sign-in" });

export const config = {
  matcher: ["/welcome", "/setup", "/onboarding"],
};
