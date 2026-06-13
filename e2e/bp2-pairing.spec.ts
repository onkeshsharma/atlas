// BP2 — click-to-pair Playwright spec (charter done criterion 1 + 2).
//
// Proves (against port 3960, Neon e2e branch):
//   1. Owner approves a pair request → exactly one hashed bridges row +
//      one bridge-paired feed row → browser redirected to the loopback cb
//      with token+state+name in the query string.
//   2. Non-loopback cb → honest error screen, no mint.
//   3. Missing state → honest error screen, no mint.
//   4. Unauthenticated hit → redirect to /sign-in, no mint.
//   5. GET alone never mints (approve POST is the only mint gate).
//   6. Cancel → back on /settings/bridges, no mint.
//   7. Both pairing paths are visible on /settings/bridges.
//
// The spec stands in for the CLI's listener: instead of a real daemon
// catching the 302, we assert the redirect URL's query params and the
// DB row (the contract BP1's client half must match).
//
// Self-cleaning: rows are swept in afterAll.
import { createServer } from "node:http";

import { expect, test, type Page } from "@playwright/test";
import { eq, like, sql } from "drizzle-orm";

import { db } from "../src/db/client";
import { bridges, memberships, userPreferences } from "../src/db/schema";
import { hashBridgeToken } from "../src/domain/bridge/pairing";
import { signInAsOwner } from "./support/sign-in";

const E2E_PORT = Number(process.env.ATLAS_E2E_PORT ?? 3100);
const ATLAS_URL = `http://localhost:${E2E_PORT}`;
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-bp2-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const MACHINE_NAME = `e2e-bp2-machine-${RUN}`;

async function signIn(page: Page) {
  await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
}

async function cleanupRows() {
  await db.execute(
    sql`delete from feed_events where summary like ${"e2e-bp2-machine-%"}`,
  );
  const myBridges = await db
    .select({ id: bridges.id })
    .from(bridges)
    .where(like(bridges.name, "e2e-bp2-machine-%"));
  for (const b of myBridges) {
    await db.execute(
      sql`delete from feed_events where payload->>'bridgeId' = ${b.id}`,
    );
  }
  await db.delete(bridges).where(like(bridges.name, "e2e-bp2-machine-%"));
  const owners = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E BP2 %"));
  for (const o of owners) {
    await db.delete(userPreferences).where(eq(userPreferences.userId, o.userId));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E BP2 %"));
}

/**
 * Starts a one-shot loopback HTTP listener that captures the first request
 * to /callback. Returns a promise that resolves with the parsed query params
 * once the redirect arrives, and a cleanup function to close the server.
 *
 * The test uses Playwright's page intercept to observe the redirect URL
 * directly, so this listener is a belt-and-suspenders check (and mirrors
 * what the real CLI daemon does).
 */
function startLoopbackListener(port: number): {
  captured: Promise<Record<string, string>>;
  close: () => void;
} {
  let resolver!: (params: Record<string, string>) => void;
  const captured = new Promise<Record<string, string>>((res) => {
    resolver = res;
  });

  const server = createServer((req, res) => {
    // WHATWG URL API (avoids deprecated url.parse)
    const fullUrl = new URL(req.url ?? "/", "http://127.0.0.1");
    const params: Record<string, string> = {};
    fullUrl.searchParams.forEach((v, k) => { params[k] = v; });
    resolver(params);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<html><body><p>You can close this tab.</p></body></html>");
  });

  server.listen(port, "127.0.0.1");
  return { captured, close: () => server.close() };
}

test.beforeAll(async () => {
  await cleanupRows();
});

test.afterAll(async () => {
  await cleanupRows();
});

test.describe.serial("BP2 — click-to-pair loopback flow (ADR-0004 §4)", () => {
  test("owner bootstrap", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E BP2 Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("both pairing paths are visible on /settings/bridges", async ({ page }) => {
    await signIn(page);
    await page.goto("/settings/bridges");
    // Click-to-pair story
    await expect(
      page.getByText("Click-to-pair · for machines with a browser", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("atlas-bridge pair", { exact: false }).first(),
    ).toBeVisible();
    // Manual token story — the retained paste path
    await expect(page.getByPlaceholder("e.g. onkesh-desktop")).toBeVisible();
    await expect(page.getByRole("button", { name: /generate token/i })).toBeVisible();
  });

  test("unauthenticated hit on /settings/bridges/pair → /sign-in, no mint", async ({
    page,
  }) => {
    // Navigate without signing in — the requireOwner guard redirects.
    const pairUrl = `${ATLAS_URL}/settings/bridges/pair?name=${MACHINE_NAME}&cb=http%3A%2F%2F127.0.0.1%3A54321%2Fcallback&state=test-nonce-unauthed`;
    await page.goto(pairUrl);
    // Should land on /sign-in (requireOwner redirect chain)
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 30_000 });
    // No bridge row created
    const rows = await db
      .select()
      .from(bridges)
      .where(like(bridges.name, `${MACHINE_NAME}%`));
    expect(rows).toHaveLength(0);
  });

  test("non-loopback cb → error screen, no mint", async ({ page }) => {
    await signIn(page);
    const pairUrl = `/settings/bridges/pair?name=${encodeURIComponent(MACHINE_NAME)}&cb=http%3A%2F%2Fevil.example.com%2Fcallback&state=test-nonce-evil`;
    await page.goto(pairUrl);
    // Error screen, not the approve form
    await expect(
      page.getByText("Pairing request rejected"),
    ).toBeVisible({ timeout: 30_000 });
    // The error message contains "loopback" — use a more specific locator
    await expect(
      page.locator(".text-rose-700").getByText("loopback", { exact: false }),
    ).toBeVisible();
    // No approve button
    await expect(
      page.getByRole("button", { name: /approve pairing/i }),
    ).toHaveCount(0);
    // No mint
    const rows = await db
      .select()
      .from(bridges)
      .where(like(bridges.name, `${MACHINE_NAME}%`));
    expect(rows).toHaveLength(0);
  });

  test("missing state → error screen, no mint", async ({ page }) => {
    await signIn(page);
    const pairUrl = `/settings/bridges/pair?name=${encodeURIComponent(MACHINE_NAME)}&cb=http%3A%2F%2F127.0.0.1%3A54321%2Fcallback`;
    // state is absent
    await page.goto(pairUrl);
    await expect(
      page.getByText("Pairing request rejected"),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: /approve pairing/i }),
    ).toHaveCount(0);
    const rows = await db
      .select()
      .from(bridges)
      .where(like(bridges.name, `${MACHINE_NAME}%`));
    expect(rows).toHaveLength(0);
  });

  test("cancel → back to /settings/bridges, no mint", async ({ page }) => {
    await signIn(page);
    const state = `state-nonce-cancel-${RUN}`;
    const pairUrl = `/settings/bridges/pair?name=${encodeURIComponent(MACHINE_NAME)}&cb=http%3A%2F%2F127.0.0.1%3A54322%2Fcallback&state=${encodeURIComponent(state)}`;
    await page.goto(pairUrl);

    await expect(
      page.getByRole("button", { name: /approve pairing/i }),
    ).toBeVisible({ timeout: 30_000 });

    // Click cancel
    await page.getByRole("link", { name: /cancel/i }).click();
    await expect(page).toHaveURL(/\/settings\/bridges$/, { timeout: 30_000 });

    // No mint
    const rows = await db
      .select()
      .from(bridges)
      .where(like(bridges.name, `${MACHINE_NAME}%`));
    expect(rows).toHaveLength(0);
  });

  test("approve → exactly one bridges row + one bridge-paired feed row → redirect carries token+state+name", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await signIn(page);

    // Start a loopback listener that will receive the 302 redirect
    const cbPort = 54323;
    const { captured, close: closeListener } = startLoopbackListener(cbPort);

    const state = `state-nonce-approve-${RUN}`;
    const name = `${MACHINE_NAME}-approve`;
    const cbUrl = `http://127.0.0.1:${cbPort}/callback`;
    const pairUrl =
      `/settings/bridges/pair` +
      `?name=${encodeURIComponent(name)}` +
      `&cb=${encodeURIComponent(cbUrl)}` +
      `&state=${encodeURIComponent(state)}`;

    await page.goto(pairUrl);

    // Approve screen rendered
    await expect(
      page.getByRole("button", { name: /approve pairing/i }),
    ).toBeVisible({ timeout: 30_000 });
    // Machine name is shown (in the AmberPanel kicker/intro — may appear twice)
    await expect(page.getByText(name, { exact: false }).first()).toBeVisible();
    // Approve screen renders the AmberPanel kicker
    await expect(page.getByText("Bridge pairing request")).toBeVisible();

    // Click approve — the server action runs pairBridge + 302s to the cb
    await page.getByRole("button", { name: /approve pairing/i }).click();

    // Wait for the loopback listener to capture the redirect
    const params = await Promise.race([
      captured,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("loopback listener timed out")), 30_000),
      ),
    ]);
    closeListener();

    // ADR-0004 §4 contract: token+state+name in the redirect URL
    expect(params.token).toMatch(/^atlas-bridge-[0-9a-f]{48}$/);
    expect(params.state).toBe(state); // echoed unmodified
    expect(params.name).toBe(name);

    // DB: exactly ONE bridge row
    const bridgeRows = await db
      .select()
      .from(bridges)
      .where(like(bridges.name, name));
    expect(bridgeRows).toHaveLength(1);
    const bridgeRow = bridgeRows[0];

    // Only the hash is stored — token plaintext NEVER in DB
    expect(bridgeRow.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(bridgeRow.tokenHash).toBe(hashBridgeToken(params.token));
    expect(bridgeRow.tokenHash).not.toContain(params.token);
    expect(bridgeRow.revokedAt).toBeNull();

    // DB: exactly ONE bridge-paired feed row (THE OUTBOX RULE)
    const feedRows = await db.execute(
      sql`select kind, summary from feed_events where payload->>'bridgeId' = ${bridgeRow.id}`,
    ) as unknown as { rows: Array<{ kind: string; summary: string }> };
    expect(feedRows.rows).toHaveLength(1);
    expect(feedRows.rows[0].kind).toBe("bridge-paired");
    // Feed row carries the machine NAME, never the token (security)
    expect(feedRows.rows[0].summary).toBe(name);
    expect(feedRows.rows[0].summary).not.toContain(params.token);
  });
});
