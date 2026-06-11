// M6 — cockpit e2e (charter §5): REAL flows over the seeded Neon DB —
// owner sign-up → Today with live rows → THE LIVE PROOF (DB writes
// appearing in the open browser without reload, via the ADR-0001 SSE
// seam) → inbox (filters + mark-all-read) → sidebar persistence +
// sign-out — plus fidelity captures at 1920/1440/1280 into
// ../notes/m6-captures/. Self-cleaning: every row this suite creates
// carries the "E2E " marker and is deleted in afterAll; mark-all-read
// mutates seed rows, so afterAll re-runs the seed script.
import { execSync } from "node:child_process";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { eq, inArray, like } from "drizzle-orm";

// .env.local is loaded by playwright.config.ts before specs import.
import { db } from "../src/db/client";
import { feedEvents, memberships, projects, runs, tickets, userPreferences } from "../src/db/schema";
import { applyRunTransition } from "../src/domain/run/transitions";

const CAPTURE_DIR = join(__dirname, "..", "..", "notes", "m6-captures");
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";

const VIEWPORTS = [
  { w: 1920, h: 1080 },
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
];

/** Next dev-tools indicator (<nextjs-portal>, bottom-left) overlaps the
 * sidebar's user mark and intercepts pointer events — hide it. */
async function hideDevOverlay(page: Page) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
}

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

/** sign in as the owner test 1 created — and prove the M6 landing: the
 * Owner now lands on /today (app/sign-in/actions.ts landingFor). */
async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: /^sign in/i }).click();
  await expect(page).toHaveURL(/\/today/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Today." })).toBeVisible();
}

async function cleanupE2ERows() {
  const e2eTickets = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(like(tickets.title, "E2E %"));
  const e2eRuns = await db
    .select({ id: runs.id })
    .from(runs)
    .where(like(runs.title, "E2E %"));
  if (e2eRuns.length) {
    await db.delete(feedEvents).where(inArray(feedEvents.runId, e2eRuns.map((r) => r.id)));
  }
  if (e2eTickets.length) {
    await db.delete(feedEvents).where(inArray(feedEvents.ticketId, e2eTickets.map((t) => t.id)));
  }
  await db.delete(feedEvents).where(like(feedEvents.summary, "E2E %"));
  if (e2eRuns.length) await db.delete(runs).where(inArray(runs.id, e2eRuns.map((r) => r.id)));
  if (e2eTickets.length) {
    await db.delete(tickets).where(inArray(tickets.id, e2eTickets.map((t) => t.id)));
  }
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
  // mark-all-read flipped the seeded unread rows — restore the demo state.
  execSync("node scripts/seed-demo.mjs", { cwd: join(__dirname, "..") });
});

test.describe.serial("M6 — shell + Today + inbox over real rows", () => {
  test("owner signs up and lands on a fully real Today.", async ({ page }) => {
    test.setTimeout(240_000);

    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });

    // the cockpit (sign-IN routes here; the sign-up arc passes welcome)
    await page.goto("/today");
    await expect(page.getByRole("heading", { name: "Today." })).toBeVisible();
    // hero numerals are real ticket counts from the seed
    await expect(page.getByText("tickets need your triage.")).toBeVisible();
    // §3.3 — ONE amber panel, kicker counts the two seeded needs-input runs
    await expect(page.getByText("2 runs need your input")).toBeVisible();
    await expect(
      page.getByText("Include archived (>90d closed) tickets in the export?"),
    ).toBeVisible();
    // active strip carries the running seed run
    await expect(page.getByText("Active runs")).toBeVisible();
    await expect(page.getByText("Parallel-safe Ship Group dispatch").first()).toBeVisible();
    // pinned strip + sparkline + Recent feed read real rows
    await expect(page.getByText("acme-website").first()).toBeVisible();
    await expect(page.getByText("Add export to CSV").first()).toBeVisible();
    // rail: ready-to-ship card with the §3.4 emerald ship CTA
    const shipButton = page.getByRole("button", { name: /ship 2 now/i });
    await expect(shipButton).toBeVisible();
    await expect(shipButton).toHaveClass(/bg-emerald-600/);
    // honest Bridge empty state
    await expect(page.getByText("No Bridge is paired with this Atlas yet", { exact: false })).toBeVisible();

    await captureAcrossViewports(page, "today");
  });

  test("LIVE PROOF — DB writes appear in the open browser without reload", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page);

    const liveTitle = `E2E live proof ${RUN}`;
    await expect(page.getByText(liveTitle)).toHaveCount(0);

    // 1) a new ticket lands in the DB + its feed event (the outbox row
    //    is what the SSE broker streams)…
    const [{ id: projectId }] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.name, "acme-website"));
    const [ticket] = await db
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
      summary: `E2E ${RUN} — live proof feed event`,
      projectId,
      ticketId: ticket.id,
      ticketRef: `E2E-${RUN}`,
    });

    // …and appears in the open tab without any reload.
    await expect(page.getByText(liveTitle)).toBeVisible({ timeout: 20_000 });

    // 2) a Run created queued, then transitioned through the domain
    //    write helper — the strip's state word updates live.
    const runTitle = `E2E live run ${RUN}`;
    const [liveRun] = await db
      .insert(runs)
      .values({
        ref: `E2E-R-${RUN}`,
        projectId,
        ticketId: ticket.id,
        title: runTitle,
        state: "queued",
      })
      .returning({ id: runs.id });
    await db.insert(feedEvents).values({
      kind: "dispatched",
      actor: "e2e",
      summary: `E2E-R-${RUN} — ${runTitle}`,
      projectId,
      runId: liveRun.id,
      payload: { from: null, to: "queued" },
    });

    const row = page.locator("li", { hasText: runTitle }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.getByText("queued", { exact: true })).toBeVisible();

    const result = await applyRunTransition({
      runId: liveRun.id,
      from: "queued",
      to: "running",
      actor: "e2e",
    });
    expect(result.ok).toBe(true);
    await expect(row.getByText("running", { exact: true })).toBeVisible({ timeout: 20_000 });

    await page.screenshot({
      path: join(CAPTURE_DIR, "live-proof-after-1440.png"),
      fullPage: true,
    });
  });

  test("inbox: real groups, working filters, mark-all-read", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page);
    // navigate via the shell's I initial (accessible name = initial + tooltip)
    await page.getByRole("link", { name: /inbox/i }).click();
    await expect(page).toHaveURL(/\/inbox/);
    await expect(page.getByRole("heading", { name: "What’s happened." })).toBeVisible();
    await expect(page.getByText("Today", { exact: true }).first()).toBeVisible();
    await captureAcrossViewports(page, "inbox");

    // filter chips drive a real ?show= param
    await page.getByRole("button", { name: "Shipped" }).click();
    await expect(page).toHaveURL(/show=shipped/);
    await expect(page.getByText("Add JSON export endpoint").first()).toBeVisible();
    await expect(page.getByText("Onboarding screenshots are stale")).toHaveCount(0);
    await page.screenshot({
      path: join(CAPTURE_DIR, "inbox-filter-shipped-1440.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Everything" }).click();
    await expect(page).not.toHaveURL(/show=/);

    // mark all read clears the unread hero + the nav badge
    await page.getByRole("button", { name: /mark all read/i }).click();
    await expect(page.getByText("0 unread")).toBeVisible({ timeout: 15_000 });
  });

  test("sidebar: expand persists via user_preferences; sign-out is real", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page);
    // the user mark's hover popover carries the §2.1 toggle + sign-out
    // (the shell rail is the FIRST aside — Today's 360 rail is also an aside)
    await hideDevOverlay(page);
    await page.locator("aside").first().locator(".group").last().hover();
    await page.getByRole("button", { name: /expand sidebar/i }).click();
    // expanded rail: sans labels (T70 lock) — visible at the 1440 viewport
    await expect(page.getByRole("link", { name: "Today", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    // persisted: a fresh load still renders expanded
    await page.reload();
    await expect(page.getByRole("link", { name: "Today", exact: true })).toBeVisible();
    await page.screenshot({
      path: join(CAPTURE_DIR, "shell-expanded-1440.png"),
      fullPage: true,
    });
    // collapse back (expanded form renders the toggle in the bottom block)
    await hideDevOverlay(page);
    await page.getByRole("button", { name: /collapse sidebar/i }).click();
    await expect(page.getByRole("link", { name: /^T Today/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "atlas", exact: true })).toHaveCount(0);

    // sign-out from the popover clears the session for real
    await hideDevOverlay(page);
    await page.locator("aside").first().locator(".group").last().hover();
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/sign-in/);
    await page.goto("/today");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
