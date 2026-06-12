// M15 — system pages, end to end (charter done criterion 1):
// unknown routes render variant X's 404 for every audience (visitor
// without the authed shell, Owner with the real sidebar and nothing
// active), in-group notFound() bubbles to the SAME boundary without
// doubling the shell, the dev-gated boom renders variant ZZ's 500 with
// the real /status cross-link and a reset() that genuinely re-renders,
// and the JJ confirm arms only on the exact name — including the
// Enter-to-confirm made real in M15. Self-cleaning owner bootstrap.
import { expect, test, type Page } from "@playwright/test";

import { signInAsOwner } from "./support/sign-in";
import { inArray, like } from "drizzle-orm";

import { db } from "../src/db/client";
import { apiTokens, memberships, userPreferences } from "../src/db/schema";

const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m15-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const TOKEN_LABEL = `e2e-m15 token ${RUN}`;

/** Next dev-tools indicator (<nextjs-portal>) overlaps bottom-left UI
 * and shades error pages in dev — hide it (the m6 idiom). */
async function hideDevOverlay(page: Page) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
}

async function cleanupRows() {
  await db.delete(apiTokens).where(like(apiTokens.name, "e2e-m15 %"));
  const owners = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M15 %"));
  if (owners.length) {
    await db
      .delete(userPreferences)
      .where(inArray(userPreferences.userId, owners.map((o) => o.userId)));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E M15 %"));
}

test.beforeAll(async () => {
  await cleanupRows();
});

test.afterAll(async () => {
  await cleanupRows();
});

test.describe.serial("M15 — the system's bad days stay in register", () => {
  test("404 for visitors: X without the authed shell, public rows, real Tried path", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const response = await page.goto("/zzz-no-such-page");
    expect(response?.status()).toBe(404);

    await expect(page.getByText("404 · Not found")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Not here." })).toBeVisible();

    // visitor rows — the public destinations, all real
    await expect(page.getByText("The landing page")).toBeVisible();
    await expect(page.getByText("The docs")).toBeVisible();
    await expect(page.locator('a[href="/status"]')).toBeVisible();

    // no faked authed shell for visitors (HANDOFF-M14 decision 1)
    await expect(page.locator("aside")).toHaveCount(0);

    // X:114–120 — the Tried: detail carries the real path
    await expect(page.getByText("/zzz-no-such-page")).toBeVisible();

    // the docs tier's notFound() lands on the same boundary (HANDOFF-M14)
    await page.goto("/docs/zzz-unknown-article");
    await expect(page.getByRole("heading", { name: "Not here." })).toBeVisible();

    // a visitor row resolves for real
    await page.goto("/zzz-no-such-page");
    await page.getByText("The docs").click();
    await expect(page).toHaveURL(/\/docs$/);
  });

  test("owner bootstrap", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M15 Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("404 for the Owner: the real sidebar with nothing active; rows resolve", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);

    const response = await page.goto("/zzz-no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Not here." })).toBeVisible();

    // the REAL shell rail — exactly one, nothing active (X:13–44:
    // "we're nowhere", so no amber underline anywhere in the nav)
    await expect(page.locator("aside")).toHaveCount(1);
    await expect(page.locator("aside nav .bg-amber-500")).toHaveCount(0);

    // owner rows — Today / Projects / file-a-ticket; no visitor rows
    await expect(page.getByText("Today.", { exact: true })).toBeVisible();
    await expect(page.getByText("Open a Project")).toBeVisible();
    await expect(page.getByText("File a Ticket about this broken link")).toBeVisible();
    await expect(page.getByText("The landing page")).toHaveCount(0);

    // an in-group notFound() (unknown ticket ref) bubbles to the SAME
    // boundary without doubling the shell
    await page.goto("/tickets/T-99999");
    await expect(page.getByRole("heading", { name: "Not here." })).toBeVisible();
    await expect(page.locator("aside")).toHaveCount(1);
    await expect(page.getByText("/tickets/T-99999")).toBeVisible();

    // "go home →" resolves to Today
    await hideDevOverlay(page);
    await page.getByText("Today.", { exact: true }).click();
    await expect(page).toHaveURL(/\/today/);
  });

  test("500: the boom renders ZZ; /status is the real cross-link; reset() re-renders", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await page.goto("/dev-boom");
    await hideDevOverlay(page);

    // variant ZZ's moments — rose kicker, text-4xl apology, the numeral
    await expect(page.getByText("Something broke on our side")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: "We’re sorry." })).toBeVisible();
    await expect(page.getByText("500", { exact: true })).toBeVisible();
    await expect(page.getByText("Atlas · 500 · unexpected error")).toBeVisible();

    // honest What-we-know: a server error carries a real digest
    await expect(page.getByText("Error ID", { exact: true })).toBeVisible();
    await expect(page.getByText("/dev-boom").first()).toBeVisible();

    // the REAL /status cross-link (HANDOFF-M14's named seam)
    await expect(page.getByRole("link", { name: "full status →" })).toHaveAttribute(
      "href",
      "/status",
    );
    await page.getByRole("link", { name: "full status →" }).click();
    await expect(page).toHaveURL(/\/status/);
    await expect(page.getByText("Status", { exact: false }).first()).toBeVisible();

    // reset() is real: land on the boom, THEN defuse, then Try again —
    // the boundary genuinely re-renders the same route (not decorative)
    await page.goto("/dev-boom");
    await hideDevOverlay(page);
    await expect(page.getByText("Something broke on our side")).toBeVisible({
      timeout: 30_000,
    });
    await context.addCookies([
      { name: "atlas_dev_boom_defused", value: "1", url: page.url() },
    ]);
    await page.getByRole("button", { name: "Try again →" }).click();
    await expect(page.getByText("boom defused — this render completed.")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("JJ on a real destructive action: arming, Enter-to-confirm, the row dies", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
    await page.goto("/settings/tokens");

    // a real token to destroy
    await page.getByPlaceholder("ci-runner · github-actions").fill(TOKEN_LABEL);
    await page.getByRole("button", { name: /generate token/i }).click();
    await expect(page.getByText("Token just created · copy it now")).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: "I’ve copied it →" }).click();

    // open the JJ confirm — full §2.11 chrome
    const tokenRow = page.locator("li", { hasText: TOKEN_LABEL });
    await tokenRow.getByRole("button", { name: "revoke", exact: true }).click();
    await expect(page.getByText("● Permanent · cannot be undone")).toBeVisible();
    await expect(page.getByRole("heading", { name: `Revoke ${TOKEN_LABEL}?` })).toBeVisible();
    await expect(page.getByText("What goes away")).toBeVisible();
    await expect(page.getByText("⏎ to confirm")).toBeVisible();

    // arms only on the exact name
    const confirm = page.getByRole("button", { name: /revoke forever/i });
    await expect(confirm).toBeDisabled();
    await page.getByPlaceholder(TOKEN_LABEL).fill("not-the-name");
    await expect(confirm).toBeDisabled();

    // esc cancels; nothing died
    await page.keyboard.press("Escape");
    await expect(confirm).toHaveCount(0);
    await expect(tokenRow.getByText("active")).toBeVisible();

    // re-open; the ⏎ hint is REAL (M15): exact name + Enter confirms
    await tokenRow.getByRole("button", { name: "revoke", exact: true }).click();
    await page.getByPlaceholder(TOKEN_LABEL).fill(TOKEN_LABEL);
    await expect(page.getByRole("button", { name: /revoke forever/i })).toBeEnabled();
    await page.getByPlaceholder(TOKEN_LABEL).press("Enter");
    await expect(tokenRow.getByText("revoked", { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
