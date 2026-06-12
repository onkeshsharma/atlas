// M14 — public tier e2e (charter item 8): every surface renders
// signed-out with honest content; the docs index has NO dead rows (each
// listed row is visited); unknown slugs 404; the landing's root-routing
// contract holds both ways (signed-out visitors get the landing, a
// signed-in Owner is bounced to Today., and the authed guard still
// bounces signed-out /today). Self-cleaning: rows carry the
// "E2E M14" display-name marker, removed in afterAll.
import { expect, test } from "@playwright/test";
import { like } from "drizzle-orm";

// .env.local is loaded by playwright.config.ts before specs import.
import { db } from "../src/db/client";
import { memberships } from "../src/db/schema";

const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m14-owner-${RUN}@example.com`;
const OWNER_PASSWORD = "public-tier-editorial-14";

test.beforeAll(async () => {
  // self-heal from a crashed previous run (one-Owner invariant).
  await db.delete(memberships).where(like(memberships.displayName, "E2E M14%"));
});

test.afterAll(async () => {
  await db.delete(memberships).where(like(memberships.displayName, "E2E M14%"));
});

test.describe("public tier — signed-out renders", () => {
  test("/ serves the landing (no redirect) with the honest CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /A quiet place\s+for the work\s+your AI does\./ }),
    ).toBeVisible();
    // the two-audience story (charter item 2)
    await expect(page.getByText("Atlas serves two people.")).toBeVisible();
    await expect(page.getByText("the Owner", { exact: true })).toBeVisible();
    await expect(page.getByText("the Collaborator", { exact: true })).toBeVisible();
    // hero CTA goes to sign-in, ghost goes to docs
    await expect(page.getByRole("link", { name: /^Sign in\s*→$/ }).first()).toHaveAttribute(
      "href",
      "/sign-in",
    );
    await expect(page.getByRole("link", { name: "or read the docs →" })).toHaveAttribute(
      "href",
      "/docs",
    );
    // FF's FAQ "+" affordance is a real accordion now
    const faq = page.locator("details").first();
    await expect(faq.locator("p")).not.toBeVisible();
    await faq.locator("summary").click();
    await expect(faq.locator("p")).toBeVisible();
  });

  test("/docs lists only articles that exist — every row navigates", async ({ page }) => {
    await page.goto("/docs");
    await expect(page.getByRole("heading", { name: "Atlas, explained." })).toBeVisible();

    // collect every index-row href, then visit each one (no dead rows).
    const hrefs = await page
      .locator("main ol a[href^='/docs/']")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThanOrEqual(8);
    for (const href of [...new Set(hrefs)]) {
      const response = await page.goto(href!);
      expect(response!.status(), `${href} must render`).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("/docs/welcome-to-atlas renders the HH anatomy with real TOC anchors", async ({
    page,
  }) => {
    await page.goto("/docs/welcome-to-atlas");
    await expect(page.getByRole("heading", { name: "Welcome to Atlas." })).toBeVisible();
    await expect(page.getByText("On this page")).toBeVisible();
    // a TOC anchor resolves to a real section
    await expect(page.locator("section#what-it-isnt")).toBeVisible();
    await expect(page.getByText("Fig. 1 — the dispatch path")).toBeVisible();
    // provenance is the real source documents
    await expect(page.getByText("the v2 intake — VISION + CONTEXT")).toBeVisible();
  });

  test("/docs/architecture tells the real story (worktrees, hashed tokens)", async ({
    page,
  }) => {
    await page.goto("/docs/architecture");
    await expect(
      page.getByRole("heading", { name: "How Atlas actually works." }),
    ).toBeVisible();
    await expect(page.getByText("Fig. 1 — the system, end to end")).toBeVisible();
    await expect(page.getByText("sha-256").first()).toBeVisible();
    await expect(page.getByText("bridge-lost")).toBeVisible();
    await expect(page.getByText("ADR-0001 · ADR-0002")).toBeVisible();
  });

  test("unknown doc slugs 404 honestly", async ({ page }) => {
    const response = await page.goto("/docs/not-a-page");
    expect(response!.status()).toBe(404);
  });

  test("/status probes for real and says what it will not show", async ({ page }) => {
    await page.goto("/status");
    // the DB is reachable in e2e, so the hero reads fully up (the accent
    // span makes the accname "Atlas is up ." — visually the period is flush)
    await expect(page.getByRole("heading", { name: /Atlas is\s+up\s*\./ })).toBeVisible();
    await expect(page.getByText("Database · Neon Postgres")).toBeVisible();
    await expect(page.getByText(/replied in \d+ ms/)).toBeVisible();
    // no synthetic uptime, no fake incidents (charter item 5)
    await expect(page.getByText("%")).toHaveCount(0);
    await expect(page.getByText("0 incidents")).toBeVisible();
    await expect(page.getByText("Nothing here.")).toBeVisible();
    // the Bridge's absence is named, not implied
    await expect(page.getByText("No Bridge row here, on purpose")).toBeVisible();
  });

  test("/changelog is the real M0→M15 history", async ({ page }) => {
    await page.goto("/changelog");
    await expect(page.getByRole("heading", { name: "What we shipped." })).toBeVisible();
    await expect(page.getByText("9 drops")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "The Engine takes orders." }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Law before code." })).toBeVisible();
    // the newest drop carries the live "current" marker (NN:145–153);
    // it moves with each integration (one drop per round — dispatcher upkeep).
    await expect(page.locator("#m13-m15").getByText("current")).toBeVisible();
    // permalinks are real anchors (kit id axis)
    await expect(page.locator("article#m9")).toBeVisible();
    await expect(page.locator("article#m0-m2")).toBeVisible();
  });
});

test.describe.serial("root routing — signed-in vs signed-out", () => {
  test("authed guard still holds: signed-out /today bounces to /sign-in", async ({ page }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("a signed-in Owner visiting / lands on Today. (M6 landingFor)", async ({ page }) => {
    test.setTimeout(240_000);

    // bootstrap the e2e Owner through the REAL sign-up flow (M5 pattern)
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M14 Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(OWNER_PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });

    // the landing refuses to market to the signed-in
    await page.goto("/");
    await expect(page).toHaveURL(/\/today/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Today." })).toBeVisible();
  });
});
