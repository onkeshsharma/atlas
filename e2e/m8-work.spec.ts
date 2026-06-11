// M8 — work-loop e2e (charter done-criterion 1): REAL flows over the
// seeded Neon DB — owner bootstrap → file a Ticket (S) → keyboard triage
// (I) → board (G) with the hints-engine cluster → owner move via detail
// (F) → blocked-by edge declaration — every step real rows + feed_events
// — plus THE BOARD LIVE PROOF (a DB write appearing on the open board
// without reload via the ADR-0001 SSE seam) and fidelity captures at
// 1920/1440/1280 into ../notes/m8-captures/. Self-cleaning: rows carry
// the "E2E " marker; afterAll re-runs the seed (triage decisions touch
// seeded rows' updated_at ordering, and the suite must leave the demo
// state pristine).
import { execSync } from "node:child_process";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { eq, inArray, like, or } from "drizzle-orm";

// .env.local is loaded by playwright.config.ts before specs import.
import { db } from "../src/db/client";
import {
  briefs,
  feedEvents,
  memberships,
  projects,
  runs,
  runStdoutChunks,
  ticketLinks,
  tickets,
  userPreferences,
} from "../src/db/schema";

const CAPTURE_DIR = join(__dirname, "..", "..", "notes", "m8-captures");
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m8-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const FILED_TITLE = `E2E export buttons feel buried ${RUN}`;

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

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: /^sign in/i }).click();
  await expect(page).toHaveURL(/\/today/, { timeout: 30_000 });
}

async function cleanupE2ERows() {
  const e2eTickets = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(like(tickets.title, "E2E %"));
  const ids = e2eTickets.map((t) => t.id);
  if (ids.length) {
    await db
      .delete(ticketLinks)
      .where(or(inArray(ticketLinks.blockerId, ids), inArray(ticketLinks.blockedId, ids)));
    await db.delete(feedEvents).where(inArray(feedEvents.ticketId, ids));
    // M9 — filing now auto-queues an enrich Helper Run (PRD #17); its
    // children go before the tickets (FK order: chunks → runs → briefs).
    const e2eRuns = await db
      .select({ id: runs.id })
      .from(runs)
      .where(inArray(runs.ticketId, ids));
    if (e2eRuns.length) {
      await db
        .delete(runStdoutChunks)
        .where(inArray(runStdoutChunks.runId, e2eRuns.map((r) => r.id)));
    }
    await db.delete(runs).where(inArray(runs.ticketId, ids));
    await db.delete(briefs).where(inArray(briefs.ticketId, ids));
    await db.delete(tickets).where(inArray(tickets.id, ids));
  }
  await db.delete(feedEvents).where(like(feedEvents.summary, "E2E %"));
  const e2eMembers = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E %"));
  if (e2eMembers.length) {
    await db
      .delete(userPreferences)
      .where(inArray(userPreferences.userId, e2eMembers.map((m) => m.userId)));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E %"));
}

test.beforeAll(async () => {
  await cleanupE2ERows();
});

test.afterAll(async () => {
  await cleanupE2ERows();
  // triage/board flows reorder seeded rows (updated_at) — restore demo state.
  execSync("node scripts/seed-demo.mjs", { cwd: join(__dirname, "..") });
});

test.describe.serial("M8 — the work loop over real rows", () => {
  test("owner bootstrap + file a Ticket (S) → real record + filed outbox", async ({
    page,
  }) => {
    test.setTimeout(240_000);

    // bootstrap this suite's owner (m6's pattern; the suite cleans it up)
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M8 Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });

    // the nav Board item is claimed (real href + triage badge)
    await page.goto("/today");
    await expect(page.locator('a[href="/board"]')).toBeVisible();

    // file-a-ticket (variant S)
    await page.goto("/tickets/new");
    await expect(page.getByRole("heading", { name: "What needs fixing?" })).toBeVisible();
    await captureAcrossViewports(page, "tickets-new");

    // §2.13 error state — empty title bounces with the quiet mono line
    await page.getByRole("button", { name: /file this ticket/i }).click();
    await expect(page).toHaveURL(/error=title/);
    await expect(page.getByText("give it a title")).toBeVisible();

    await page.getByPlaceholder(/One short sentence/).fill(FILED_TITLE);
    await page
      .locator('textarea[name="body"]')
      .fill(
        "The export options are hidden in the overflow menu.\n\nSurface them as primary affordances near the toolbar.",
      );
    await page.getByRole("button", { name: "Bug", exact: true }).click();
    await page.getByRole("button", { name: "Soon", exact: true }).click();
    await page.getByRole("button", { name: /file this ticket/i }).click();

    // → the detail page (F) with the real record
    await expect(page).toHaveURL(/\/tickets\/T-\d+$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: FILED_TITLE })).toBeVisible();
    await expect(page.getByText(/bug[\s\S]*filed by you/).first()).toBeVisible();
    // state hero + track sit on Triage; activity has the filed row
    await expect(page.getByText("Waiting for your triage.")).toBeVisible();
    await expect(page.getByText("You filed this")).toBeVisible();
    // honest pre-M9 states: pending enrichment, disabled dispatch, no Brief
    await expect(page.getByText("Enrichment pending", { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /dispatch to ai/i })).toBeDisabled();
    await expect(page.getByText("No Brief drafted yet", { exact: false })).toBeVisible();

    // the filed outbox row exists (THE OUTBOX RULE)
    const [row] = await db
      .select({ id: tickets.id })
      .from(tickets)
      .where(eq(tickets.title, FILED_TITLE));
    expect(row).toBeTruthy();
    const events = await db
      .select({ kind: feedEvents.kind })
      .from(feedEvents)
      .where(eq(feedEvents.ticketId, row.id));
    expect(events.map((e) => e.kind)).toContain("filed");
  });

  test("triage (I) — keyboard approve moves it to approved + moved outbox", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page);

    // the seeded queue head shows the full editorial reading column
    await page.goto("/triage");
    await expect(page.getByText("Tickets · Triage").first()).toBeVisible();
    await expect(page.getByText(/^1 of 4$/).first()).toBeVisible();
    await captureAcrossViewports(page, "triage");

    // jump to OUR ticket (filed last → last index) and approve via keyboard.
    // The deck's keydown listener attaches on hydration (triage-deck.tsx
    // useEffect) — a press that lands before hydration is silently lost
    // under dev-server load, so re-press until the row flips. DB-gated:
    // once the ticket leaves triage we stop pressing, otherwise a second
    // press would approve the NEXT queue head (a seeded ticket).
    await page.goto("/triage?i=3");
    await expect(page.getByRole("heading", { name: FILED_TITLE })).toBeVisible();
    {
      const deadline = Date.now() + 30_000;
      for (;;) {
        await page.keyboard.press("a");
        await new Promise((r) => setTimeout(r, 1_000));
        const [t] = await db
          .select({ state: tickets.state })
          .from(tickets)
          .where(eq(tickets.title, FILED_TITLE));
        if (t.state !== "triage" || Date.now() > deadline) break;
      }
    }

    // the queue advances (ours is gone — 3 seeded tickets remain)
    await expect(page.getByText(/^3 of 3$/).first()).toBeVisible({ timeout: 30_000 });

    const [row] = await db
      .select({ id: tickets.id, state: tickets.state })
      .from(tickets)
      .where(eq(tickets.title, FILED_TITLE));
    expect(row.state).toBe("approved");
    const moved = await db
      .select({ kind: feedEvents.kind })
      .from(feedEvents)
      .where(eq(feedEvents.ticketId, row.id));
    expect(moved.map((e) => e.kind)).toContain("moved");
  });

  test("board (G) — right Category, real hints cluster, LIVE PROOF", async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page);

    await page.goto("/board");
    await expect(page.getByRole("heading", { name: "Tickets." })).toBeVisible();

    // our approved ticket sits in the Active column (3rd of the 5)
    const activeColumn = page.locator(".grid-cols-5 > div").nth(2);
    await expect(activeColumn.getByText("Active")).toBeVisible();
    await expect(activeColumn.getByText(FILED_TITLE)).toBeVisible();

    // the REAL hints engine: Parallel-safe cluster over T-247 ⊥ T-301,
    // AI-suggests line, per-spec (unwired) emerald ship pill,
    // blocked-by hint from the declared T-279 → T-280 edge
    await expect(page.getByText("Parallel-safe · 2")).toBeVisible();
    await expect(page.getByText("AI suggests:", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: /ship 2/i })).toHaveClass(/bg-emerald-600/);
    await expect(page.getByText("blocked by #279")).toBeVisible();
    await expect(page.getByText("parallel-safe with", { exact: false }).first()).toBeVisible();

    await captureAcrossViewports(page, "board");

    // density control is real — Compact folds card meta rows away
    await page.getByRole("button", { name: "C", exact: true }).click();
    await expect(page).toHaveURL(/density=c/);
    await expect(page.getByText("blocked by #279")).toHaveCount(0);
    await page.getByRole("button", { name: "M", exact: true }).click();

    // filters are real — Kind cycles to bug and hides our enhancementless? no:
    // reporter filter narrows to "you"
    await page.getByRole("button", { name: /Reporter/ }).click();
    await expect(page).toHaveURL(/reporter=/);
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page).toHaveURL(/\/board$/);

    // THE BOARD LIVE PROOF — a DB write appears without reload
    const liveTitle = `E2E live board proof ${RUN}`;
    await expect(page.getByText(liveTitle)).toHaveCount(0);
    const [{ id: projectId }] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.name, "acme-website"));
    const [liveTicket] = await db
      .insert(tickets)
      .values({
        ref: `E2E-${RUN}`,
        projectId,
        title: liveTitle,
        state: "triage",
        reporter: "e2e",
      })
      .returning({ id: tickets.id });
    await db.insert(feedEvents).values({
      kind: "filed",
      actor: "e2e",
      summary: `E2E ${RUN} — board live proof`,
      projectId,
      ticketId: liveTicket.id,
      ticketRef: `E2E-${RUN}`,
    });
    await expect(page.getByText(liveTitle)).toBeVisible({ timeout: 20_000 });
  });

  test("detail (F) — owner move to Backlog + blocked-by edge declaration", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page);

    const [row] = await db
      .select({ ref: tickets.ref })
      .from(tickets)
      .where(eq(tickets.title, FILED_TITLE));

    await page.goto(`/tickets/${row.ref}`);
    await expect(page.getByText("Approved by you. Not dispatched yet.")).toBeVisible();

    // PRD #14 — the quiet move link defers it to Backlog
    await page.getByRole("button", { name: /move to backlog/i }).click();
    await expect(page.getByText("Parked deliberately", { exact: false })).toBeVisible({
      timeout: 30_000,
    });
    // the state track's axis marks Backlog as "you are here"
    await expect(
      page.locator("span.text-amber-600", { hasText: "backlog" }),
    ).toBeVisible();

    // PRD #16 — declare a blocked-by edge against a seeded ticket
    await page.getByRole("button", { name: "+ add" }).click();
    await page.getByPlaceholder("T-247").fill("T-279");
    await page.getByRole("button", { name: /^add/ }).click();
    await expect(page.getByText("Blocked by T-279", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    // …and the Related rail mirrors it
    await expect(page.getByText("blocks this", { exact: false })).toBeVisible();
    // the card on the board now carries the rose hint
    await page.goto("/board");
    await expect(page.getByText(`blocked by #279`).first()).toBeVisible();

    await page.goto(`/tickets/${row.ref}`);
    await captureAcrossViewports(page, "ticket-detail");

    // every step of the loop is in the activity record (real feed_events)
    await expect(page.getByText("You filed this")).toBeVisible();
    await expect(page.getByText("You moved to approved")).toBeVisible();
    await expect(page.getByText("You moved to backlog")).toBeVisible();
    await expect(page.getByText("You declared this blocked by T-279")).toBeVisible();
  });
});
