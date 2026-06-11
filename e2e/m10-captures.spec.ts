// M10 — convergence captures (master plan §5.5–5.6): the six settings
// surfaces at 1920/1440/1280 beside their /dev-variants renders, into
// notes/m10-captures/. Static fixture rows (healthy bridge with a real
// doctor verdict shape + two api tokens); the XX show-once panel is
// captured live by generating a real token mid-spec. Self-cleaning.
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { eq, like, sql } from "drizzle-orm";

import { db } from "../src/db/client";
import {
  apiTokens,
  bridges,
  feedEvents,
  memberships,
  notificationPreferences,
  userPreferences,
} from "../src/db/schema";

const CAPTURE_DIR = join(__dirname, "..", "..", "notes", "m10-captures");
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m10cap-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const BRIDGE_NAME = "e2e-m10cap-desktop";

const VIEWPORTS = [
  { w: 1920, h: 1080 },
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
];

async function freshHeartbeat() {
  await db
    .update(bridges)
    .set({ lastHeartbeatAt: new Date() })
    .where(eq(bridges.name, BRIDGE_NAME));
}

async function captureAcrossViewports(page: Page, slug: string) {
  await page.mouse.move(0, 0);
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; }",
  });
  for (const { w, h } of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    await page.screenshot({ path: join(CAPTURE_DIR, `${slug}-${w}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function cleanupRows() {
  const mine = await db
    .select({ id: bridges.id })
    .from(bridges)
    .where(like(bridges.name, "e2e-m10cap-%"));
  for (const b of mine) {
    await db.execute(sql`delete from feed_events where payload->>'bridgeId' = ${b.id}`);
  }
  await db.delete(feedEvents).where(like(feedEvents.summary, "e2e-m10cap-%"));
  await db.delete(bridges).where(like(bridges.name, "e2e-m10cap-%"));
  await db.delete(apiTokens).where(like(apiTokens.name, "e2e-m10cap %"));
  const owners = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M10CAP %"));
  for (const o of owners) {
    await db.delete(userPreferences).where(eq(userPreferences.userId, o.userId));
    await db
      .delete(notificationPreferences)
      .where(eq(notificationPreferences.userId, o.userId));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E M10CAP %"));
}

test.beforeAll(async () => {
  mkdirSync(CAPTURE_DIR, { recursive: true });
  await cleanupRows();

  // a healthy bridge with a real-shaped doctor verdict for N's render
  const doctor = {
    ranAt: new Date().toISOString(),
    version: "2.0.0-m9",
    engine: "fake",
    lockPort: 9230,
    checks: [
      { key: "atlas-sync", label: "Atlas reachable · auth + DB round-trip", status: "pass", detail: "cap 2 · 0 queued" },
      { key: "git", label: "git available", status: "pass", detail: "git version 2.49.0" },
      { key: "gh", label: "GitHub CLI auth", status: "pass", detail: "authenticated" },
      { key: "worktrees", label: "kept worktrees", status: "pass", detail: "no stale worktrees on disk" },
      { key: "lock", label: "single-instance lock", status: "pass", detail: "127.0.0.1:9230 held by pid 4242" },
      { key: "engine", label: "Engine flavor", status: "pass", detail: "fake engine (suite mode) — nothing to probe" },
    ],
  };
  await db.insert(bridges).values({
    name: BRIDGE_NAME,
    tokenHash: createHash("sha256")
      .update(`cap-${randomBytes(8).toString("hex")}`, "utf8")
      .digest("hex"),
    capabilities: { version: "2.0.0-m9", engine: "fake", busyRunIds: [], cap: 2, node: "v24.13.0", platform: "win32" },
    lastHeartbeatAt: new Date(),
    doctor,
    seeded: false,
  });
  const t = () => `atp_${randomBytes(24).toString("hex")}`;
  const tok1 = t();
  const tok2 = t();
  await db.insert(apiTokens).values([
    {
      name: "e2e-m10cap ci-runner · github-actions",
      tokenHash: createHash("sha256").update(tok1).digest("hex"),
      prefix: `${tok1.slice(0, 8)}…`,
      scopes: ["tickets:read"],
      expiresAt: new Date(Date.now() + 71 * 86_400_000),
      seeded: false,
    },
    {
      name: "e2e-m10cap personal · cli scripts",
      tokenHash: createHash("sha256").update(tok2).digest("hex"),
      prefix: `${tok2.slice(0, 8)}…`,
      scopes: ["*"],
      expiresAt: new Date(Date.now() + 43 * 86_400_000),
      seeded: false,
    },
  ]);
});

test.afterAll(async () => {
  await cleanupRows();
});

test.describe.serial("M10 — capture rig", () => {
  test("owner bootstrap", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M10CAP Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("capture the six surfaces at 1920/1440/1280 (+ the live show-once panel)", async ({
    page,
  }) => {
    test.setTimeout(600_000);
    await page.goto("/sign-in");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.getByRole("button", { name: /^sign in/i }).click();
    await expect(page).toHaveURL(/\/today/, { timeout: 30_000 });

    const surfaces: Array<[string, string]> = [
      ["settings", "/settings"],
      ["bridges", "/settings/bridges"],
      ["tokens", "/settings/tokens"],
      ["account", "/settings/account"],
      ["notifications", "/settings/notifications"],
      ["profile", "/settings/profile"],
    ];
    for (const [slug, path] of surfaces) {
      await freshHeartbeat();
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      await captureAcrossViewports(page, slug);
    }

    // the XX centrepiece: a REAL show-once panel (then revoke the evidence)
    await page.goto("/settings/tokens", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("ci-runner · github-actions").fill("e2e-m10cap show-once");
    await page.getByRole("button", { name: /generate token/i }).click();
    await expect(page.getByText("Token just created · copy it now")).toBeVisible({
      timeout: 30_000,
    });
    await page.mouse.move(0, 0);
    await page.addStyleTag({
      content: "*, *::before, *::after { animation: none !important; }",
    });
    await page.screenshot({ path: join(CAPTURE_DIR, "tokens-show-once-1440.png") });

    // variant references at the canonical width
    for (const key of ["h", "n", "xx", "bb", "cc", "qq"]) {
      await page.goto(`/dev-variants/${key}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      await page.mouse.move(0, 0);
      await page.addStyleTag({
        content: "*, *::before, *::after { animation: none !important; }",
      });
      await page.screenshot({
        path: join(CAPTURE_DIR, `variant-${key}-1440.png`),
        fullPage: true,
      });
    }
  });
});
