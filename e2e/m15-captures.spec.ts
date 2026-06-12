// M15 — convergence captures (master plan §5.5–5.6): X (visitor +
// Owner), ZZ, and the live JJ confirm at 1920/1440/1280 beside their
// /dev-variants renders (x + zz + jj), into notes/m15-captures/.
// Owner bootstrap self-cleans.
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { signInAsOwner } from "./support/sign-in";
import { inArray, like } from "drizzle-orm";

import { db } from "../src/db/client";
import { apiTokens, memberships, userPreferences } from "../src/db/schema";

const CAPTURE_DIR = join(__dirname, "..", "..", "notes", "m15-captures");
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m15cap-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const TOKEN_LABEL = `e2e-m15cap token ${RUN}`;

const VIEWPORTS = [
  { w: 1920, h: 1080 },
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
];

async function freezeMotion(page: Page) {
  await page.mouse.move(0, 0);
  await page.addStyleTag({
    content:
      "*, *::before, *::after { animation: none !important; } nextjs-portal { display: none !important; }",
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
  await db.delete(apiTokens).where(like(apiTokens.name, "e2e-m15cap %"));
  const owners = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M15CAP %"));
  if (owners.length) {
    await db
      .delete(userPreferences)
      .where(inArray(userPreferences.userId, owners.map((o) => o.userId)));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E M15CAP %"));
}

test.beforeAll(async () => {
  mkdirSync(CAPTURE_DIR, { recursive: true });
  await cleanupRows();
});

test.afterAll(async () => {
  await cleanupRows();
});

test.describe.serial("M15 — capture rig", () => {
  test("X visitor + ZZ at 1920/1440/1280", async ({ page }) => {
    test.setTimeout(300_000);

    // X — visitor (no shell)
    await page.goto("/zzz-capture-404", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Not here." })).toBeVisible({
      timeout: 30_000,
    });
    await captureAcrossViewports(page, "404-visitor");

    // ZZ — the genuine boundary via the dev-gated boom
    await page.goto("/dev-boom", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Something broke on our side")).toBeVisible({
      timeout: 30_000,
    });
    await captureAcrossViewports(page, "500");
  });

  test("owner bootstrap", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M15CAP Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("X owner + the live JJ confirm at 1920/1440/1280 (+ variant references)", async ({
    page,
  }) => {
    test.setTimeout(600_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);

    // X — owner (real shell rail, nothing active)
    await page.goto("/zzz-capture-404", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Not here." })).toBeVisible({
      timeout: 30_000,
    });
    await captureAcrossViewports(page, "404-owner");

    // JJ — a real destructive confirm over the tokens page
    await page.goto("/settings/tokens", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("ci-runner · github-actions").fill(TOKEN_LABEL);
    await page.getByRole("button", { name: /generate token/i }).click();
    await expect(page.getByText("Token just created · copy it now")).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: "I’ve copied it →" }).click();
    const tokenRow = page.locator("li", { hasText: TOKEN_LABEL });
    await tokenRow.getByRole("button", { name: "revoke", exact: true }).click();
    await expect(page.getByText("● Permanent · cannot be undone")).toBeVisible();
    // viewport-sized: the §2.11 overlay ghosts the page behind (JJ:43)
    await captureAcrossViewports(page, "jj-confirm", false);
    await page.keyboard.press("Escape");

    // variant references at the canonical width
    for (const key of ["x", "zz", "jj"]) {
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
