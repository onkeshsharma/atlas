// M16 consecutive-run fix: clean accumulated neon_auth rows for E2E
// addresses before each suite run. Spec cleanup functions delete from
// app-layer tables (memberships, invites, feed_events, etc.) but never
// touch neon_auth.session / neon_auth.account / neon_auth."user". After
// 2-3 runs those tables accumulate 150–300 rows, and the Neon Auth
// getSession() call in requireOwner() becomes unreliable (slow or returns
// null), causing the welcome page to redirect to /sign-in and breaking
// m11-people's owner-bootstrap test with a cascade of 6-7 failures.
//
// This globalSetup runs once, before any spec, on every `pnpm test:e2e`
// invocation.  It is idempotent and safe to run against an empty DB.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// playwright.config.ts already loaded .env.local, but globalSetup runs in
// a separate process — reload so ATLAS_E2E_DATABASE_URL is available.
config({ path: ".env.local", quiet: true });

export default async function globalSetup() {
  const url = process.env.ATLAS_E2E_DATABASE_URL;
  if (!url) {
    // No e2e branch configured — skip silently (CI may inject DATABASE_URL
    // directly, or the suite is running against main which we must not touch).
    return;
  }

  // Guard: same endpoint check as reset-e2e-branch.mjs.
  if (!url.includes("ep-small-pine-a7tow9ab")) {
    throw new Error(
      "global-setup: ATLAS_E2E_DATABASE_URL is not the e2e branch endpoint — refusing to clean neon_auth rows"
    );
  }

  const sql = neon(url);

  // Delete sessions and accounts for E2E users first (FK from session →
  // user, account → user), then delete the users themselves.
  // NOTE: neon_auth tables use camelCase column names ("userId", not user_id).
  await sql`
    delete from neon_auth.session
    where "userId" in (
      select id from neon_auth."user"
      where email like 'e2e-%@example.com'
    )
  `;
  await sql`
    delete from neon_auth.account
    where "userId" in (
      select id from neon_auth."user"
      where email like 'e2e-%@example.com'
    )
  `;
  await sql`
    delete from neon_auth."user"
    where email like 'e2e-%@example.com'
  `;

  // Intentionally NOT deleting app-layer rows here (memberships, invites,
  // etc.) — each spec's beforeAll/afterAll owns that cleanup.  This file
  // only sweeps what specs never clean.
}
