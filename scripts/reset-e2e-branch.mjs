// Resets the disposable `e2e` Neon branch to canonical state: owner slot
// free, auth rows cleared, app tables empty — follow with `pnpm db:seed`
// against the same URL. Run whenever a suite dies mid-flight (a killed run
// skips afterAll cleanup and poisons later seeded assertions — M10 handoff
// law). Guarded to the e2e endpoint; refuses any other DATABASE_URL:
//   $env:DATABASE_URL = <ATLAS_E2E_DATABASE_URL from .env.local>
//   node scripts/reset-e2e-branch.mjs && pnpm db:seed
// Promoted from a throwaway after four uses in one integration day
// (2026-06-12). Update the wipe list when migrations add tables.
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL ?? "";
if (!url.includes("ep-small-pine-a7tow9ab")) {
  throw new Error("refusing: DATABASE_URL is not the e2e branch endpoint");
}
const sql = neon(url);

// FK-ordered wipe (children first). instance_settings kept (migration-owned).
// M10 added api_tokens + notification_preferences.
for (const t of [
  "run_stdout_chunks", "feed_events", "ticket_links", "ticket_pins",
  "runs", "briefs", "context_terms", "tickets", "project_members", "projects", "invites",
  "api_tokens", "notification_preferences", "bridges",
  "user_preferences", "memberships",
]) {
  await sql.query(`delete from ${t}`);
}
await sql`delete from neon_auth.session`;
await sql`delete from neon_auth.account`;
await sql`delete from neon_auth."user"`;

const after = await sql`select
  (select count(*)::int from neon_auth."user") as users,
  (select count(*)::int from memberships) as memberships,
  (select count(*)::int from runs) as runs,
  (select count(*)::int from tickets) as tickets`;
console.log("after wipe:", JSON.stringify(after[0]), "- now reseed");
