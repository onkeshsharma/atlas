// M9 Session B — convergence captures (master plan §5.5–5.6): the five
// surfaces at 1920/1440/1280, beside their /dev-variants renders, into
// notes/m9-captures/. Static fixture rows (no daemon — the pages render
// pure DB state), self-cleaning, reseeds nothing it didn't touch.
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { inArray, like } from "drizzle-orm";

import { db } from "../src/db/client";
import {
  briefs,
  feedEvents,
  memberships,
  projects,
  runs,
  runStdoutChunks,
  tickets,
  userPreferences,
} from "../src/db/schema";

const CAPTURE_DIR = join(__dirname, "..", "..", "notes", "m9-captures");
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m9cap-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;

const VIEWPORTS = [
  { w: 1920, h: 1080 },
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
];

async function captureAcrossViewports(page: Page, slug: string) {
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; }",
  });
  for (const { w, h } of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    await page.screenshot({ path: join(CAPTURE_DIR, `${slug}-${w}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

let projectId: string;
const REFS = {
  live: `R-CAP-RR-${RUN}`,
  failed: `R-CAP-K-${RUN}`,
  shipped: `R-CAP-V-${RUN}`,
  review: `R-CAP-KK-${RUN}`,
};

const DIFF_STATS = {
  filesChanged: 2,
  insertions: 53,
  deletions: 2,
  files: [
    { path: "src/lib/ticket-export.ts", insertions: 47, deletions: 0 },
    { path: "app/tickets/page.tsx", insertions: 6, deletions: 2 },
  ],
};

const DIFF_PATCH = [
  "diff --git a/src/lib/ticket-export.ts b/src/lib/ticket-export.ts",
  "new file mode 100644",
  "--- /dev/null",
  "+++ b/src/lib/ticket-export.ts",
  "@@ -0,0 +1,4 @@",
  '+import { Ticket } from "./types";',
  "+",
  "+export function ticketsToJson(tickets: Ticket[]) {",
  "+}",
  "diff --git a/app/tickets/page.tsx b/app/tickets/page.tsx",
  "index 1111111..2222222 100644",
  "--- a/app/tickets/page.tsx",
  "+++ b/app/tickets/page.tsx",
  "@@ -42,4 +42,5 @@",
  ' <div className="toolbar">',
  "-  <button>Export CSV</button>",
  "+  <ExportMenu",
  "+  />",
  " </div>",
].join("\n");

const BRIEF_BODY = [
  "## Goal",
  "",
  "Add a CSV export affordance to the ticket-list page so the visible",
  "Tickets can be downloaded for sharing.",
  "",
  "## Behaviour",
  "",
  "- Click `Export` and pick CSV",
  "- The export respects the active filter",
  "",
  "## Out of scope",
  "",
  "- XLSX / Excel formats",
].join("\n");

async function cleanup() {
  const capProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(like(projects.name, "E2E m9cap %"));
  const ids = capProjects.map((p) => p.id);
  if (ids.length) {
    const capRuns = await db.select({ id: runs.id }).from(runs).where(inArray(runs.projectId, ids));
    const runIds = capRuns.map((r) => r.id);
    if (runIds.length) {
      await db.delete(runStdoutChunks).where(inArray(runStdoutChunks.runId, runIds));
    }
    await db.delete(feedEvents).where(inArray(feedEvents.projectId, ids));
    if (runIds.length) await db.delete(runs).where(inArray(runs.id, runIds));
    const capTickets = await db
      .select({ id: tickets.id })
      .from(tickets)
      .where(inArray(tickets.projectId, ids));
    const ticketIds = capTickets.map((t) => t.id);
    if (ticketIds.length) await db.delete(briefs).where(inArray(briefs.ticketId, ticketIds));
    if (ticketIds.length) await db.delete(tickets).where(inArray(tickets.id, ticketIds));
    await db.delete(projects).where(inArray(projects.id, ids));
  }
  const capMembers = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M9CAP %"));
  if (capMembers.length) {
    await db
      .delete(userPreferences)
      .where(inArray(userPreferences.userId, capMembers.map((m) => m.userId)));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E M9CAP %"));
}

async function seedTicket(title: string, state: string) {
  const [t] = await db
    .insert(tickets)
    .values({
      ref: `CAP-${randomBytes(3).toString("hex")}`,
      projectId,
      title,
      body: "The ticket list needs a CSV export for sharing outside Atlas.",
      state: state as never,
      reporter: "ada",
    })
    .returning({ id: tickets.id, ref: tickets.ref });
  return t;
}

async function seedRun(input: {
  ref: string;
  ticketId: string;
  title: string;
  state: string;
  extras?: Record<string, unknown>;
  stdout?: string[];
  feed?: Array<{ kind: string; minutesAgo: number }>;
}) {
  const [r] = await db
    .insert(runs)
    .values({
      ref: input.ref,
      projectId,
      ticketId: input.ticketId,
      title: input.title,
      state: input.state as never,
      lane: "owner",
      branch: `atlas/run/${input.ref.toLowerCase()}`,
      ...(input.extras as object),
    })
    .returning({ id: runs.id });
  if (input.stdout?.length) {
    await db.insert(runStdoutChunks).values(
      input.stdout.map((content, i) => ({ runId: r.id, seq: i + 1, content: `${content}\n` })),
    );
  }
  for (const f of input.feed ?? []) {
    await db.insert(feedEvents).values({
      kind: f.kind as never,
      actor: f.kind === "dispatched" || f.kind === "ship-requested" ? "you" : "Engine",
      summary: `${input.ref} — ${input.title}`,
      projectId,
      runId: r.id,
      ticketId: input.ticketId,
      payload: { from: null, to: input.state },
      createdAt: new Date(Date.now() - f.minutesAgo * 60_000),
    });
  }
  return r;
}

test.beforeAll(async () => {
  test.setTimeout(120_000);
  mkdirSync(CAPTURE_DIR, { recursive: true });
  await cleanup();

  const [project] = await db
    .insert(projects)
    .values({
      name: `E2E m9cap ${RUN}`,
      slug: `e2e-m9cap-${RUN}`,
      pinned: false,
      seeded: false,
    })
    .returning({ id: projects.id });
  projectId = project.id;

  const STDOUT = [
    "engine session start — capture fixture (acme-website)",
    "reading the Brief…",
    "planning the change for the ticket list",
    "wrote src/lib/ticket-export.ts",
    "wrote app/tickets/page.tsx",
    "✓ existing tests stay green",
  ];

  // RR — a running run with a streamed transcript
  const liveTicket = await seedTicket("Add CSV export to the ticket list", "in-progress");
  await db.insert(briefs).values({
    ticketId: liveTicket.id,
    body: BRIEF_BODY,
    status: "final",
    source: "helper-run",
  });
  await seedRun({
    ref: REFS.live,
    ticketId: liveTicket.id,
    title: "Add CSV export to the ticket list",
    state: "running",
    stdout: STDOUT,
    feed: [
      { kind: "dispatched", minutesAgo: 3 },
      { kind: "started", minutesAgo: 2 },
    ],
  });

  // K — a ship-conflict failure
  const failedTicket = await seedTicket("Add CSV export to the ticket list", "failed");
  await seedRun({
    ref: REFS.failed,
    ticketId: failedTicket.id,
    title: "Add CSV export to the ticket list",
    state: "failed",
    extras: {
      failureKind: "conflict",
      failureDetail: "conflicting files: app/tickets/page.tsx",
      diffStats: DIFF_STATS,
    },
    stdout: [...STDOUT, "⨯ failure: merge conflicts with the base branch"],
    feed: [
      { kind: "dispatched", minutesAgo: 12 },
      { kind: "started", minutesAgo: 12 },
      { kind: "review-ready", minutesAgo: 9 },
      { kind: "failed", minutesAgo: 8 },
    ],
  });

  // V — a shipped run
  const shippedTicket = await seedTicket("Add JSON export endpoint", "shipped");
  await seedRun({
    ref: REFS.shipped,
    ticketId: shippedTicket.id,
    title: "Add JSON export endpoint",
    state: "shipped",
    extras: {
      diffStats: DIFF_STATS,
      mergeSha: "ab05f49c2d1e88f7a3b4c5d6e7f8091a2b3c4d5e",
      prUrl: "https://github.com/acme/website/pull/892",
    },
    stdout: [...STDOUT, "✓ PR merged · main updated"],
    feed: [
      { kind: "dispatched", minutesAgo: 65 },
      { kind: "started", minutesAgo: 64 },
      { kind: "review-ready", minutesAgo: 20 },
      { kind: "ship-requested", minutesAgo: 9 },
      { kind: "shipped", minutesAgo: 8 },
    ],
  });

  // KK — a review-ready run with the real patch
  const reviewTicket = await seedTicket("Add CSV export to the ticket list", "review-ready");
  await db.insert(briefs).values({
    ticketId: reviewTicket.id,
    body: BRIEF_BODY,
    status: "draft",
    source: "helper-run",
  });
  await seedRun({
    ref: REFS.review,
    ticketId: reviewTicket.id,
    title: "Add CSV export to the ticket list",
    state: "review-ready",
    extras: { diffStats: DIFF_STATS, diffPatch: DIFF_PATCH },
    stdout: STDOUT,
    feed: [
      { kind: "dispatched", minutesAgo: 130 },
      { kind: "started", minutesAgo: 129 },
      { kind: "review-ready", minutesAgo: 120 },
    ],
  });

  // W — an approved ticket with the Engine draft to edit
  const composerTicket = await seedTicket("Add CSV export to the ticket list", "approved");
  await db.insert(briefs).values({
    ticketId: composerTicket.id,
    body: BRIEF_BODY,
    status: "draft",
    source: "helper-run",
  });
  (REFS as Record<string, string>).composerRef = composerTicket.ref;
});

test.afterAll(async () => {
  await cleanup();
});

test.describe.serial("M9 Session B — convergence captures", () => {
  test("owner bootstrap", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M9CAP Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("the five surfaces + their variants, three viewports each", async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto("/sign-in");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.getByRole("button", { name: /^sign in/i }).click();
    await expect(page).toHaveURL(/\/today/, { timeout: 30_000 });

    // RR — live
    await page.goto(`/runs/${REFS.live}`);
    await expect(page.getByText("Working on it.")).toBeVisible({ timeout: 30_000 });
    await captureAcrossViewports(page, "rr-live");

    // K — failed conflict
    await page.goto(`/runs/${REFS.failed}`);
    await expect(page.getByText(/Engine couldn.t ship/)).toBeVisible({ timeout: 30_000 });
    await captureAcrossViewports(page, "k-failed");

    // V — shipped
    await page.goto(`/runs/${REFS.shipped}`);
    await expect(page.getByText(/Atlas shipped/)).toBeVisible({ timeout: 30_000 });
    await captureAcrossViewports(page, "v-shipped");

    // KK — diff
    await page.goto(`/runs/${REFS.review}/diff`);
    await expect(page.getByRole("button", { name: /approve & ship/i })).toBeVisible({
      timeout: 30_000,
    });
    await captureAcrossViewports(page, "kk-diff");

    // W — composer
    await page.goto(`/tickets/${(REFS as Record<string, string>).composerRef}/brief`);
    await expect(page.getByText("Edit the Brief before dispatching it.")).toBeVisible({
      timeout: 30_000,
    });
    await captureAcrossViewports(page, "w-brief");

    // the byte-locked variants, for the side-by-side
    for (const key of ["rr", "k", "v", "kk", "w"]) {
      await page.goto(`/dev-variants/${key}`);
      await page.waitForTimeout(400);
      await captureAcrossViewports(page, `variant-${key}`);
    }
  });
});
