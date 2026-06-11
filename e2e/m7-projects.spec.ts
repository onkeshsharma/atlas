// M7 — Projects e2e (charter §5): REAL flows over the seeded m7-dev
// Neon branch — owner bootstrap → /projects index → THE CHARTER FLOW
// (create → ingest queued, honest → landing → pin → Today's pinned
// strip → context curation) → the J ready render over the seeded
// Engine-written summary — plus a live proof (a project created in the
// DB appears on the open index without reload) and fidelity captures
// at 1920/1440/1280 into ../notes/m7-captures/. Self-cleaning: rows
// carry the e2e-/E2E markers; context curation mutates seeded rows, so
// afterAll re-runs the seed (M6 precedent).
import { execSync } from "node:child_process";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { inArray, like } from "drizzle-orm";

// .env.local is loaded by playwright.config.ts before specs import.
import { db } from "../src/db/client";
import {
  contextTerms,
  feedEvents,
  memberships,
  projects,
  userPreferences,
} from "../src/db/schema";
import { createProject } from "../src/domain/project/create";

const CAPTURE_DIR = join(__dirname, "..", "..", "notes", "m7-captures");
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const FLOW_SLUG = `e2e-flow-${RUN}`;
const LIVE_SLUG = `e2e-live-${RUN}`;

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
  const e2eProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(like(projects.slug, "e2e-%"));
  const ids = e2eProjects.map((p) => p.id);
  if (ids.length) {
    await db.delete(feedEvents).where(inArray(feedEvents.projectId, ids));
    await db.delete(contextTerms).where(inArray(contextTerms.projectId, ids));
    await db.delete(projects).where(inArray(projects.id, ids));
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
  // context curation flipped seeded suggestion rows — restore demo state.
  execSync("node scripts/seed-demo.mjs", { cwd: join(__dirname, "..") });
});

test.describe.serial("M7 — Projects over real rows", () => {
  test("owner bootstraps; /projects lists the seeded rows with honest ingest states", async ({
    page,
  }) => {
    test.setTimeout(240_000);

    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });

    // the nav claim — Projects is a real link now (charter §4)
    await page.goto("/today");
    await page.getByRole("link", { name: /projects/i }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole("heading", { name: "Projects." })).toBeVisible();

    // seeded rows with their three honest ingest states
    const acme = page.locator("li", { hasText: "acme-website" }).first();
    await expect(acme.getByText("ingested", { exact: false })).toBeVisible();
    const internal = page.locator("li", { hasText: "atlas-internal" }).first();
    await expect(internal.getByText("ingest queued")).toBeVisible();
    const side = page.locator("li", { hasText: "side-experiment" }).first();
    await expect(side.getByText("not ingested")).toBeVisible();
    // pinned mark on the seeded pinned project
    await expect(acme.getByText("★")).toBeVisible();

    await captureAcrossViewports(page, "projects-index");
  });

  test("LIVE — a project created in the DB appears on the open index without reload", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page);
    await page.goto("/projects");
    await expect(page.getByText(LIVE_SLUG)).toHaveCount(0);

    // domain write = insert + project-created outbox row in ONE statement;
    // the SSE seam must carry it into the open tab.
    const result = await createProject({
      source: `https://github.com/e2e/${LIVE_SLUG}`,
      actor: "e2e",
    });
    expect(result.ok).toBe(true);

    await expect(page.getByText(LIVE_SLUG).first()).toBeVisible({ timeout: 20_000 });
  });

  test("THE CHARTER FLOW — create → ingest(queued) → landing → pin → context", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await signIn(page);

    // R — the intake form
    await page.goto("/projects/new");
    await expect(page.getByRole("heading", { name: "Add a Project." })).toBeVisible();
    // greenfield is honestly disabled
    await expect(page.getByRole("button", { name: /begin grill/i })).toBeDisabled();
    await captureAcrossViewports(page, "new-project");

    // §2.13 — malformed input gets the quiet rose line, nothing is created
    await page.getByPlaceholder("https://github.com/your-org/your-repo").fill("not a repo");
    await page.getByRole("button", { name: /connect repository/i }).click();
    await expect(
      page.getByText("that doesn't look like a repository url or a filesystem path"),
    ).toBeVisible();

    // the real create → lands on the honest queued ingest page
    await page
      .getByPlaceholder("https://github.com/your-org/your-repo")
      .fill(`https://github.com/e2e/${FLOW_SLUG}`);
    await page.getByRole("button", { name: /connect repository/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${FLOW_SLUG}/ingest`), {
      timeout: 30_000,
    });
    await expect(page.getByText("ingest queued")).toBeVisible();
    await expect(
      // M9 Session B made the ingest runnable — the waiting copy changed
      // from "when a Bridge is paired" to the on-its-next-Run truth.
      page.getByText("The Engine reads this repo on its next Run", { exact: false }),
    ).toBeVisible();
    await captureAcrossViewports(page, "ingest-queued");

    // O — the landing renders real (empty) aggregates
    await page.goto(`/projects/${FLOW_SLUG}`);
    await expect(
      page.getByRole("heading", { name: `${FLOW_SLUG}.` }),
    ).toBeVisible();
    await expect(page.getByText("open Tickets ·")).toBeVisible();
    await expect(page.getByText("Ingest queued.")).toBeVisible();

    // pin → Today's pinned strip reads it through M6's queries (PRD #32)
    await page.getByRole("button", { name: /pin to Today/i }).click();
    await expect(page.getByRole("button", { name: /pinned · unpin/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.goto("/today");
    const pinnedSection = page.locator("section", { hasText: "Pinned" }).first();
    await expect(pinnedSection.getByText(FLOW_SLUG)).toBeVisible();

    // context — the term sections render their honest empty states
    await page.goto(`/projects/${FLOW_SLUG}/context`);
    await expect(page.getByText("No terms yet.")).toBeVisible();
    await expect(page.getByText("Nothing noticed yet.", { exact: false })).toBeVisible();

    // unpin restores curation (claim semantics: one click, one event)
    await page.goto(`/projects/${FLOW_SLUG}`);
    await page.getByRole("button", { name: /pinned · unpin/i }).click();
    await expect(page.getByRole("button", { name: /pin to Today/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("J ready — the Engine-written summary shape renders from seeded rows", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await signIn(page);

    await page.goto("/projects/acme-website");
    // O over the full seed: count sentence + pinned tickets + rail
    await expect(page.getByRole("heading", { name: "acme-website." })).toBeVisible();
    await expect(page.getByText("waiting on triage")).toBeVisible();
    const pinned = page.locator("section", { hasText: "Pinned" }).first();
    await expect(pinned.locator("li").first()).toBeVisible();
    await captureAcrossViewports(page, "project-landing");

    await page.goto("/projects/acme-website/ingest");
    await expect(page.getByText("Engine read")).toBeVisible();
    await expect(page.getByText("page.tsx is 1,247 lines long")).toBeVisible();
    await expect(page.getByText("73% coverage")).toBeVisible();
    await expect(page.getByText("Fig. 1 — System flow", { exact: false })).toBeVisible();
    // M9 Session B restored J:530 — the refresh CTA is a REAL Helper Run
    // (the M7 "soon" honesty note retired with its executor).
    await expect(page.getByRole("button", { name: /refresh from latest/i })).toBeVisible();
    await captureAcrossViewports(page, "ingest-ready");
  });

  test("P — context curation: add → joins Language; dismiss ✕ removes", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await signIn(page);
    await page.goto("/projects/acme-website/context");
    await expect(
      page.getByRole("heading", { name: "acme-website." }),
    ).toBeVisible();
    // seeded Language terms incl. the rose AVOID badge
    await expect(page.getByText("Storefront", { exact: true })).toBeVisible();
    await expect(page.getByText("avoid", { exact: true })).toBeVisible();
    await captureAcrossViewports(page, "context-viewer");

    // add → Webhook moves from suggestions into Language (real mutation)
    const webhookRow = page.locator("li", { hasText: "Webhook" }).first();
    await expect(webhookRow.getByText("23 uses")).toBeVisible();
    await webhookRow.getByRole("button", { name: /add/i }).click();
    const language = page.locator("section#language");
    await expect(language.getByText("Webhook")).toBeVisible({ timeout: 15_000 });

    // dismiss ✕ Invoice disappears entirely
    const invoiceRow = page.locator("li", { hasText: "Invoice" }).first();
    await invoiceRow.getByRole("button", { name: /dismiss/i }).click();
    await expect(page.getByText("Invoice")).toHaveCount(0, { timeout: 15_000 });

    await page.screenshot({
      path: join(CAPTURE_DIR, "context-after-curation-1440.png"),
      fullPage: true,
    });
  });
});
