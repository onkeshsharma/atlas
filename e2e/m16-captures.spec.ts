// M16 — convergence captures (master plan §5.5–5.6): /insights at
// 1920/1440/1280 beside its /dev-variants/oo render, plus the 30d range
// state, into notes/m16-captures/. Runs over the seeded universe; owner
// bootstrap self-cleans.
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { inArray, like } from "drizzle-orm";

import { db } from "../src/db/client";
import { memberships, userPreferences } from "../src/db/schema";
import { signInAsOwner } from "./support/sign-in";

const CAPTURE_DIR = join(__dirname, "..", "..", "notes", "m16-captures");
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m16cap-owner-${RUN}@example.com`;
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

async function captureAcrossViewports(page: Page, slug: string) {
  await freezeMotion(page);
  for (const { w, h } of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    await page.screenshot({ path: join(CAPTURE_DIR, `${slug}-${w}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function cleanupRows() {
  const owners = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M16CAP %"));
  if (owners.length) {
    await db
      .delete(userPreferences)
      .where(inArray(userPreferences.userId, owners.map((o) => o.userId)));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E M16CAP %"));
}

test.beforeAll(async () => {
  mkdirSync(CAPTURE_DIR, { recursive: true });
  await cleanupRows();
});

test.afterAll(async () => {
  await cleanupRows();
});

test.describe.serial("M16 — capture rig", () => {
  test("owner bootstrap", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M16CAP Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("/insights at 1920/1440/1280 (+ 30d state + the OO reference)", async ({ page }) => {
    test.setTimeout(600_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);

    await page.goto("/insights", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "How you’re shipping." })).toBeVisible({
      timeout: 30_000,
    });
    await captureAcrossViewports(page, "insights-12w");

    await page.goto("/insights?range=30d", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Insights · last 30 days")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(500);
    await freezeMotion(page);
    await page.screenshot({
      path: join(CAPTURE_DIR, "insights-30d-1440.png"),
      fullPage: true,
    });

    // the byte-locked variant reference at the canonical width
    await page.goto("/dev-variants/oo", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await freezeMotion(page);
    await page.screenshot({ path: join(CAPTURE_DIR, "variant-oo-1440.png"), fullPage: true });
  });
});
