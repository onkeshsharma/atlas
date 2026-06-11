/**
 * M5 — Neon Auth server singleton (PRD "Auth & membership" deep module).
 *
 * The hosted Better Auth server lives at NEON_AUTH_BASE_URL (Neon project
 * atlas-v2 / calm-union-34473575, branch main); this instance carries all
 * server methods (signIn.email, signUp.email, signOut, getSession) plus
 * `.handler()` for app/api/auth/[...path] and `.middleware()` for proxy.ts.
 */
import { createNeonAuth } from "@neondatabase/auth/next/server";

if (!process.env.NEON_AUTH_BASE_URL) {
  throw new Error("NEON_AUTH_BASE_URL is not set — see .env.example");
}
if (!process.env.NEON_AUTH_COOKIE_SECRET) {
  throw new Error("NEON_AUTH_COOKIE_SECRET is not set — see .env.example");
}

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET,
  },
});
