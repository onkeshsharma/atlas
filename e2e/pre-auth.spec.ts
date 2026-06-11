// M5 — pre-auth e2e (charter §4): REAL Neon Auth flows end to end —
// owner sign-up → welcome, sign-out, wrong-password §2.13 render,
// signed-out guard redirect, seeded-invite accept → onboarding — plus
// fidelity captures of all six surfaces at 1920/1440/1280 into
// ../notes/m5-captures/. Self-cleaning: every row this suite creates
// carries the "E2E " display-name marker and is deleted in afterAll.
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { inArray, like } from "drizzle-orm";

// .env.local is loaded by playwright.config.ts before specs import.
import { db } from "../src/db/client";
import { invites, memberships } from "../src/db/schema";
import { issueInvite } from "../src/domain/auth/invites";

const CAPTURE_DIR = join(__dirname, "..", "..", "notes", "m5-captures");
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-owner-${RUN}@example.com`;
const COLLAB_PASSWORD = "editorial-register-16";
const seededInviteIds: string[] = [];

/** the three fidelity viewports (master plan §5 / PRD). */
const VIEWPORTS = [
  { w: 1920, h: 1080 },
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
];

async function captureAcrossViewports(page: Page, slug: string) {
  // animate-ping never settles — freeze animations (M4 pattern).
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; }",
  });
  for (const { w, h } of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    await page.screenshot({
      path: join(CAPTURE_DIR, `${slug}-${w}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

test.beforeAll(async () => {
  // self-heal from any crashed previous run: clear E2E-marked rows so the
  // one-owner invariant can't strand the bootstrap flow.
  await db.delete(memberships).where(like(memberships.displayName, "E2E %"));
  await db.delete(invites).where(like(invites.email, "e2e-%@example.com"));
});

test.afterAll(async () => {
  await db.delete(memberships).where(like(memberships.displayName, "E2E %"));
  if (seededInviteIds.length) {
    await db.delete(invites).where(inArray(invites.id, seededInviteIds));
  }
  await db.delete(invites).where(like(invites.email, "e2e-%@example.com"));
});

test.describe.serial("owner arc: sign-up → welcome → setup → sign-out → sign-in", () => {
  test("guard: signed-out /welcome bounces to /sign-in", async ({ page }) => {
    await page.goto("/welcome");
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole("heading", { name: "Atlas." })).toBeVisible();
  });

  test("sign-up with a wrong owner code renders the §2.13 field error", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(COLLAB_PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill("ATLAS-OWNER-wrong");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText("that owner code isn't right")).toBeVisible();
    // §2.13 — the failed field's underline turns rose and persists.
    await expect(page.getByPlaceholder("ATLAS-OWNER-...")).toHaveClass(/border-rose-500/);
  });

  test("owner walkthrough: sign-up → welcome → setup → sign-out → wrong password → sign-in", async ({
    page,
  }) => {
    test.setTimeout(240_000);

    // ── sign-up with the real owner code → Welcome ──
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(COLLAB_PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Welcome, E2E\./ })).toBeVisible();
    await captureAcrossViewports(page, "welcome");

    // ── setup wizard renders with honest pending Bridge states ──
    await page.goto("/setup");
    await expect(page.getByRole("heading", { name: "Install your Bridge." })).toBeVisible();
    await expect(page.getByText("Waiting for first heartbeat")).toBeVisible();
    await expect(page.getByText("token preview")).toBeVisible();
    await captureAcrossViewports(page, "setup");

    // ── sign-out actually clears the session ──
    await page.goto("/welcome");
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/sign-in/);
    await page.goto("/welcome"); // the cookie is gone, not just the URL
    await expect(page).toHaveURL(/\/sign-in/);

    // ── wrong password → §2.13 form-level line, no alerts, no toasts ──
    await page.goto("/sign-in");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("••••••••").fill("not-the-password");
    await page.getByRole("button", { name: /^sign in/i }).click();
    await expect(page.getByText("wrong email or password")).toBeVisible();
    await page.screenshot({
      path: join(CAPTURE_DIR, "walkthrough-sign-in-error-1440.png"),
      fullPage: true,
    });

    // ── right password → back to Welcome ──
    // (React 19 resets uncontrolled fields after the failed action — refill both)
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("••••••••").fill(COLLAB_PASSWORD);
    await page.getByRole("button", { name: /^sign in/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Welcome, E2E\./ })).toBeVisible();
  });

  test("invite accept: seeded magic link → account → onboarding", async ({ page }) => {
    const { invite } = await issueInvite({
      email: `e2e-ada-${RUN}@example.com`,
      invitedBy: "e2e-issuer",
      invitedName: "ada",
      welcomeNote:
        "Welcome aboard. File bugs on the checkout flow; most things ship within a day or two.",
    });
    seededInviteIds.push(invite.id);

    await page.goto(`/invite/${invite.token}`);
    await expect(page.getByRole("heading", { name: /Hi, ada\./ })).toBeVisible();
    await expect(page.getByText("What you won’t see")).toBeVisible();
    await captureAcrossViewports(page, "invite");

    await page.getByRole("button", { name: /accept invite/i }).click();
    await expect(page).toHaveURL(/\/sign-up\?invite=/);
    // §2.13 success state — token validated, email locked to the invite's.
    await expect(page.getByText(`✓ invite for e2e-ada-${RUN}@example.com`)).toBeVisible();
    await captureAcrossViewports(page, "sign-up-invite");

    await page.getByPlaceholder("What Collaborators will see").fill("E2E Ada");
    await page.getByPlaceholder("At least 12 characters").fill(COLLAB_PASSWORD);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
    await expect(page.getByText("✓ accepted")).toBeVisible();

    // step 03 is REAL — save a profile edit and see the §2.13 success line.
    await page.getByPlaceholder("@you").fill("@ada");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText("✓ saved")).toBeVisible();
    await captureAcrossViewports(page, "onboarding");

    // a claimed link can't be used again.
    await page.goto(`/invite/${invite.token}`);
    await expect(
      page.getByRole("heading", { name: "This invite was already used." }),
    ).toBeVisible();
  });
});

test.describe("public surfaces — render + captures", () => {
  test("sign-in at three viewports", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Atlas." })).toBeVisible();
    await captureAcrossViewports(page, "sign-in");
  });

  test("sign-up (owner-code form) at three viewports", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { name: "Begin." })).toBeVisible();
    await expect(page.getByText("Owner code", { exact: true })).toBeVisible();
    await captureAcrossViewports(page, "sign-up");
  });

  test("invalid invite token renders the §2.17 page empty state", async ({ page }) => {
    await page.goto("/invite/inv_not-a-real-token");
    await expect(
      page.getByRole("heading", { name: "This invite link isn't valid." }),
    ).toBeVisible();
    await page.screenshot({
      path: join(CAPTURE_DIR, "invite-invalid-1440.png"),
      fullPage: true,
    });
  });
});
