// BPI — Install experience e2e (charter done criterion 3: scope §6):
//   1. GET /install.ps1 returns 200 text/plain with the instance origin
//      interpolated and NO secrets.
//   2. GET /install.sh returns 200 text/plain with the instance origin
//      interpolated and NO secrets.
//   3. /settings/bridges (unpaired) renders the install one-liner,
//      the SmartScreen note, and the download fallback.
//   4. /docs/connect-your-machine renders with every TOC anchor resolving
//      in the body (M14 law).
//
// Self-cleaning: the spec creates a fresh Owner account in beforeAll
// (sign-up) and removes all membership rows in afterAll.
// Marker: "E2E BPI" in displayName (beforeAll self-heal deletes any
// leftover rows from a previous crashed run).
//
// Port: 3980 (ATLAS_E2E_PORT in .env.local for the bpi worktree).

import { expect, test } from "@playwright/test";
import { eq, like } from "drizzle-orm";

// .env.local is loaded by playwright.config.ts before specs import.
import { db } from "../src/db/client";
import { memberships, userPreferences } from "../src/db/schema";
import { signInAsOwner } from "./support/sign-in";

const E2E_PORT = Number(process.env.ATLAS_E2E_PORT ?? 3100);
const BASE = `http://localhost:${E2E_PORT}`;
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-bpi-${RUN}@example.com`;
const PASSWORD = "editorial-register-bpi-16";

async function cleanupRows() {
  const rows = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E BPI%"));
  for (const r of rows) {
    await db.delete(userPreferences).where(eq(userPreferences.userId, r.userId));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E BPI%"));
}

test.beforeAll(async () => {
  // self-heal from a crashed previous run (one-Owner invariant)
  await cleanupRows();
});

test.afterAll(async () => {
  await cleanupRows();
});

// ── Install script routes — public, no auth ───────────────────────────────

test.describe("install script routes", () => {
  test("GET /install.ps1 returns 200 text/plain", async ({ request }) => {
    const response = await request.get(`${BASE}/install.ps1`);
    expect(response.status()).toBe(200);
    const ct = response.headers()["content-type"] ?? "";
    expect(ct).toContain("text/plain");
  });

  test("GET /install.ps1 — origin interpolated, no ATLAS_ORIGIN placeholder remains", async ({
    request,
  }) => {
    const response = await request.get(`${BASE}/install.ps1`);
    const body = await response.text();
    // The raw placeholder string must be gone
    expect(body).not.toContain("ATLAS_ORIGIN");
    // The origin must appear (localhost in e2e)
    expect(body).toContain("localhost");
  });

  test("GET /install.ps1 contains no baked-in secrets", async ({ request }) => {
    const response = await request.get(`${BASE}/install.ps1`);
    const body = await response.text();
    expect(body).not.toMatch(/ATLAS_BRIDGE_TOKEN/i);
    expect(body).not.toMatch(/DATABASE_URL/i);
    expect(body).not.toMatch(/AUTH_SECRET/i);
    expect(body).not.toMatch(/NEON_/i);
    expect(body).not.toContain("GITHUB_REPO_SLUG");
  });

  test("GET /install.sh returns 200 text/plain", async ({ request }) => {
    const response = await request.get(`${BASE}/install.sh`);
    expect(response.status()).toBe(200);
    const ct = response.headers()["content-type"] ?? "";
    expect(ct).toContain("text/plain");
  });

  test("GET /install.sh — origin interpolated, no ATLAS_ORIGIN placeholder remains", async ({
    request,
  }) => {
    const response = await request.get(`${BASE}/install.sh`);
    const body = await response.text();
    expect(body).not.toContain("ATLAS_ORIGIN");
    expect(body).toContain("localhost");
  });

  test("GET /install.sh contains no baked-in secrets", async ({ request }) => {
    const response = await request.get(`${BASE}/install.sh`);
    const body = await response.text();
    expect(body).not.toMatch(/ATLAS_BRIDGE_TOKEN/i);
    expect(body).not.toMatch(/DATABASE_URL/i);
    expect(body).not.toMatch(/AUTH_SECRET/i);
    expect(body).not.toMatch(/NEON_/i);
    expect(body).not.toContain("GITHUB_REPO_SLUG");
  });
});

// ── /settings/bridges unpaired first-run ─────────────────────────────────

test.describe.serial("/settings/bridges first-run (no bridges paired)", () => {
  test("owner bootstrap", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E BPI Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("renders the install one-liner and SmartScreen note", async ({ page }) => {
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
    await page.goto("/settings/bridges");
    await expect(page.getByRole("heading", { name: "Bridges." })).toBeVisible();

    // AmberPanel first-run kicker
    await expect(
      page.getByText("Connect your first machine", { exact: false }),
    ).toBeVisible();

    // One-liner is shown (Windows default — install.ps1 | iex)
    await expect(page.getByText(/install\.ps1/)).toBeVisible();

    // SmartScreen honest note (mandatory per ADR-0005 §3)
    await expect(page.getByText(/Windows will say it doesn/)).toBeVisible();
    await expect(page.getByText("More info")).toBeVisible();
    await expect(page.getByText("Run anyway")).toBeVisible();

    // Download fallback link
    await expect(page.getByRole("link", { name: "GitHub Releases ↗" })).toBeVisible();

    // Doc link to connect-your-machine
    await expect(page.getByRole("link", { name: "Full setup guide →" })).toHaveAttribute(
      "href",
      "/docs/connect-your-machine",
    );
  });

  test("BP2 click-to-pair paths remain intact below the first-run section", async ({ page }) => {
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
    await page.goto("/settings/bridges");

    // BP2 click-to-pair story (ADR-0004 §4) must still be visible
    await expect(page.getByText("Click-to-pair", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("atlas-bridge pair", { exact: false }).first()).toBeVisible();
  });
});

// ── /docs/connect-your-machine — TOC anchors resolve ─────────────────────

test.describe("/docs/connect-your-machine", () => {
  test("renders the article with all TOC anchors in the body (M14 law)", async ({ page }) => {
    const response = await page.goto("/docs/connect-your-machine");
    expect(response!.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Connect your machine." })).toBeVisible();

    // Every toc[].id must appear as section#id in the body
    const tocAnchors = [
      "what-is-the-bridge",
      "the-one-liner",
      "smartscreen",
      "approve-in-the-browser",
      "how-to-tell-it-worked",
      "stop-and-uninstall",
    ];
    for (const id of tocAnchors) {
      await expect(page.locator(`section#${id}`), `section#${id} must be in body`).toBeVisible();
    }
  });

  test("smartscreen section has honest unsigned-binary copy", async ({ page }) => {
    await page.goto("/docs/connect-your-machine");
    await expect(page.locator("section#smartscreen")).toContainText("not yet code-signed");
    await expect(page.locator("section#smartscreen")).toContainText("More info");
    await expect(page.locator("section#smartscreen")).toContainText("Run anyway");
  });

  test("appears in Getting started section of the docs index", async ({ page }) => {
    await page.goto("/docs");
    const link = page.getByRole("link", { name: "Connect your machine" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/docs/connect-your-machine");
  });
});
