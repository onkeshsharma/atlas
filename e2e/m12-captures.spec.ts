// M12 — convergence captures (master plan §5.5–5.6): the palette
// (default · query · empty) and /search at 1920/1440/1280 beside their
// /dev-variants renders (UU + Y + LL), into notes/m12-captures/.
// Runs over the seeded universe; owner bootstrap self-cleans.
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { signInAsOwner } from "./support/sign-in";
import { inArray, like } from "drizzle-orm";

import { db } from "../src/db/client";
import { memberships, userPreferences } from "../src/db/schema";

const CAPTURE_DIR = join(__dirname, "..", "..", "notes", "m12-captures");
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m12cap-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";

const VIEWPORTS = [
  { w: 1920, h: 1080 },
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
];

async function freezeMotion(page: Page) {
  await page.mouse.move(0, 0);
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; }",
  });
}

async function captureAcrossViewports(page: Page, slug: string, fullPage = true) {
  await freezeMotion(page);
  for (const { w, h } of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    await page.screenshot({ path: join(CAPTURE_DIR, `${slug}-${w}.png`), fullPage });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function cleanupRows() {
  const owners = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M12CAP %"));
  if (owners.length) {
    await db
      .delete(userPreferences)
      .where(inArray(userPreferences.userId, owners.map((o) => o.userId)));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E M12CAP %"));
}

test.beforeAll(async () => {
  mkdirSync(CAPTURE_DIR, { recursive: true });
  await cleanupRows();
});

test.afterAll(async () => {
  await cleanupRows();
});

test.describe.serial("M12 — capture rig", () => {
  test("owner bootstrap", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M12CAP Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("palette + /search at 1920/1440/1280 (+ the variant references)", async ({ page }) => {
    test.setTimeout(600_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);

    // /search with a query that exercises every corpus shape
    await page.goto("/search?q=export", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Add export to CSV").first()).toBeVisible({ timeout: 30_000 });
    await captureAcrossViewports(page, "search-query");

    // /search empty + no-results states
    await page.goto("/search", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await freezeMotion(page);
    await page.screenshot({ path: join(CAPTURE_DIR, "search-empty-1440.png"), fullPage: true });
    await page.goto("/search?q=zzz-quixotic-nothing", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await freezeMotion(page);
    await page.screenshot({
      path: join(CAPTURE_DIR, "search-no-results-1440.png"),
      fullPage: true,
    });

    // palette — default sections (viewport-sized: the §2.11 overlay)
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Control+k");
    await expect(page.getByLabel("Command palette")).toBeVisible();
    await expect(page.getByTestId("command-palette").getByText("Pages")).toBeVisible({
      timeout: 15_000,
    });
    await captureAcrossViewports(page, "palette-default", false);

    // palette — typed query
    await page.getByLabel("Command palette").fill("export");
    await expect(page.locator("[data-palette-active]")).toBeVisible({ timeout: 15_000 });
    await captureAcrossViewports(page, "palette-query", false);

    // palette — §2.17 empty state
    await page.getByLabel("Command palette").fill("zzz-quixotic-nothing");
    await expect(page.getByText("Nothing matches")).toBeVisible({ timeout: 15_000 });
    await freezeMotion(page);
    await page.screenshot({ path: join(CAPTURE_DIR, "palette-empty-1440.png") });
    await page.keyboard.press("Escape");

    // variant references at the canonical width
    for (const key of ["uu", "y", "ll"]) {
      await page.goto(`/dev-variants/${key}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      await freezeMotion(page);
      await page.screenshot({
        path: join(CAPTURE_DIR, `variant-${key}-1440.png`),
        fullPage: true,
      });
    }
  });
});
