// BP3 — TRUE two-sided pairing e2e (ADR-0004 §4 end-to-end, charter §Inherited).
//
// This is the seam BP1 + BP2 each tested against the verified-identical
// ADR-0004 §4 contract but never proved end-to-end:
//
//   authed Owner in the browser  +  REAL BP1 runPair loopback listener
//   ─────────────────────────────────────────────────────────────────────
//   1. runPair() is called with injected pickPort (returns a known free port)
//      and openBrowser (no-op that returns true + captures the pair URL).
//      runPair starts the loopback listener BEFORE calling openBrowser, so
//      the listener is live when we navigate the authed Owner to the pair URL.
//   2. This spec navigates the authed Playwright Owner to that URL.
//   3. Owner sees the approve screen (BP2 route), clicks Approve.
//   4. Atlas server-action mints the token + 302s to
//      http://127.0.0.1:<P>/callback?token=<once>&state=<nonce>&name=<machine>
//   5. The REAL runPair listener receives the callback, validates state,
//      writes token to the temp ATLAS_BRIDGE_HOME config.
//   6. Spec asserts: config file written + token present + DB row correct.
//
// Cross-package wiring (RECORDED per charter requirement):
//   The root tsconfig.json excludes packages/ because the bridge package uses
//   `allowImportingTsExtensions: true` + `moduleResolution: nodenext` which
//   conflicts with the Next.js app's `moduleResolution: bundler`. The two
//   imports below use // @ts-ignore to cross the tsc boundary; the bridge
//   package's own `tsc --noEmit -p packages/bridge` fully verifies their types.
//   At RUNTIME: Playwright uses esbuild (not tsc) to transpile e2e specs, so
//   relative .ts imports from packages/ resolve correctly.
//   This is the one accepted tsc-boundary crossing in the codebase; it is
//   scoped to this file and documented here. (2026-06-13, BP3)
//
// Self-cleaning: all seeded rows swept in afterAll.

import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import { eq, like, sql } from "drizzle-orm";

import { db } from "../src/db/client";
import { bridges, memberships, userPreferences } from "../src/db/schema";
import { hashBridgeToken } from "../src/domain/bridge/pairing";
import { signInAsOwner } from "./support/sign-in";

// Cross-package imports — see "Cross-package wiring" note above.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — bridge package excluded from root tsconfig; typed in packages/bridge
import { runPair, pickFreePort } from "../packages/bridge/src/cli/pair.ts";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — bridge package excluded from root tsconfig; typed in packages/bridge
import { readConfigFile } from "../packages/bridge/src/config-file.ts";

const E2E_PORT = Number(process.env.ATLAS_E2E_PORT ?? 3100);
const ATLAS_URL = `http://localhost:${E2E_PORT}`;
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-bp3-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const MACHINE_NAME = `e2e-bp3-machine-${RUN}`;

let tmpBridgeHome: string;

async function cleanupRows() {
  await db.execute(
    sql`delete from feed_events where summary like ${"e2e-bp3-machine-%"}`,
  );
  const myBridges = await db
    .select({ id: bridges.id })
    .from(bridges)
    .where(like(bridges.name, "e2e-bp3-machine-%"));
  for (const b of myBridges) {
    await db.execute(
      sql`delete from feed_events where payload->>'bridgeId' = ${b.id}`,
    );
  }
  await db.delete(bridges).where(like(bridges.name, "e2e-bp3-machine-%"));
  const owners = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E BP3 %"));
  for (const o of owners) {
    await db.delete(userPreferences).where(eq(userPreferences.userId, o.userId));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E BP3 %"));
}

test.beforeAll(async () => {
  await cleanupRows();
  // Temp dir acts as ATLAS_BRIDGE_HOME for this run — isolated from real config.
  tmpBridgeHome = await mkdtemp(join(tmpdir(), "bp3-e2e-"));
  await mkdir(tmpBridgeHome, { recursive: true });
});

test.afterAll(async () => {
  await cleanupRows();
  if (tmpBridgeHome) {
    await rm(tmpBridgeHome, { recursive: true, force: true }).catch(() => {});
  }
});

test.describe.serial("BP3 — true two-sided pairing e2e (ADR-0004 §4)", () => {
  test("owner bootstrap for BP3 spec", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E BP3 Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("true two-sided pair: runPair loopback + authed Owner approve → token in config", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);

    // Pick a free port for the loopback listener.
    const cbPort = await pickFreePort();

    // capturedPairUrl will be set by the injected openBrowser.
    let capturedPairUrl = "";

    // Start runPair in the background:
    //   - pickPort: always returns cbPort (deterministic, pre-reserved)
    //   - openBrowser: captures the URL + returns true (so runPair waits
    //     for the callback rather than printing the headless fallback)
    //
    // runPair starts the listener BEFORE calling openBrowser, so the
    // listener is live when we navigate the authed Owner to the pair URL.
    const pairPromise = runPair({
      name: MACHINE_NAME,
      url: ATLAS_URL,
      env: {
        ...process.env,
        ATLAS_BRIDGE_HOME: tmpBridgeHome,
      },
      pickPort: async () => cbPort,
      openBrowser: async (url: string) => {
        capturedPairUrl = url;
        return true; // "browser opened" → runPair waits for callback
      },
      silent: true,
    });

    // Wait for the openBrowser injection to fire (happens right after the
    // listener binds — a small poll covers the async gap).
    const waitForUrl = async (): Promise<string> => {
      for (let i = 0; i < 100; i++) {
        if (capturedPairUrl) return capturedPairUrl;
        await new Promise<void>((r) => setTimeout(r, 50));
      }
      throw new Error("runPair did not emit pairUrl within 5s");
    };
    const pairUrl = await waitForUrl();

    // Navigate the authed Owner to the approve screen.
    // pairUrl is absolute (http://localhost:<E2E_PORT>/settings/bridges/pair?...)
    const pairPath = pairUrl.replace(ATLAS_URL, "");
    await page.goto(pairPath);

    // Owner sees the approve screen (BP2 route: app/(app)/settings/bridges/pair/).
    await expect(
      page.getByRole("button", { name: /approve pairing/i }),
    ).toBeVisible({ timeout: 30_000 });

    // Machine name is shown in the approve screen.
    await expect(page.getByText(MACHINE_NAME, { exact: false }).first()).toBeVisible();

    // Click Approve:
    //   BP2 approveAction → requireOwner() ✓ → validateCallbackUrl(cb) ✓
    //   → pairBridge(name) → mints token → stores hash
    //   → redirect → http://127.0.0.1:<cbPort>/callback?token=…&state=…&name=…
    await page.getByRole("button", { name: /approve pairing/i }).click();

    // Wait for runPair to complete (it receives callback → writes config → exits).
    const pairResult = await Promise.race([
      pairPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("runPair timed out after 30s")), 30_000),
      ),
    ]);

    // runPair resolved with { name }
    expect(pairResult.name).toBe(MACHINE_NAME);

    // Token was written to the temp config file.
    const env: NodeJS.ProcessEnv = { ATLAS_BRIDGE_HOME: tmpBridgeHome };
    const config = await readConfigFile(env);
    expect(config).not.toBeNull();
    expect(config?.name).toBe(MACHINE_NAME);
    expect(config?.url).toBe(ATLAS_URL);
    // Token must match the expected ADR-0004 §4 format.
    expect(config?.token).toMatch(/^atlas-bridge-[0-9a-f]{48}$/);

    // Exactly ONE bridge row in DB.
    const bridgeRows = await db
      .select()
      .from(bridges)
      .where(like(bridges.name, MACHINE_NAME));
    expect(bridgeRows).toHaveLength(1);

    // Token in DB is ONLY the hash — plaintext never stored (ADR-0004 §4).
    expect(bridgeRows[0].tokenHash).toBe(hashBridgeToken(config!.token!));
    expect(bridgeRows[0].tokenHash).not.toContain(config!.token);

    // Exactly ONE bridge-paired feed row (THE OUTBOX RULE).
    const feedRows = await db.execute(
      sql`select kind, summary from feed_events where payload->>'bridgeId' = ${bridgeRows[0].id}`,
    ) as unknown as { rows: Array<{ kind: string; summary: string }> };
    expect(feedRows.rows).toHaveLength(1);
    expect(feedRows.rows[0].kind).toBe("bridge-paired");
    expect(feedRows.rows[0].summary).toBe(MACHINE_NAME);
    // Summary NEVER contains the raw token (security — ADR-0004 §4).
    expect(feedRows.rows[0].summary).not.toContain(config!.token);
  });
});
