/**
 * M6 — demo seed for the cockpit (charter §1: "honest demo rows — real
 * DB rows; provenance marked as seed").
 *
 * Idempotent: deletes every `seeded = true` row first, then re-inserts a
 * coherent universe (projects → tickets → runs → feed outbox) with
 * timestamps relative to NOW so Today / the inbox buckets / the week
 * bars always have live-looking data. Run: `pnpm db:seed`.
 *
 * Hand-written rows only — every count the UI shows is derived by the
 * domain queries from these rows, never hardcoded in JSX.
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing — see .env.example");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const now = Date.now();
const minutesAgo = (m) => new Date(now - m * 60_000);
const hoursAgo = (h) => minutesAgo(h * 60);
const daysAgo = (d, hour = 14) => {
  const t = new Date(now);
  t.setDate(t.getDate() - d);
  t.setHours(hour, 12, 0, 0);
  return t;
};

async function main() {
  // ── wipe previous seed (FK order) ──
  await sql`delete from feed_events where seeded`;
  await sql`delete from runs where seeded`;
  await sql`delete from tickets where seeded`;
  await sql`delete from projects where seeded`;

  // ── projects (E: acme-website pinned; two quiet others) ──
  const projectRows = await sql`
    insert into projects (name, pinned, seeded, created_at) values
      ('acme-website',    true,  true, ${daysAgo(40)}),
      ('atlas-internal',  false, true, ${daysAgo(33)}),
      ('side-experiment', false, true, ${daysAgo(21)})
    returning id, name
  `;
  const project = Object.fromEntries(projectRows.map((p) => [p.name, p.id]));

  // ── tickets (hero counts derive: 3 triage · 2 review-ready · 1 failed) ──
  const ticketSeed = [
    ["T-247", "acme-website", "Add export to CSV", "review-ready", "ada@acme.io", hoursAgo(26), minutesAgo(12)],
    ["T-301", "acme-website", "Onboarding copy refresh", "review-ready", "carmen@acme.io", daysAgo(2), hoursAgo(2)],
    ["T-149", "atlas-internal", "Mermaid renders blank on iOS", "failed", "you", daysAgo(3), minutesAgo(40)],
    ["T-302", "acme-website", "Onboarding screenshots are stale", "triage", "carmen@acme.io", daysAgo(3, 10), hoursAgo(3)],
    ["T-310", "acme-website", "Dark header flashes on load", "triage", "ada@acme.io", daysAgo(1, 11), minutesAgo(4)],
    ["T-311", "side-experiment", "Weekly digest copy tweaks", "triage", "you", daysAgo(2, 16), daysAgo(2, 16)],
    ["T-249", "acme-website", "Add JSON export endpoint", "shipped", "ada@acme.io", daysAgo(4), hoursAgo(1)],
    ["T-201", "acme-website", "Refactor checkout flow", "shipped", "you", daysAgo(6), daysAgo(1, 17)],
    ["T-280", "atlas-internal", "Empty-state illustrations", "backlog", "you", daysAgo(8, 9), daysAgo(1, 9)],
    ["T-308", "atlas-internal", "Parallel-safe Ship Group dispatch", "in-progress", "you", daysAgo(1, 15), minutesAgo(18)],
  ];
  const ticket = {};
  for (const [ref, proj, title, state, reporter, createdAt, updatedAt] of ticketSeed) {
    const [row] = await sql`
      insert into tickets (ref, project_id, title, state, reporter, seeded, created_at, updated_at)
      values (${ref}, ${project[proj]}, ${title}, ${state}, ${reporter}, true, ${createdAt}, ${updatedAt})
      returning id
    `;
    ticket[ref] = row.id;
  }

  // ── runs (active strip: 1 queued · 1 running · 2 needs-input) ──
  const q13 = {
    kind: "permission",
    prompt: "Include archived (>90d closed) tickets in the export?",
    options: ["Include archived", "Active only"],
    context: "src/export/csv.ts",
    raisedAt: minutesAgo(12).toISOString(),
  };
  const q15 = {
    kind: "question",
    prompt: "The flash comes from the theme bootstrap script — okay to inline it in <head>?",
    context: "app/layout.tsx",
    raisedAt: minutesAgo(4).toISOString(),
  };
  const runSeed = [
    ["R-12", "atlas-internal", "T-308", "Parallel-safe Ship Group dispatch", "running", null, minutesAgo(25), minutesAgo(18)],
    ["R-13", "acme-website", "T-247", "Add export to CSV", "needs-input", q13, hoursAgo(2), minutesAgo(12)],
    ["R-15", "acme-website", "T-310", "Dark header flashes on load", "needs-input", q15, minutesAgo(30), minutesAgo(4)],
    ["R-14", "acme-website", null, "Helper — enrich T-302 with a screenshot inventory", "queued", null, minutesAgo(5), minutesAgo(5)],
    ["R-9", "acme-website", "T-301", "Onboarding copy refresh", "review-ready", null, daysAgo(1, 12), hoursAgo(2)],
    ["R-8", "acme-website", "T-249", "Add JSON export endpoint", "shipped", null, hoursAgo(3), hoursAgo(1)],
    ["R-7", "atlas-internal", "T-149", "Mermaid renders blank on iOS", "failed", null, hoursAgo(2), minutesAgo(40)],
  ];
  const run = {};
  for (const [ref, proj, tref, title, state, question, createdAt, updatedAt] of runSeed) {
    const [row] = await sql`
      insert into runs (ref, project_id, ticket_id, title, state, question, seeded, created_at, updated_at)
      values (${ref}, ${project[proj]}, ${tref ? ticket[tref] : null}, ${title}, ${state},
              ${question ? JSON.stringify(question) : null}::jsonb, true, ${createdAt}, ${updatedAt})
      returning id
    `;
    run[ref] = row.id;
  }

  // ── feed outbox (inbox buckets + activity rail + sparklines + week bars) ──
  // [kind, actor, summary, preview, proj, tref, runRef, payload, read, at]
  const feedSeed = [
    // today
    ["needs-input", "Engine", "R-15 — Dark header flashes on load", null, "acme-website", "T-310", "R-15",
      { from: "running", to: "needs-input", question: q15 }, false, minutesAgo(4)],
    ["dispatched", "you", "R-14 — Helper — enrich T-302 with a screenshot inventory", null, "acme-website", null, "R-14",
      { from: null, to: "queued" }, true, minutesAgo(5)],
    ["needs-input", "Engine", "R-13 — Add export to CSV", null, "acme-website", "T-247", "R-13",
      { from: "running", to: "needs-input", question: q13 }, false, minutesAgo(12)],
    ["started", "Engine", "R-12 — Parallel-safe Ship Group dispatch", null, "atlas-internal", "T-308", "R-12",
      { from: "queued", to: "running" }, true, minutesAgo(18)],
    ["dispatched", "you", "R-12 — Parallel-safe Ship Group dispatch", null, "atlas-internal", "T-308", "R-12",
      { from: null, to: "queued" }, true, minutesAgo(25)],
    ["failed", "Engine", "R-7 — Mermaid renders blank on iOS", null, "atlas-internal", "T-149", "R-7",
      { from: "running", to: "failed" }, false, minutesAgo(40)],
    ["shipped", "Engine", "T-249 — Add JSON export endpoint",
      "Try downloading the ticket list — there's now a JSON option.", "acme-website", "T-249", "R-8",
      { from: "review-ready", to: "shipped" }, false, hoursAgo(1)],
    ["review-ready", "Engine", "R-9 — Onboarding copy refresh", null, "acme-website", "T-301", "R-9",
      { from: "running", to: "review-ready" }, true, hoursAgo(2)],
    ["replied", "carmen", "T-302 — Onboarding screenshots are stale",
      "Could you share a screenshot of the new flow? The old ones are three versions stale.",
      "acme-website", "T-302", null, null, false, hoursAgo(3)],
    // yesterday
    ["filed", "ada", "T-310 — Dark header flashes on load", null, "acme-website", "T-310", null, null, true, daysAgo(1, 11)],
    ["shipped", "Engine", "T-201 — Refactor checkout flow", null, "acme-website", "T-201", null, null, true, daysAgo(1, 17)],
    ["moved", "you", "T-280 — Empty-state illustrations to the backlog", null, "atlas-internal", "T-280", null, null, true, daysAgo(1, 9)],
    // earlier this week / a few days back
    ["filed", "carmen", "T-302 — Onboarding screenshots are stale", null, "acme-website", "T-302", null, null, true, daysAgo(3, 10)],
    ["filed", "you", "T-311 — Weekly digest copy tweaks", null, "side-experiment", "T-311", null, null, true, daysAgo(2, 16)],
    ["failed", "Engine", "T-149 — Mermaid renders blank on iOS", null, "atlas-internal", "T-149", null, null, true, daysAgo(3, 15)],
    // last week
    ["shipped", "Engine", "T-204 — your typo fix is live",
      "Checkout now reads 'proceed' instead of 'preocceed'.", "acme-website", null, null, null, true, daysAgo(8, 13)],
    ["joined", "ada", "the circle as the 1st Collaborator", null, null, null, null, null, true, daysAgo(9, 12)],
    ["filed", "you", "T-280 — Empty-state illustrations", null, "atlas-internal", null, null, null, true, daysAgo(8, 9)],
  ];
  for (const [kind, actor, summary, preview, proj, tref, runRef, payload, read, at] of feedSeed) {
    await sql`
      insert into feed_events (kind, actor, summary, preview, project_id, ticket_id, run_id, ticket_ref, payload, read_at, seeded, created_at)
      values (${kind}, ${actor}, ${summary}, ${preview}, ${proj ? project[proj] : null},
              ${tref ? ticket[tref] : null}, ${runRef ? run[runRef] : null}, ${tref},
              ${payload ? JSON.stringify(payload) : null}::jsonb,
              ${read ? at : null}, true, ${at})
    `;
  }

  const [{ count: events }] = await sql`select count(*)::int as count from feed_events where seeded`;
  console.log(
    `seeded: ${projectRows.length} projects · ${ticketSeed.length} tickets · ${runSeed.length} runs · ${events} feed events (all marked seeded=true)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
