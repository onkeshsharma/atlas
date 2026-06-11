// M12 — THE SHIP CARD, Playwright-asserted with the REAL daemon + fake
// Engine (charter done criterion 2): two dispatched tickets reach
// review-ready with genuinely disjoint diff file-sets → Today's rail
// card derives E:362's parallel-safe claim → "Ship 2 now" requests both
// ships through the SAME requestShipRun batch the board cluster uses →
// the daemon lands two REAL merges → the card clears live. Plus the
// honesty negatives: an uncovered review set drops the claim, and a
// review ticket with nothing to request renders the CTA disabled.
// Harness per the M9 recipes (m9b-ship.spec.ts is the worked example):
// own lock port 9240, parks seeded queued/review rows, reseeds afterAll.
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { signInAsOwner } from "./support/sign-in";
import { and, eq, inArray, like } from "drizzle-orm";

// .env.local is loaded by playwright.config.ts before specs import.
import { db } from "../src/db/client";
import {
  bridges,
  briefs,
  feedEvents,
  memberships,
  projects,
  runs,
  runStdoutChunks,
  tickets,
  userPreferences,
} from "../src/db/schema";

const REPO_ROOT = join(__dirname, "..");
const E2E_PORT = Number(process.env.ATLAS_E2E_PORT ?? 3100);
const ATLAS_URL = `http://localhost:${E2E_PORT}`;
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m12sc-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const BRIDGE_TOKEN = `e2e-bridge-${randomBytes(12).toString("hex")}`;

const PROJECT_NAME = `E2E m12sc project ${RUN}`;
const TITLE_A = `E2E m12sc alpha ${RUN}`;
const TITLE_B = `E2E m12sc beta ${RUN}`;
const TITLE_BARE = `E2E m12sc bare ${RUN}`;

let daemon: ChildProcess | null = null;
let daemonLog = "";
let repoDir: string;
let dataDir: string;
let projectId: string;

function git(args: string, cwd: string) {
  execSync(`git ${args}`, { cwd });
}

async function signIn(page: Page) {
  await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
}

async function cleanupE2ERows() {
  const e2eProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(like(projects.name, "E2E m12sc %"));
  const projectIds = e2eProjects.map((p) => p.id);
  if (projectIds.length) {
    const e2eRuns = await db
      .select({ id: runs.id })
      .from(runs)
      .where(inArray(runs.projectId, projectIds));
    const runIds = e2eRuns.map((r) => r.id);
    if (runIds.length) {
      await db.delete(runStdoutChunks).where(inArray(runStdoutChunks.runId, runIds));
    }
    await db.delete(feedEvents).where(inArray(feedEvents.projectId, projectIds));
    if (runIds.length) await db.delete(runs).where(inArray(runs.id, runIds));
    const e2eTickets = await db
      .select({ id: tickets.id })
      .from(tickets)
      .where(inArray(tickets.projectId, projectIds));
    const ticketIds = e2eTickets.map((t) => t.id);
    if (ticketIds.length) await db.delete(briefs).where(inArray(briefs.ticketId, ticketIds));
    if (ticketIds.length) await db.delete(tickets).where(inArray(tickets.id, ticketIds));
    await db.delete(projects).where(inArray(projects.id, projectIds));
  }
  await db.delete(bridges).where(like(bridges.name, "E2E m12sc %"));
  const e2eMembers = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M12SC %"));
  if (e2eMembers.length) {
    await db
      .delete(userPreferences)
      .where(inArray(userPreferences.userId, e2eMembers.map((m) => m.userId)));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E M12SC %"));
}

/** approved ticket + pre-drafted Brief — the one-click dispatch idiom (m9b). */
async function seedDispatchable(title: string, brief: string) {
  const [ticket] = await db
    .insert(tickets)
    .values({
      ref: `E2E12-${randomBytes(3).toString("hex")}`,
      projectId,
      title,
      body: "Scripted by its Brief.",
      state: "approved",
      reporter: "you",
    })
    .returning({ id: tickets.id, ref: tickets.ref });
  await db.insert(briefs).values({
    ticketId: ticket.id,
    body: brief,
    status: "draft",
    source: "helper-run",
  });
  return ticket;
}

async function ownerRunFor(ticketId: string) {
  return db
    .select()
    .from(runs)
    .where(and(eq(runs.ticketId, ticketId), eq(runs.lane, "owner")));
}

async function waitForRunState(runId: string, state: string, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  for (;;) {
    const [r] = await db.select().from(runs).where(eq(runs.id, runId));
    if (r.state !== last) {
      console.log(`[diag] run ${r.ref}: ${r.state}`);
      last = r.state;
    }
    if (r.state === state) return r;
    if (Date.now() > deadline) {
      console.log(`[diag] daemon log tail:\n${daemonLog.slice(-4000)}`);
      throw new Error(`run ${r.ref} never reached ${state} (stuck at ${r.state})`);
    }
    await new Promise((res) => setTimeout(res, 1_000));
  }
}

test.beforeAll(async () => {
  test.setTimeout(180_000);
  await cleanupE2ERows();

  // park the seeded universe so Today's review set is exactly this
  // spec's tickets: queued runs would be claimed by our daemon (m9 law);
  // seeded review-ready rows would join the review set + the ship batch.
  // afterAll reseeds, restoring all of it.
  await db
    .update(runs)
    .set({ state: "cancelled" })
    .where(and(eq(runs.seeded, true), inArray(runs.state, ["queued", "review-ready"])));
  await db
    .update(tickets)
    .set({ state: "backlog" })
    .where(and(eq(tickets.seeded, true), eq(tickets.state, "review-ready")));

  repoDir = mkdtempSync(join(tmpdir(), "m12sc-e2e-repo-"));
  dataDir = mkdtempSync(join(tmpdir(), "m12sc-e2e-bridge-"));
  git("init -b main", repoDir);
  writeFileSync(join(repoDir, "README.md"), "# e2e fixture\n");
  git("add -A", repoDir);
  git('-c user.name=e2e -c user.email=e2e@test.local commit -m init', repoDir);

  await db.insert(bridges).values({
    name: `E2E m12sc bridge ${RUN}`,
    tokenHash: createHash("sha256").update(BRIDGE_TOKEN, "utf8").digest("hex"),
  });

  const [project] = await db
    .insert(projects)
    .values({
      name: PROJECT_NAME,
      slug: `e2e-m12sc-${RUN}`,
      localPath: repoDir,
      pinned: false,
      seeded: false,
    })
    .returning({ id: projects.id });
  projectId = project.id;

  daemon = spawn(
    process.execPath,
    ["--no-warnings", join("packages", "bridge", "src", "index.ts")],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        ATLAS_URL,
        ATLAS_BRIDGE_TOKEN: BRIDGE_TOKEN,
        ATLAS_BRIDGE_ENGINE: "fake",
        ATLAS_BRIDGE_DATA_DIR: dataDir,
        ATLAS_BRIDGE_LOCK_PORT: "9240", // m9-engine 9223 · m9b 9224 · m10 9230
        ATLAS_BRIDGE_TICK_MS: "250",
        ATLAS_BRIDGE_HEARTBEAT_MS: "2000",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  daemon.stdout?.on("data", (b: Buffer) => (daemonLog += b.toString("utf8")));
  daemon.stderr?.on("data", (b: Buffer) => (daemonLog += b.toString("utf8")));

  const start = Date.now();
  for (;;) {
    const [bridge] = await db
      .select({ beat: bridges.lastHeartbeatAt })
      .from(bridges)
      .where(eq(bridges.name, `E2E m12sc bridge ${RUN}`));
    if (bridge?.beat) break;
    if (Date.now() - start > 60_000) {
      throw new Error(`bridge never heartbeat. daemon log:\n${daemonLog}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
});

test.afterAll(async () => {
  daemon?.kill();
  await new Promise((r) => setTimeout(r, 500));
  await cleanupE2ERows();
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(repoDir, { recursive: true, force: true });
  execSync("node scripts/seed-demo.mjs", { cwd: REPO_ROOT });
});

test.describe.serial("M12 — Today's ship card derives and ships for real", () => {
  test("owner bootstrap", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M12SC Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("disjoint review set → derived claim → Ship 2 now lands two real merges, live", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await signIn(page);

    // two tickets whose fake-Engine runs touch DISJOINT files — the
    // derivation's file-sets come from the REAL diffs (M9 seam).
    const ticketA = await seedDispatchable(
      TITLE_A,
      ["@fake:line building alpha", "@fake:write alpha.md the alpha change"].join("\n"),
    );
    const ticketB = await seedDispatchable(
      TITLE_B,
      ["@fake:line building beta", "@fake:write beta.md the beta change"].join("\n"),
    );

    for (const t of [ticketA, ticketB]) {
      await page.goto(`/tickets/${t.ref}`);
      await page.getByRole("button", { name: /dispatch to ai/i }).click();
      await expect(page.getByText("A Run owns this Ticket right now.")).toBeVisible({
        timeout: 60_000,
      });
      const [run] = await ownerRunFor(t.id);
      await waitForRunState(run.id, "review-ready");
    }

    // Today derives E:362's claim from the real diffs — nothing asserted
    // that the engine didn't derive
    await page.goto("/today");
    await expect(
      page.getByText("are parallel-safe. A single Ship Group can land them together."),
    ).toBeVisible();
    await expect(page.getByText("file-sets disjoint")).toBeVisible();
    await expect(page.getByText("of them parallel-safe.")).toBeVisible();

    // THE CTA — the same requestShipRun batch the board cluster uses
    const shipButton = page.getByRole("button", { name: /ship 2 now/i });
    await expect(shipButton).toBeEnabled();
    await shipButton.click();

    // the daemon lands BOTH merges; the open Today clears the card live
    const [runA] = await ownerRunFor(ticketA.id);
    const [runB] = await ownerRunFor(ticketB.id);
    await waitForRunState(runA.id, "shipped", 120_000);
    await waitForRunState(runB.id, "shipped", 120_000);
    // exact: the hero's lowercase "ready to ship" stays; the CARD goes
    await expect(page.getByText("Ready to ship", { exact: true })).toBeHidden({
      timeout: 60_000,
    });

    // the repo + the record tell the whole story
    const files = execSync("git ls-tree --name-only HEAD", { cwd: repoDir }).toString();
    expect(files).toContain("alpha.md");
    expect(files).toContain("beta.md");
    for (const t of [ticketA, ticketB]) {
      const [row] = await db.select().from(tickets).where(eq(tickets.id, t.id));
      expect(row.state).toBe("shipped");
    }
    const shipRequested = await db
      .select({ id: feedEvents.id })
      .from(feedEvents)
      .where(
        and(eq(feedEvents.kind, "ship-requested"), eq(feedEvents.projectId, projectId)),
      );
    expect(shipRequested).toHaveLength(2);
  });

  test("honesty negatives: uncovered review set drops the claim; nothing-to-request disables the CTA", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page);

    // one review-ready ticket with NO run and NO file-set knowledge:
    // the review set is not covered (no independent group), and no
    // review-ready run exists to request.
    const [bare] = await db
      .insert(tickets)
      .values({
        ref: `E2E12-${randomBytes(3).toString("hex")}`,
        projectId,
        title: TITLE_BARE,
        body: "No run ever executed this.",
        state: "review-ready",
        reporter: "you",
      })
      .returning({ id: tickets.id });

    await page.goto("/today");
    await expect(page.getByText("Ready to ship", { exact: true })).toBeVisible();
    await expect(page.getByText("1 ticket is ready for your review.")).toBeVisible();
    await expect(page.getByText("are parallel-safe")).toHaveCount(0);
    await expect(page.getByText("file-sets disjoint")).toHaveCount(0);
    const shipButton = page.getByRole("button", { name: /ship 1 now/i });
    await expect(shipButton).toBeVisible();
    await expect(shipButton).toBeDisabled();

    await db.delete(tickets).where(eq(tickets.id, bare.id));
  });
});
