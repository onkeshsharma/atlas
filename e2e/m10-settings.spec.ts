// M10 — the settings tier, end to end (charter done criterion 2):
// preferences (real sidebar pref + pin/unpin), API tokens (show-once
// visible exactly once, rotate, revoke), notification prefs persisting
// across reloads, profile §2.13 validation + save, account sessions,
// and the danger zone's type-to-confirm REALLY deleting the account
// (the Owner slot frees — proven by landing back on the sign-up gate).
// Self-cleaning: the delete-account test IS most of the cleanup.
import { expect, test, type Page } from "@playwright/test";

import { signInAsOwner } from "./support/sign-in";
import { eq, like } from "drizzle-orm";

import { db } from "../src/db/client";
import {
  apiTokens,
  feedEvents,
  memberships,
  notificationPreferences,
  projects,
  userPreferences,
} from "../src/db/schema";

const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m10s-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const PROJECT_NAME = `E2E m10s pinnable ${RUN}`;
const TOKEN_LABEL = `e2e-m10s token ${RUN}`;

async function signIn(page: Page) {
  // M10 — retry discipline lives in the shared helper (e2e/support/sign-in.ts)
  await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
}

async function cleanupRows() {
  await db.delete(apiTokens).where(like(apiTokens.name, "e2e-m10s %"));
  const mine = await db
    .select({ id: projects.id })
    .from(projects)
    .where(like(projects.name, "E2E m10s %"));
  if (mine.length) {
    await db.delete(feedEvents).where(eq(feedEvents.projectId, mine[0].id));
    await db.delete(projects).where(eq(projects.id, mine[0].id));
  }
  const owners = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M10S %"));
  for (const o of owners) {
    await db.delete(userPreferences).where(eq(userPreferences.userId, o.userId));
    await db
      .delete(notificationPreferences)
      .where(eq(notificationPreferences.userId, o.userId));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E M10S %"));
}

test.beforeAll(async () => {
  await cleanupRows();
  await db.insert(projects).values({
    name: PROJECT_NAME,
    slug: `e2e-m10s-${RUN}`,
    pinned: false,
    seeded: false,
  });
});

test.afterAll(async () => {
  await cleanupRows();
});

test.describe.serial("M10 — the settings tier is real", () => {
  test("owner bootstrap + the Settings nav item is live", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M10S Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });

    await page.goto("/today");
    // the M10 nav claim: S routes to /settings (no more "soon")
    await page.locator('a[href="/settings"]').click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { name: "Preferences." })).toBeVisible();
  });

  test("preferences: pin a project for real; the pref saves as you go", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page);
    await page.goto("/settings");

    await page.getByText("+ pin a project").click();
    const pinRow = page.locator("li", { hasText: PROJECT_NAME });
    await pinRow.getByRole("button", { name: "pin →" }).click();

    // the pinned list now carries it with the ★ and a real unpin
    const pinned = page.locator("li", { hasText: PROJECT_NAME }).filter({
      has: page.getByRole("button", { name: "unpin →" }),
    });
    await expect(pinned).toBeVisible({ timeout: 30_000 });
    const [row] = await db.select().from(projects).where(eq(projects.name, PROJECT_NAME));
    expect(row.pinned).toBe(true);

    await pinned.getByRole("button", { name: "unpin →" }).click();
    await expect(pinned).toHaveCount(0, { timeout: 30_000 });
  });

  test("tokens: show-once exactly once, prefix-only at rest, rotate + revoke", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await signIn(page);
    await page.goto("/settings/tokens");

    // create with a non-default scope set + expiry
    await page.getByPlaceholder("ci-runner · github-actions").fill(TOKEN_LABEL);
    await page.getByRole("button", { name: "tickets:write" }).click();
    await page.getByRole("button", { name: "30 days" }).click();
    await page.getByRole("button", { name: /generate token/i }).click();

    await expect(page.getByText("Token just created · copy it now")).toBeVisible({
      timeout: 30_000,
    });
    const secret = (await page.locator(".select-all").first().textContent())!.trim();
    expect(secret).toMatch(/^atp_[0-9a-f]{48}$/);

    // gone on reload — only the prefix survives, in the row
    await page.reload();
    await expect(page.getByText("Token just created · copy it now")).toHaveCount(0);
    await expect(page.getByText(secret)).toHaveCount(0);
    const tokenRow = page.locator("li", { hasText: TOKEN_LABEL });
    await expect(tokenRow.getByText(`${secret.slice(0, 8)}…`)).toBeVisible();
    await expect(tokenRow.getByText("scope · tickets:read · tickets:write")).toBeVisible();
    await expect(tokenRow.getByText("in 30 days")).toBeVisible();
    await expect(tokenRow.getByText("last used never")).toBeVisible(); // honest: no consumer

    // rotate: a NEW secret shows once; the old hash is dead
    const [before] = await db.select().from(apiTokens).where(eq(apiTokens.name, TOKEN_LABEL));
    await tokenRow.getByRole("button", { name: "rotate →" }).click();
    await expect(page.getByText("Token just created · copy it now")).toBeVisible({
      timeout: 30_000,
    });
    const rotated = (await page.locator(".select-all").first().textContent())!.trim();
    expect(rotated).not.toBe(secret);
    const [after] = await db.select().from(apiTokens).where(eq(apiTokens.name, TOKEN_LABEL));
    expect(after.id).toBe(before.id);
    expect(after.tokenHash).not.toBe(before.tokenHash);

    // revoke: the governance row stays, marked
    await page.getByRole("button", { name: "I’ve copied it →" }).click();
    await tokenRow.getByRole("button", { name: "revoke", exact: true }).click();
    await expect(tokenRow.getByText("revoked", { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });
    const [revoked] = await db.select().from(apiTokens).where(eq(apiTokens.name, TOKEN_LABEL));
    expect(revoked.revokedAt).not.toBeNull();
  });

  test("notifications: prefs persist across a reload; quiet hours validate", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page);
    await page.goto("/settings/notifications");

    // flip an event toggle
    const eventRow = page.locator("li", { hasText: "State changed" });
    await eventRow.getByRole("button", { name: "On", exact: true }).click();

    // frequency
    await page.getByRole("button", { name: "Weekly digest" }).click();

    // quiet hours — invalid first (§2.13 message), then valid
    await page.getByPlaceholder("22:00").fill("9pm");
    await page.getByPlaceholder("08:00").fill("08:00");
    await page.getByRole("button", { name: /save window/i }).click();
    await expect(page.getByText("times are 24-hour HH:MM")).toBeVisible({ timeout: 30_000 });
    await page.getByPlaceholder("22:00").fill("21:30");
    await page.getByRole("button", { name: /save window/i }).click();
    await expect(page.getByText("✓ saved")).toBeVisible({ timeout: 30_000 });

    await page.reload();
    await expect(page.getByPlaceholder("22:00")).toHaveValue("21:30");
    const weekly = page.getByRole("button", { name: "Weekly digest" });
    await expect(weekly).toHaveClass(/bg-stone-900/);
    await expect(
      eventRow.getByRole("button", { name: "On", exact: true }),
    ).toHaveClass(/bg-stone-900/);
  });

  test("profile: §2.13 validation blocks, a clean save lands + updates the record", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page);
    await page.goto("/settings/profile");

    const initialRow = page.locator("div.py-5", { hasText: "Initial" }).first();
    await initialRow.getByRole("button", { name: "edit →" }).click();
    await initialRow.locator('input[name="value"]').fill("42");
    await initialRow.getByRole("button", { name: "Save →" }).click();
    await expect(
      initialRow.getByText("one letter — it is a typographic mark"),
    ).toBeVisible({ timeout: 30_000 });

    await initialRow.locator('input[name="value"]').fill("Q");
    await initialRow.getByRole("button", { name: "Save →" }).click();
    await expect(initialRow.getByText("✓ saved")).toBeVisible({ timeout: 30_000 });

    const [member] = await db
      .select()
      .from(memberships)
      .where(like(memberships.displayName, "E2E M10S %"));
    expect(member.initial).toBe("q"); // stored lowercase (the sidebar mark)

    // the rail monogram renders it uppercase (QQ:287)
    await expect(page.locator(".h-28.w-28").getByText("Q", { exact: true })).toBeVisible();
  });

  test("account: real session list + the danger zone REALLY deletes (type-to-confirm)", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await signIn(page);
    await page.goto("/settings/account");

    // the real session list shows this device
    await expect(page.getByText("this device")).toBeVisible();
    await expect(page.getByText("Two-factor")).toBeVisible();
    await expect(page.locator("li", { hasText: "Two-factor" }).getByText("soon")).toBeVisible();

    // open the §2.11 confirm; the button arms only on the exact name
    await page.getByRole("button", { name: /delete my account/i }).click();
    const confirm = page.getByRole("button", { name: /delete forever/i });
    await expect(confirm).toBeDisabled();
    await page.getByPlaceholder(OWNER_EMAIL).fill("not-the-email");
    await expect(confirm).toBeDisabled();
    await page.getByPlaceholder(OWNER_EMAIL).fill(OWNER_EMAIL);
    await expect(confirm).toBeEnabled();
    await confirm.click();

    // signed out onto the gate; the Owner slot is FREE again
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 60_000 });
    const remaining = await db
      .select()
      .from(memberships)
      .where(like(memberships.displayName, "E2E M10S %"));
    expect(remaining).toHaveLength(0);
  });
});
