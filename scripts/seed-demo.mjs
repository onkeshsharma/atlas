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
  // M8 work — edges reference tickets, so they go first
  await sql`delete from ticket_links where seeded`;
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

  // ════════════════════════════════════════════════════════════════════
  // M8 work — board/triage/detail demo depth (ADDITIVE section; the wipe
  // at the top already covers these rows via seeded=true).
  //   - long-form bodies + kinds + enrichment on existing tickets (the
  //     enrichment likelyFiles feed the Hints engine's file-set input,
  //     so the Review column's Parallel-safe cluster derives for real);
  //   - three new tickets so every board Category has rows (approved /
  //     needs-info / declined);
  //   - one declared blocks edge (T-279 blocks T-280 → blocked-by hint);
  //   - their feed_events (filed/moved/linked) keep the outbox truthful.
  // ════════════════════════════════════════════════════════════════════

  const m8Tickets = [
    // [ref, project, title, state, kind, reporter, createdAt, updatedAt]
    ["T-279", "atlas-internal", "Bridge preflight v2 — token rotation", "approved", "enhancement", "you", daysAgo(14, 10), daysAgo(2, 12)],
    ["T-312", "acme-website", "Checkout copy reads stiff in German", "needs-info", "other", "carmen@acme.io", daysAgo(1, 13), hoursAgo(5)],
    ["T-265", "side-experiment", "Retire the legacy logo assets", "declined", "enhancement", "ada@acme.io", daysAgo(12, 11), daysAgo(5, 15)],
  ];
  for (const [ref, proj, title, state, kind, reporter, createdAt, updatedAt] of m8Tickets) {
    const [row] = await sql`
      insert into tickets (ref, project_id, title, state, kind, reporter, seeded, created_at, updated_at)
      values (${ref}, ${project[proj]}, ${title}, ${state}, ${kind}, ${reporter}, true, ${createdAt}, ${updatedAt})
      returning id
    `;
    ticket[ref] = row.id;
  }

  // long-form bodies (F:168–174 renders these as editorial prose) + kinds
  const m8Bodies = {
    "T-247": ["enhancement", `Owner needs to export the full ticket list from acme-website as a CSV for sharing with non-Atlas stakeholders during the upcoming launch review.\n\nThe export should include: ticket ID, title, current state, reporter, age, and the linked PR URL if shipped.\n\nEdge case: archived tickets (closed for more than 90 days) should be excluded by default but available via a checkbox.`],
    "T-301": ["enhancement", `The onboarding flow's copy still reads like v1 — three screens mention "jobs" and the welcome note references a setup step that no longer exists.\n\nRewrite the five onboarding screens in the current voice. Keep each screen under 40 words.`],
    "T-302": ["bug", `The screenshots on the onboarding page show the old dashboard — three versions stale. Anyone joining today sees a UI that no longer exists.\n\nCould we re-capture them against the current build? The hero screenshot matters most.`],
    "T-310": ["bug", `When I load any page in dark-preferring browsers, the header flashes dark for a frame before settling light.\n\nLooks like the theme bootstrap runs after first paint. It's subtle but every page load shows it.`],
    "T-280": ["enhancement", `Several surfaces still render bare "nothing here" text where the editorial empty states should be.\n\nSweep the app for empty collections and apply the one-sentence empty-state recipe everywhere.`],
    "T-308": ["enhancement", `Dispatching a Ship Group currently runs its tickets one at a time. The whole point of the group is that the file sets are disjoint — dispatch them in parallel.`],
    "T-149": ["bug", `Mermaid diagrams render blank on iOS Safari — the SVG comes back with zero height inside the docs page.\n\nReproduces on iPhone 14/iOS 18; fine on desktop Safari.`],
    "T-279": ["enhancement", `Bridge preflight should verify the token can actually rotate before reporting healthy — today it only checks presence.\n\nAdd a dry-run rotation to the preflight checklist and surface the result.`],
    "T-312": ["other", `The German checkout flow copy was flagged by a native speaker as overly formal ("Sie" forms mixed with marketing tone).\n\nNeed a pass over the five checkout strings.`],
    "T-265": ["enhancement", `The legacy logo assets still live in /public — about 2 MB of unused SVGs.\n\nDeclined: the marketing site still hotlinks two of them; revisit after the relaunch.`],
    "T-311": ["enhancement", `The weekly digest email reads robotic. Tighten the subject line and the intro sentence; keep the stats table.`],
  };
  for (const [ref, [kind, body]] of Object.entries(m8Bodies)) {
    await sql`update tickets set kind = ${kind}, body = ${body} where id = ${ticket[ref]}`;
  }

  // enrichment (PRD #17 — Helper-Run output; M9 writes this for real).
  // likelyFiles are the Hints engine's file-set knowledge: T-247 ⊥ T-301
  // (disjoint → the Review column's "Parallel-safe · 2" cluster), and
  // T-308 ⊥ T-279 (parallel-safe-with hints on the Active cards).
  // T-310 stays NULL → triage + detail render the honest pending state.
  const m8Enrichment = [
    ["T-247", { kind: "enhancement", severity: "low", confidence: "high", similarTo: "T-249", likelyFiles: ["app/(app)/tickets/page.tsx", "src/lib/ticket-export.ts"], question: "Should export include archived (>90d closed) tickets?", enrichedAt: hoursAgo(20).toISOString() }],
    ["T-301", { kind: "enhancement", severity: "low", confidence: "medium", likelyFiles: ["app/onboarding/page.tsx", "src/copy/onboarding.ts"], enrichedAt: daysAgo(1, 16).toISOString() }],
    ["T-302", { kind: "bug", severity: "low", confidence: "high", similarTo: "T-301", likelyFiles: ["app/onboarding/page.tsx", "public/onboarding/hero.png"], question: "Re-capture at 1440 or match the original 1280 frames?", enrichedAt: hoursAgo(2).toISOString() }],
    ["T-308", { kind: "enhancement", severity: "medium", confidence: "medium", likelyFiles: ["bridge/scheduler.ts", "bridge/worktrees.ts"], enrichedAt: daysAgo(1, 9).toISOString() }],
    ["T-279", { kind: "enhancement", severity: "medium", confidence: "high", likelyFiles: ["bridge/preflight.ts"], question: "Rotate against the live token store or a sandbox?", enrichedAt: daysAgo(2, 9).toISOString() }],
    ["T-280", { kind: "enhancement", severity: "low", confidence: "medium", likelyFiles: ["src/components/kit/EmptyState.tsx"], enrichedAt: daysAgo(1, 8).toISOString() }],
  ];
  for (const [ref, payload] of m8Enrichment) {
    await sql`update tickets set enrichment = ${JSON.stringify(payload)}::jsonb where id = ${ticket[ref]}`;
  }

  // declared dependency edge (PRD #16): T-279 blocks T-280 → the board's
  // 🔴 "blocked by #279" hint on the Backlog card (G:36's shape, real).
  await sql`
    insert into ticket_links (blocker_id, blocked_id, seeded, created_at)
    values (${ticket["T-279"]}, ${ticket["T-280"]}, true, ${daysAgo(2, 11)})
  `;

  // the new rows' outbox events (filed / moved / linked)
  const m8Feed = [
    ["filed", "you", "T-279 — Bridge preflight v2 — token rotation", null, "atlas-internal", "T-279", null, true, daysAgo(14, 10)],
    ["moved", "you", "T-279 — Bridge preflight v2 — token rotation", null, "atlas-internal", "T-279", { from: "triage", to: "approved" }, true, daysAgo(2, 12)],
    ["linked", "you", "T-279 — blocks T-280", null, "atlas-internal", "T-279", { direction: "blocks", otherRef: "T-280" }, true, daysAgo(2, 11)],
    ["filed", "carmen", "T-312 — Checkout copy reads stiff in German", null, "acme-website", "T-312", null, true, daysAgo(1, 13)],
    ["moved", "you", "T-312 — Checkout copy reads stiff in German", "Which five strings exactly? Could you list the screens?", "acme-website", "T-312", { from: "triage", to: "needs-info", note: "Which five strings exactly? Could you list the screens?" }, true, hoursAgo(5)],
    ["filed", "ada", "T-265 — Retire the legacy logo assets", null, "side-experiment", "T-265", null, true, daysAgo(12, 11)],
    ["moved", "you", "T-265 — Retire the legacy logo assets", "Marketing still hotlinks two of these — revisit after the relaunch.", "side-experiment", "T-265", { from: "triage", to: "declined", note: "Marketing still hotlinks two of these — revisit after the relaunch." }, true, daysAgo(5, 15)],
  ];
  for (const [kind, actor, summary, preview, proj, tref, payload, read, at] of m8Feed) {
    await sql`
      insert into feed_events (kind, actor, summary, preview, project_id, ticket_id, ticket_ref, payload, read_at, seeded, created_at)
      values (${kind}, ${actor}, ${summary}, ${preview}, ${project[proj]}, ${ticket[tref]}, ${tref},
              ${payload ? JSON.stringify(payload) : null}::jsonb, ${read ? at : null}, true, ${at})
    `;
  }
  // ════════════════════════════════════════ end M8 work ════════════════

  const [{ count: events }] = await sql`select count(*)::int as count from feed_events where seeded`;
  const [{ count: allTickets }] = await sql`select count(*)::int as count from tickets where seeded`;
  console.log(
    `seeded: ${projectRows.length} projects · ${allTickets} tickets · ${runSeed.length} runs · ${events} feed events (all marked seeded=true)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
