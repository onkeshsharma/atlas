// M10 — THE GOVERNANCE LOOP, Playwright-asserted (charter done criterion
// 1): a Bridge is paired FROM THE UI (show-once token panel), the REAL
// daemon connects with that token, the open Bridges page shows the live
// heartbeat (HeartbeatPoll — no reload), a cap edit propagates to the
// daemon's next heartbeat and the page shows the daemon-confirmed cap,
// the doctor runs from the UI and its real preflight verdict renders
// live, and revoking the token stops the daemon fatally on its next
// request. Daemon lock port 9230 (m9-engine holds 9223, m9b-ship 9224) —
// M11 mechanical sweep: derived from ATLAS_E2E_LOCK_BASE (default 9220)
// because the lock is MACHINE-global TCP; two parallel module worktrees
// running this suite concurrently collided on 9230 (observed 2026-06-12,
// the playwright.config "two concurrent suite runs" law extended to
// daemon locks). Defaults unchanged; assertions use the same constant.
// Self-cleaning; afterAll reseeds the demo universe.
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { signInAsOwner } from "./support/sign-in";
import { and, eq, like, sql } from "drizzle-orm";

// .env.local is loaded by playwright.config.ts before specs import.
import { db } from "../src/db/client";
import {
  bridges,
  feedEvents,
  memberships,
  projects,
  runs,
  userPreferences,
} from "../src/db/schema";

const REPO_ROOT = join(__dirname, "..");
const E2E_PORT = Number(process.env.ATLAS_E2E_PORT ?? 3100);
const ATLAS_URL = `http://localhost:${E2E_PORT}`;
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m10b-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const BRIDGE_NAME = `e2e-m10-machine-${RUN}`;
// machine-global daemon lock — see header (M11 mechanical sweep)
const LOCK_PORT = Number(process.env.ATLAS_E2E_LOCK_BASE ?? 9220) + 10;

let daemon: ChildProcess | null = null;
let daemonLog = "";
let daemonExited: Promise<void> | null = null;
let repoDir: string;
let dataDir: string;

async function signIn(page: Page) {
  // M10 — retry discipline lives in the shared helper (e2e/support/sign-in.ts)
  await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
}

async function cleanupRows() {
  const mine = await db
    .select({ id: bridges.id })
    .from(bridges)
    .where(like(bridges.name, "e2e-m10-machine-%"));
  for (const b of mine) {
    await db.execute(sql`delete from feed_events where payload->>'bridgeId' = ${b.id}`);
  }
  await db.delete(feedEvents).where(like(feedEvents.summary, "e2e-m10-machine-%"));
  await db.delete(bridges).where(like(bridges.name, "e2e-m10-machine-%"));
  await db.delete(projects).where(like(projects.name, "E2E m10b %"));
  const owners = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M10B %"));
  for (const o of owners) {
    await db.delete(userPreferences).where(eq(userPreferences.userId, o.userId));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E M10B %"));
}

test.beforeAll(async () => {
  test.setTimeout(180_000);
  await cleanupRows();

  // seeded queued runs would be claimed by OUR daemon (no local_path →
  // noisy failed rows mid-suite). Park them; afterAll's reseed restores.
  await db
    .update(runs)
    .set({ state: "cancelled" })
    .where(and(eq(runs.seeded, true), eq(runs.state, "queued")));

  // a real repo so the doctor's repo check has something true to say
  repoDir = mkdtempSync(join(tmpdir(), "m10-e2e-repo-"));
  dataDir = mkdtempSync(join(tmpdir(), "m10-e2e-bridge-"));
  execSync("git init -b main", { cwd: repoDir });
  writeFileSync(join(repoDir, "README.md"), "# e2e fixture\n");
  execSync("git add -A", { cwd: repoDir });
  execSync('git -c user.name=e2e -c user.email=e2e@test.local commit -m init', { cwd: repoDir });

  await db.insert(projects).values({
    name: `E2E m10b project ${RUN}`,
    slug: `e2e-m10b-${RUN}`,
    localPath: repoDir,
    pinned: false,
    seeded: false,
  });
});

test.afterAll(async () => {
  daemon?.kill();
  await new Promise((r) => setTimeout(r, 500));
  await cleanupRows();
  // the cap test left the instance dial at 3 — restore the default so
  // later specs (m9's queue choreography) see the world they expect.
  await db.execute(sql`
    insert into instance_settings (id, run_cap, updated_at) values (1, 2, now())
    on conflict (id) do update set run_cap = 2, updated_at = now()
  `);
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(repoDir, { recursive: true, force: true });
  // restore the pristine demo universe (parked seeded runs included)
  execSync("node scripts/seed-demo.mjs", { cwd: REPO_ROOT });
});

test.describe.serial("M10 — the daemon is governable from the browser", () => {
  test("owner bootstrap", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M10B Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("pair from the UI → daemon connects → heartbeat/cap/doctor all live → revoke stops it", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await signIn(page);

    // ── pair: the XX show-once panel issues the daemon's ONLY token ──
    await page.goto("/settings/bridges");
    await expect(page.getByText("No machine paired yet", { exact: false })).toBeVisible();
    await page.getByPlaceholder("e.g. onkesh-desktop").fill(BRIDGE_NAME);
    await page.getByRole("button", { name: /generate token/i }).click();
    await expect(page.getByText("Token just created · copy it now")).toBeVisible({
      timeout: 30_000,
    });
    const token = (await page.locator(".select-all").first().textContent())!.trim();
    expect(token).toMatch(/^atlas-bridge-[0-9a-f]{48}$/);

    // only the hash is at rest
    const [paired] = await db
      .select()
      .from(bridges)
      .where(eq(bridges.name, BRIDGE_NAME));
    expect(paired.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(paired.tokenHash).not.toContain(token);

    // the panel is show-once: gone on reload
    await page.reload();
    await expect(page.getByText("Token just created · copy it now")).toHaveCount(0);

    // ── the REAL daemon connects with the UI-issued token ──
    daemon = spawn(
      process.execPath,
      ["--no-warnings", join("packages", "bridge", "src", "index.ts")],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          ATLAS_URL,
          ATLAS_BRIDGE_TOKEN: token,
          ATLAS_BRIDGE_ENGINE: "fake",
          ATLAS_BRIDGE_DATA_DIR: dataDir,
          ATLAS_BRIDGE_LOCK_PORT: String(LOCK_PORT),
          ATLAS_BRIDGE_TICK_MS: "250",
          ATLAS_BRIDGE_HEARTBEAT_MS: "2000",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    daemon.stdout?.on("data", (b: Buffer) => (daemonLog += b.toString("utf8")));
    daemon.stderr?.on("data", (b: Buffer) => (daemonLog += b.toString("utf8")));
    daemonExited = new Promise((resolve) => daemon!.on("exit", () => resolve()));

    // the OPEN page goes healthy without any reload (HeartbeatPoll)
    const row = page.locator("li.py-7", { hasText: BRIDGE_NAME }).first();
    await expect(row.getByText("online · healthy", { exact: true })).toBeVisible({
      timeout: 45_000,
    });
    await expect(row.getByText("fake · v", { exact: false })).toBeVisible();

    // ── cap: edit in the UI → daemon's next heartbeat carries + echoes it ──
    await page.getByRole("button", { name: "3", exact: true }).click();
    await expect(page.getByText("daemon holds cap 3")).toBeVisible({ timeout: 45_000 });
    expect(daemonLog).toContain("command stream connected");

    // ── doctor: run from the UI, real preflight verdict renders live ──
    await row.hover();
    await row.getByRole("button", { name: "run doctor →" }).click();
    await expect(row.getByText("last doctor ·", { exact: false })).toBeVisible({
      timeout: 60_000,
    });
    await row.locator("summary").first().click();
    await expect(row.getByText("Atlas reachable · auth + DB round-trip")).toBeVisible();
    await expect(row.getByText("git available")).toBeVisible();
    await expect(row.getByText("kept worktrees")).toBeVisible();
    await expect(row.getByText("single-instance lock")).toBeVisible();
    await expect(row.getByText(`repo · e2e-m10b-${RUN}`)).toBeVisible();

    // the verdict row is honest end to end
    const [verdictRow] = await db.select().from(bridges).where(eq(bridges.id, paired.id));
    const doctor = verdictRow.doctor as { lockPort: number; checks: Array<{ key: string; status: string }> };
    expect(verdictRow.doctorRequestedAt).toBeNull();
    expect(doctor.lockPort).toBe(LOCK_PORT);
    expect(doctor.checks.find((c) => c.key === "atlas-sync")?.status).toBe("pass");
    expect(doctor.checks.find((c) => c.key === `repo:e2e-m10b-${RUN}`)?.status).toBe("pass");

    // the round-trip wrote honest history (THE OUTBOX RULE)
    const kinds = (
      await db
        .select({ kind: feedEvents.kind })
        .from(feedEvents)
        .where(sql`payload->>'bridgeId' = ${paired.id}`)
    ).map((r) => r.kind);
    expect(kinds).toContain("bridge-paired");
    expect(kinds).toContain("doctor-requested");
    expect(kinds).toContain("doctor-completed");

    // ── revoke: the daemon stops fatally on its next request (ADR-0002 §1).
    // M15 — revocation runs through the §2.11 JJ confirm (PRD #41). ──
    await row.hover();
    await row.getByRole("button", { name: "revoke ✕" }).click();
    const confirmRevoke = page.getByRole("button", { name: /revoke forever/i });
    await expect(confirmRevoke).toBeDisabled();
    await page.getByPlaceholder(BRIDGE_NAME).fill(BRIDGE_NAME);
    await expect(confirmRevoke).toBeEnabled();
    await confirmRevoke.click();
    await expect(page.locator("li.py-7", { hasText: BRIDGE_NAME })).toHaveCount(0, {
      timeout: 30_000,
    });
    await Promise.race([
      daemonExited,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`daemon survived revocation. log:\n${daemonLog.slice(-2000)}`)), 30_000),
      ),
    ]);
    const [revoked] = await db.select().from(bridges).where(eq(bridges.id, paired.id));
    expect(revoked.revokedAt).not.toBeNull();
  });
});
