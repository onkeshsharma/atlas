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
  // ── wipe previous seed (FK order; M7 added context_terms + ticket_pins,
  //    M8 added ticket_links) ──
  // M7: honest rows BORN ON seeded parents (e.g. a real context-edited
  // feed event on the demo project) must go with their parent, or the
  // seeded-project delete below trips the FK. Wiping a demo project
  // legitimately takes its history with it.
  // M13 — outbox notifications reference feed events / tickets / projects;
  // rows born on seeded parents go with the parent (the M7 cascade idiom).
  await sql`delete from notification_outbox where
    feed_event_id in (select id from feed_events where seeded or project_id in (select id from projects where seeded))
    or ticket_id in (select id from tickets where seeded or project_id in (select id from projects where seeded))
    or project_id in (select id from projects where seeded)`;
  await sql`delete from feed_events where seeded or project_id in (select id from projects where seeded)`;
  await sql`delete from ticket_pins where seeded or ticket_id in (select id from tickets where seeded)`;
  // M8 work — edges reference tickets, so they go before tickets (same
  // cascade idiom: real edges on seeded tickets go with their parent).
  await sql`delete from ticket_links where seeded or blocker_id in (select id from tickets where seeded) or blocked_id in (select id from tickets where seeded)`;
  await sql`delete from context_terms where seeded or project_id in (select id from projects where seeded)`;
  // M9 — stdout chunks + briefs reference runs/tickets; honest rows born
  // on seeded parents (a daemon exercising demo runs) go with the parent.
  await sql`delete from run_stdout_chunks where run_id in (select id from runs where seeded or project_id in (select id from projects where seeded))`;
  await sql`update runs set brief_id = null where seeded or project_id in (select id from projects where seeded)`;
  await sql`delete from briefs where seeded or ticket_id in (select id from tickets where seeded)`;
  await sql`delete from runs where seeded or project_id in (select id from projects where seeded)`;
  await sql`delete from tickets where seeded or project_id in (select id from projects where seeded)`;
  // M11 — roster grants + project-scoped invites reference projects.
  // Grants on seeded parents go with the parent (the M7 cascade idiom);
  // invites are instance-level grants (M5 deviation 3), so a real invite
  // outlives a wiped demo project — only its scope is cleared.
  await sql`delete from project_members where project_id in (select id from projects where seeded)`;
  await sql`update invites set project_id = null where project_id in (select id from projects where seeded)`;
  await sql`delete from projects where seeded`;

  // ── projects (E: acme-website pinned; two quiet others) ──
  // M7 in-place edit: slug is now NOT NULL (route key), and the three
  // demo projects carry the honest ingest states — ready / queued / none
  // — so every J render state is provable. Everything else M7 seeds
  // lives in the "M7 projects" section below.
  const projectRows = await sql`
    insert into projects (name, slug, description, repo_url, local_path, ingest_status, ingested_at, pinned, seeded, created_at) values
      ('acme-website',    'acme-website',    ${"Online ordering for ACME's storefront."}, 'https://github.com/acme/website', null, 'ready',  ${hoursAgo(2)}, true,  true, ${daysAgo(40)}),
      ('atlas-internal',  'atlas-internal',  'Internal tooling for the Atlas team.',      'https://github.com/acme/atlas-internal', null, 'queued', null, false, true, ${daysAgo(33)}),
      ('side-experiment', 'side-experiment', null,                                        null, ${"C:\\dev\\side-experiment"}, 'none', null, false, true, ${daysAgo(21)})
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

  // ────────────────────────────────────────────────────────────────────
  // M7 projects — Ingest Summary (J render proof), context terms (P),
  // ticket pins (O). All additive; all marked seeded=true.
  // ────────────────────────────────────────────────────────────────────

  // ── acme-website's Engine-written Ingest Summary (J's sections; shape
  //    in src/domain/project/ingest-summary.ts — schemaVersion 1) ──
  const ingestSummary = {
    schemaVersion: 1,
    tagline: "Online ordering for ACME's storefront.",
    engineRead: [
      "acme-website is a well-organised modern Next stack. The Storefront tier is conventional and unsurprising; the Cart layer is the most active codebase with optimistic UI patterns; Fulfillment is the riskiest area because Stripe webhooks, DB orders, and Resend emails compose into a critical path the test suite doesn't fully cover.",
      "Suggested priorities: extract the long page.tsx into its three obvious components, then backfill payment-actions.ts tests. After that, the codebase is in good shape for the next stretch of work.",
    ],
    stack: ["Next.js 15", "TypeScript 5.7", "Tailwind v4", "Prisma", "PostgreSQL", "Stripe", "Resend"],
    stackProse:
      "Server-rendered with Next.js 15 and Tailwind v4 for the UI layer. Persistence via Prisma over PostgreSQL. Stripe handles checkout; Resend handles transactional email. A standard modern Next stack — no surprises.",
    architectureProse: "Three subsystems flow end-to-end — Storefront → Cart → Fulfillment.",
    architecture: [
      { name: "Storefront", sub: "Next.js · page tier · marketing", detail: "Server-rendered marketing + product pages. Caching via Vercel." },
      { name: "Cart", sub: "Server actions · session-backed", detail: "Per-session cart state with optimistic UI. Server-action mutations." },
      { name: "Fulfillment", sub: "Stripe · DB · email", detail: "Stripe webhooks → DB orders → Resend email confirmations." },
    ],
    smells: [
      { severity: "high", title: "page.tsx is 1,247 lines long", file: "app/(shop)/[handle]/page.tsx", detail: "Mixed concerns: layout, data fetching, and 3 inline components. Suggest extracting." },
      { severity: "medium", title: "Missing test coverage on payment flows", file: "src/lib/payment-actions.ts", detail: "Critical path; only happy-path covered. Add failure-case tests." },
    ],
    health: [
      { label: "Tests", value: "142 passing, 0 failing", ok: true },
      { label: "Lint", value: "clean", ok: true },
      { label: "Typecheck", value: "clean", ok: true },
      { label: "Dep audit", value: "0 high · 0 critical", ok: true },
      { label: "Build", value: "passing", ok: true },
    ],
    churnWeeks: [3, 7, 4, 6, 2, 5, 8, 4, 6, 5, 9, 11],
    coverage: [
      { area: "Backend", pct: 82 },
      { area: "Frontend", pct: 64 },
      { area: "Utilities", pct: 91 },
      { area: "Overall", pct: 73, hero: true },
    ],
    stats: { coveragePct: 73, prevCoveragePct: 68, linesOfCode: "~18,300", files: 412 },
    commits: [
      { sha: "ab05f49", subject: "fix(ui): disable system-following dark mode pending toggle", at: hoursAgo(2).toISOString() },
      { sha: "658bfb8", subject: "fix(build): extract pure helpers to unblock client bundle", at: hoursAgo(5).toISOString() },
      { sha: "8445322", subject: "merge: T68 — System-following dark mode (FINAL)", at: daysAgo(1, 16).toISOString() },
      { sha: "7c1c32e", subject: "feat(ui): system-following dark mode across every surface (T68)", at: daysAgo(1, 11).toISOString() },
      { sha: "1659f00", subject: "merge: T65 — Ingest Summary cards + Mermaid diagrams", at: daysAgo(2, 15).toISOString() },
    ],
    commitsTotal: 247,
    repo: { branch: "main", commitsSinceIngest: 247 },
  };
  await sql`
    update projects set ingest_summary = ${JSON.stringify(ingestSummary)}::jsonb
    where id = ${project["acme-website"]}
  `;

  // ── context terms (P:106–255 — confirmed Language + Engine-noticed) ──
  const termSeed = [
    // [term, meaning, status, provenance, avoid, uses, createdAt]
    ["Storefront", "The marketing + product-listing pages. Server-rendered with Next.js 15 + Tailwind v4. Caching via Vercel.", "confirmed", "owner", false, null, daysAgo(12)],
    ["Cart", "Session-backed shopping cart state. Optimistic UI patterns; server-action mutations.", "confirmed", "owner", false, null, daysAgo(12)],
    ["Fulfillment", "Stripe Checkout → DB order persistence → Resend email confirmations. The riskiest area; least test coverage.", "confirmed", "owner", false, null, daysAgo(12)],
    ["Catalog", "Product, variant, and inventory tables. Source of truth for what's for sale.", "confirmed", "owner", false, null, daysAgo(9)],
    ["User", "Ambiguous — we have Customers and Admins. Use the specific term.", "confirmed", "owner", true, null, daysAgo(3)],
    ["Webhook", "", "suggested", "engine", false, 23, hoursAgo(4)],
    ["Invoice", "", "suggested", "engine", false, 41, hoursAgo(4)],
    ["Refund", "", "suggested", "engine", false, 18, hoursAgo(4)],
  ];
  for (const [term, meaning, status, provenance, avoid, uses, at] of termSeed) {
    await sql`
      insert into context_terms (project_id, term, meaning, status, provenance, avoid, uses, seeded, created_at, updated_at)
      values (${project["acme-website"]}, ${term}, ${meaning}, ${status}, ${provenance}, ${avoid}, ${uses}, true, ${at}, ${at})
    `;
  }

  // ── ticket pins (O:193–229 — the landing's "Pinned" focused work) ──
  for (const [tref, at] of [
    ["T-247", hoursAgo(12)],
    ["T-310", hoursAgo(3)],
    ["T-308", hoursAgo(3)],
  ]) {
    await sql`
      insert into ticket_pins (ticket_id, seeded, created_at)
      values (${ticket[tref]}, true, ${at})
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

  // ════════════════════════════════════════════════════════════════════
  // M16 insights — backdated ship history (ADDITIVE section; the wipe at
  // the top already covers these rows via seeded=true).
  //
  // The base seed's record is thin for /insights: 3 `shipped` feed rows
  // and ZERO filed→shipped pairs, so throughput charts ~2 bars and the
  // percentile section can only name its gap. This section seeds an
  // HONEST 11-week history — every shipped Ticket carries its own owner
  // Run, its `filed` row at filing time and its `shipped` row at landing
  // time, deltas spread 25 min → 9 days so P10/P50/P90/P99 separate.
  // Everything is ≥ 14 days old ON PURPOSE: Today's week stats, the
  // inbox unread count and the M13 digest period keys never see these
  // rows (all read=true, all pre-last-week). Charter M16 item 3.
  // ════════════════════════════════════════════════════════════════════

  const m16At = (daysBack, hour = 13, min = 0) => {
    const t = new Date(now);
    t.setDate(t.getDate() - daysBack);
    t.setHours(hour, min, 0, 0);
    return t;
  };
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  // base-seed lane fix (in-place edit, the M7 idiom): R-14 is titled
  // "Helper — …" but predates M9's lane column and landed owner-lane.
  await sql`update runs set lane = 'helper', helper_kind = 'enrich-ticket'
    where seeded and title like 'Helper — %' and lane = 'owner'`;

  // [ref, project, title, kind, reporter, filedDaysBack, deltaMs]
  const m16Shipped = [
    // pre-window history (85–150 days back): the PREVIOUS 12-week window
    // needs ships or velocity can only ever read "new"; `all` gets depth.
    ["T-190", "acme-website",    "Bootstrap the ordering flow",          "enhancement", "you",           150, 4 * HOUR],
    ["T-191", "acme-website",    "Catalog import CLI",                   "enhancement", "ada@acme.io",   142, 26 * HOUR],
    ["T-192", "atlas-internal",  "Bridge heartbeat v0",                  "enhancement", "you",           135, 3 * DAY],
    ["T-193", "acme-website",    "Checkout smoke tests",                 "enhancement", "you",           126, 7 * HOUR],
    ["T-194", "side-experiment", "Digest prototype",                     "enhancement", "you",           117, 2.5 * HOUR],
    ["T-195", "acme-website",    "Payment retries",                      "bug",         "ada@acme.io",   108, 12 * HOUR],
    ["T-196", "atlas-internal",  "Run queue v0",                         "enhancement", "you",            99, 36 * HOUR],
    ["T-197", "acme-website",    "Order confirmation emails",            "enhancement", "carmen@acme.io", 88, 5 * HOUR],
    // in-window history (15–80 days back)
    ["T-205", "acme-website",    "Fix favicon cache headers",            "bug",         "ada@acme.io",    80, 25 * MIN],
    ["T-206", "acme-website",    "Tighten 404 page copy",                "enhancement", "you",            78, 3.2 * HOUR],
    ["T-207", "atlas-internal",  "Heartbeat jitter smoothing",           "bug",         "you",            76, 26 * HOUR],
    ["T-208", "acme-website",    "Product grid spacing drift",           "bug",         "carmen@acme.io", 71, 5 * HOUR],
    ["T-209", "acme-website",    "Cart icon badge overflow",             "bug",         "ada@acme.io",    69, 90 * MIN],
    ["T-210", "side-experiment", "Digest footer link 404s",              "bug",         "you",            66, 8 * HOUR],
    ["T-211", "acme-website",    "Checkout coupon stacking edge case",   "bug",         "ada@acme.io",    62, 2.2 * DAY],
    ["T-212", "atlas-internal",  "Worktree prune on failed claim",       "enhancement", "you",            60, 9 * HOUR],
    ["T-213", "acme-website",    "Hero image LCP regression",            "bug",         "carmen@acme.io", 55, 4.5 * HOUR],
    ["T-214", "acme-website",    "Stripe webhook retry logging",         "enhancement", "you",            52, 30 * HOUR],
    ["T-215", "atlas-internal",  "Run queue starvation probe",           "enhancement", "you",            47, 6.5 * HOUR],
    ["T-216", "acme-website",    "Order email copy pass",                "enhancement", "carmen@acme.io", 44, 3 * HOUR],
    ["T-217", "side-experiment", "Logo asset sweep prep",                "enhancement", "ada@acme.io",    41, 5.8 * DAY],
    ["T-218", "acme-website",    "Search results dedupe",                "bug",         "ada@acme.io",    38, 7 * HOUR],
    ["T-219", "acme-website",    "Refund flow null guard",               "bug",         "you",            35, 55 * MIN],
    ["T-220", "atlas-internal",  "Doctor verdict copy",                  "enhancement", "you",            31, 12 * HOUR],
    ["T-221", "acme-website",    "Sitemap stale URLs",                   "bug",         "carmen@acme.io", 28, 4 * HOUR],
    ["T-222", "acme-website",    "A11y pass on checkout",                "enhancement", "ada@acme.io",    25, 2.6 * HOUR],
    ["T-223", "atlas-internal",  "Bridge log rotation",                  "enhancement", "you",            21, 9 * DAY],
    ["T-224", "acme-website",    "Mobile nav flicker",                   "bug",         "ada@acme.io",    17, 6 * HOUR],
    ["T-225", "side-experiment", "Color token cleanup",                  "enhancement", "you",            15, 1.9 * HOUR],
  ];

  let m16RunSeq = 100; // R-100… — far above the seed band, below run_ref_seq draws
  for (const [ref, proj, title, kind, reporter, filedDaysBack, deltaMs] of m16Shipped) {
    const filedAt = m16At(filedDaysBack, 10, 17);
    const shippedAt = new Date(filedAt.getTime() + deltaMs);
    const dispatchedAt = new Date(filedAt.getTime() + Math.min(deltaMs / 3, 2 * HOUR));

    const [trow] = await sql`
      insert into tickets (ref, project_id, title, state, kind, reporter, seeded, created_at, updated_at)
      values (${ref}, ${project[proj]}, ${title}, 'shipped', ${kind}, ${reporter}, true, ${filedAt}, ${shippedAt})
      returning id
    `;
    ticket[ref] = trow.id;

    const runRef = `R-${m16RunSeq++}`;
    const [rrow] = await sql`
      insert into runs (ref, project_id, ticket_id, title, state, lane, seeded, created_at, updated_at)
      values (${runRef}, ${project[proj]}, ${trow.id}, ${title}, 'shipped', 'owner', true, ${dispatchedAt}, ${shippedAt})
      returning id
    `;
    run[runRef] = rrow.id;

    await sql`
      insert into feed_events (kind, actor, summary, project_id, ticket_id, ticket_ref, read_at, seeded, created_at)
      values ('filed', ${reporter === "you" ? "you" : reporter.split("@")[0]},
              ${`${ref} — ${title}`}, ${project[proj]}, ${trow.id}, ${ref}, ${filedAt}, true, ${filedAt})
    `;
    await sql`
      insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, payload, read_at, seeded, created_at)
      values ('shipped', 'Engine', ${`${ref} — ${title}`}, ${project[proj]}, ${trow.id}, ${rrow.id}, ${ref},
              ${JSON.stringify({ from: "review-ready", to: "shipped" })}::jsonb, ${shippedAt}, true, ${shippedAt})
    `;
  }

  // failed first attempts (the retry-then-land story): a failed owner Run
  // + its `failed` feed row on Tickets that later shipped above — the
  // throughput chart's rose stack and the failure-rate metric are real.
  // [ticketRef, failedDaysBack, failureKind]
  const m16Failed = [
    ["T-211", 61, "engine-timeout"],
    ["T-214", 51, "engine-crash"],
    ["T-223", 19, "conflict"],
  ];
  for (const [tref, failedDaysBack, failureKind] of m16Failed) {
    const failedAt = m16At(failedDaysBack, 16, 40);
    const startedAt = new Date(failedAt.getTime() - 2 * HOUR);
    const trow = m16Shipped.find((s) => s[0] === tref);
    const title = trow[2];
    const runRef = `R-${m16RunSeq++}`;
    const [rrow] = await sql`
      insert into runs (ref, project_id, ticket_id, title, state, lane, failure_kind, seeded, created_at, updated_at)
      values (${runRef}, ${project[trow[1]]}, ${ticket[tref]}, ${title}, 'failed', 'owner', ${failureKind}, true, ${startedAt}, ${failedAt})
      returning id
    `;
    run[runRef] = rrow.id;
    await sql`
      insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, payload, read_at, seeded, created_at)
      values ('failed', 'Engine', ${`${runRef} — ${title}`}, ${project[trow[1]]}, ${ticket[tref]}, ${rrow.id}, ${tref},
              ${JSON.stringify({ from: "running", to: "failed" })}::jsonb, ${failedAt}, true, ${failedAt})
    `;
  }

  // one cancelled owner Run (T-217's first attempt, pulled back before
  // the re-dispatch that landed) — the outcomes mix shows all three kinds.
  {
    const cancelledAt = m16At(40, 11, 5);
    const cancelledRef = `R-${m16RunSeq++}`;
    const [rrow] = await sql`
      insert into runs (ref, project_id, ticket_id, title, state, lane, seeded, created_at, updated_at)
      values (${cancelledRef}, ${project["side-experiment"]}, ${ticket["T-217"]}, 'Logo asset sweep prep', 'cancelled', 'owner', true, ${new Date(cancelledAt.getTime() - HOUR)}, ${cancelledAt})
      returning id
    `;
    await sql`
      insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, payload, read_at, seeded, created_at)
      values ('cancelled', 'you', ${`${cancelledRef} — Logo asset sweep prep`}, ${project["side-experiment"]}, ${ticket["T-217"]}, ${rrow.id}, 'T-217',
              ${JSON.stringify({ from: "running", to: "cancelled" })}::jsonb, ${cancelledAt}, true, ${cancelledAt})
    `;
  }

  // helper-lane history (the helper-vs-owner load metric): two completed
  // enrichment helpers + one cancelled one. Their deliverable rows are
  // `enriched` — NEVER `shipped`; insights' owner-lane scoping is the
  // honesty rule and these rows are its demo.
  const m16Helpers = [
    // [daysBack, ticketRef|null, state, helperKind]
    [30, "T-221", "shipped", "enrich-ticket"],
    [24, "T-222", "shipped", "enrich-ticket"],
    [20, null, "cancelled", "draft-brief"],
  ];
  for (const [daysBack, tref, state, helperKind] of m16Helpers) {
    const doneAt = m16At(daysBack, 9, 30);
    const title = tref
      ? `Helper — enrich ${tref}`
      : "Helper — draft a Brief for a withdrawn Ticket";
    const runRef = `R-${m16RunSeq++}`;
    const [rrow] = await sql`
      insert into runs (ref, project_id, ticket_id, title, state, lane, helper_kind, seeded, created_at, updated_at)
      values (${runRef}, ${project["acme-website"]}, ${tref ? ticket[tref] : null}, ${title}, ${state}, 'helper', ${helperKind}, true, ${new Date(doneAt.getTime() - 20 * MIN)}, ${doneAt})
      returning id
    `;
    if (state === "shipped" && tref) {
      await sql`
        insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, read_at, seeded, created_at)
        values ('enriched', 'Engine', ${`${tref} — Helper enrichment landed`}, ${project["acme-website"]}, ${ticket[tref]}, ${rrow.id}, ${tref}, ${doneAt}, true, ${doneAt})
      `;
    }
  }
  // ════════════════════════════════════════ end M16 insights ═══════════

  // integration summary — M7 (terms/pins) + M8 (DB-counted tickets) lines merged
  const [{ count: events }] = await sql`select count(*)::int as count from feed_events where seeded`;
  const [{ count: terms }] = await sql`select count(*)::int as count from context_terms where seeded`;
  const [{ count: pins }] = await sql`select count(*)::int as count from ticket_pins where seeded`;
  const [{ count: allTickets }] = await sql`select count(*)::int as count from tickets where seeded`;
  // M16 — runs are DB-counted too (the M8 tickets idiom; the insights
  // section seeds runs outside runSeed).
  const [{ count: allRuns }] = await sql`select count(*)::int as count from runs where seeded`;
  console.log(
    `seeded: ${projectRows.length} projects · ${allTickets} tickets · ${allRuns} runs · ${events} feed events · ${terms} context terms · ${pins} ticket pins (all marked seeded=true)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
