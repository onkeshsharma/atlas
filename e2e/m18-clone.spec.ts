// M18 — clone-on-dispatch, Playwright-asserted (charter §"Tests"):
// a URL-only project (repo_url set, local_path null) is dispatched; the
// real daemon clones it to ATLAS_PROJECTS_HOME/<slug>; the run reaches
// review-ready; /projects/<slug> shows "cloned at …"; local_path is
// now set on the project row.
//
// NO network: the "endpoint" is a LOCAL bare git repo created in a temp
// dir (git init --bare). ATLAS_PROJECTS_HOME points at a temp dir so the
// clone lands outside ~/atlas/projects and the test cleans itself.
//
// The daemon uses ATLAS_BRIDGE_ENGINE=fake (charter hard wall: suites
// never spawn claude). Lock port +4 past the base (m9-engine holds +3).
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { signInAsOwner } from "./support/sign-in";
import { and, eq, inArray, like } from "drizzle-orm";

import { db } from "../src/db/client";
import {
  briefs,
  bridges,
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
const OWNER_EMAIL = `e2e-m18-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-18";
const BRIDGE_TOKEN = `e2e-m18-bridge-${randomBytes(12).toString("hex")}`;

const PROJECT_SLUG = `e2e-m18-${RUN}`;
const PROJECT_NAME = `E2E m18 project ${RUN}`;
const TICKET_TITLE = `E2E M18 clone dispatch ${RUN}`;

let daemon: ChildProcess | null = null;
let daemonLog = "";
let bareRepoDir: string;   // the local "remote" bare repo
let dataDir: string;        // bridge data dir
let projectsHome: string;   // temp ATLAS_PROJECTS_HOME
let projectId: string;

async function signIn(page: Page) {
  await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
}

async function cleanupE2ERows() {
  const e2eProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(like(projects.name, "E2E m18 %"));
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
    if (ticketIds.length) {
      await db.delete(briefs).where(inArray(briefs.ticketId, ticketIds));
      await db.delete(tickets).where(inArray(tickets.id, ticketIds));
    }
    await db.delete(projects).where(inArray(projects.id, projectIds));
  }
  await db.delete(bridges).where(like(bridges.name, "E2E m18 %"));
  const e2eMembers = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M18 %"));
  if (e2eMembers.length) {
    await db
      .delete(userPreferences)
      .where(inArray(userPreferences.userId, e2eMembers.map((m) => m.userId)));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E M18 %"));
}

test.beforeAll(async () => {
  test.setTimeout(180_000);
  await cleanupE2ERows();

  // park seeded queued runs so our daemon doesn't pick them up
  await db
    .update(runs)
    .set({ state: "cancelled" })
    .where(and(eq(runs.seeded, true), eq(runs.state, "queued")));

  // Create a regular (non-bare) repo with one commit, then use it directly
  // as the clone source (git clone works on non-bare repos too — same as
  // any local file:// clone). A bare repo's HEAD can mismatch if it was
  // init'd with a different default branch name, causing the cloned
  // repo's worktree-add to fail with "invalid reference: HEAD".
  bareRepoDir = mkdtempSync(join(tmpdir(), "m18-e2e-bare-"));
  execSync("git init -b main", { cwd: bareRepoDir });
  writeFileSync(join(bareRepoDir, "README.md"), "# m18 e2e fixture\n");
  execSync("git add -A", { cwd: bareRepoDir });
  execSync('git -c user.name=e2e -c user.email=e2e@test.local commit -m init', { cwd: bareRepoDir });

  dataDir = mkdtempSync(join(tmpdir(), "m18-e2e-bridge-"));
  projectsHome = mkdtempSync(join(tmpdir(), "m18-e2e-projects-"));

  // pair the bridge
  await db.insert(bridges).values({
    name: `E2E m18 bridge ${RUN}`,
    tokenHash: createHash("sha256").update(BRIDGE_TOKEN, "utf8").digest("hex"),
  });

  // URL-only project — repo_url = the bare repo path, local_path = null
  const [project] = await db
    .insert(projects)
    .values({
      name: PROJECT_NAME,
      slug: PROJECT_SLUG,
      repoUrl: bareRepoDir,
      localPath: null,
      pinned: false,
      seeded: false,
    })
    .returning({ id: projects.id });
  projectId = project.id;

  // spawn the real daemon, fake Engine
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
        // M18 — temp projects home so clone lands there, not in ~/atlas/projects
        ATLAS_PROJECTS_HOME: projectsHome,
        ATLAS_BRIDGE_LOCK_PORT: String(Number(process.env.ATLAS_E2E_LOCK_BASE ?? 9220) + 4),
        ATLAS_BRIDGE_TICK_MS: "250",
        ATLAS_BRIDGE_HEARTBEAT_MS: "2000",
        ATLAS_BRIDGE_NO_TRAY: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  daemon.stdout?.on("data", (b: Buffer) => (daemonLog += b.toString("utf8")));
  daemon.stderr?.on("data", (b: Buffer) => (daemonLog += b.toString("utf8")));

  // wait for first heartbeat
  const start = Date.now();
  for (;;) {
    const [bridge] = await db
      .select({ beat: bridges.lastHeartbeatAt })
      .from(bridges)
      .where(eq(bridges.name, `E2E m18 bridge ${RUN}`));
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
  rmSync(bareRepoDir, { recursive: true, force: true });
  rmSync(projectsHome, { recursive: true, force: true });
  execSync("node scripts/seed-demo.mjs", { cwd: REPO_ROOT });
});

test.describe.serial("M18 — clone-on-dispatch", () => {
  test("owner bootstrap — bridge heartbeating", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M18 Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });

    const [bridge] = await db
      .select({ beat: bridges.lastHeartbeatAt })
      .from(bridges)
      .where(eq(bridges.name, `E2E m18 bridge ${RUN}`));
    expect(bridge.beat).not.toBeNull();
  });

  test("URL-only project: dispatch → clone happens → run reaches review-ready → local_path set → project page shows 'cloned at'", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await signIn(page);

    // simple ticket that the fake Engine can finish in one shot
    const [ticket] = await db
      .insert(tickets)
      .values({
        ref: `E2E18-${RUN}`,
        projectId,
        title: TICKET_TITLE,
        body: "A simple task.\n@fake:write m18-change.md the m18 clone change",
        state: "approved",
        reporter: "you",
      })
      .returning({ id: tickets.id, ref: tickets.ref });

    // skip the Brief helper by inserting a brief directly so dispatch goes
    // straight to the owner run (the same pattern m9b-ship uses)
    const [brief] = await db
      .insert(briefs)
      .values({
        ticketId: ticket.id,
        body: "Dispatch directly — m18 clone test brief.",
        source: "owner",
      })
      .returning({ id: briefs.id });

    // Navigate to the ticket and dispatch the owner run
    await page.goto(`/tickets/${ticket.ref}`);
    // with a brief present the CTA goes straight to dispatch
    const dispatchCta = page.getByRole("button", { name: /dispatch to ai/i });
    await expect(dispatchCta).toBeEnabled({ timeout: 15_000 });
    await dispatchCta.click();

    // the run should reach review-ready (the fake engine writes a file)
    // allow up to 120s for clone + worktree + engine to complete
    const runStart = Date.now();
    let ownerRunId: string | null = null;
    for (;;) {
      const [ownerRun] = await db
        .select({ id: runs.id, state: runs.state })
        .from(runs)
        .where(and(eq(runs.ticketId, ticket.id), eq(runs.lane, "owner")));
      if (ownerRun) {
        ownerRunId = ownerRun.id;
        if (ownerRun.state === "review-ready" || ownerRun.state === "failed") break;
      }
      if (Date.now() - runStart > 120_000) {
        throw new Error(
          `run never reached terminal state. daemon log:\n${daemonLog}`,
        );
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    // assert the run reached review-ready (not failed / clone-failed)
    const [finalRun] = await db
      .select({ state: runs.state, failureKind: runs.failureKind, failureDetail: runs.failureDetail })
      .from(runs)
      .where(eq(runs.id, ownerRunId!));
    expect(
      finalRun.state,
      `expected review-ready but got ${finalRun.state} (${finalRun.failureKind}: ${finalRun.failureDetail})\ndaemon log:\n${daemonLog}`,
    ).toBe("review-ready");

    // the clone should have landed
    const clonedPath = join(projectsHome, PROJECT_SLUG);
    const { existsSync } = await import("node:fs");
    expect(existsSync(clonedPath), `clone not found at ${clonedPath}`).toBe(true);

    // the project row's local_path should be set (report-back)
    let localPath: string | null = null;
    const linkStart = Date.now();
    for (;;) {
      const [proj] = await db
        .select({ localPath: projects.localPath })
        .from(projects)
        .where(eq(projects.id, projectId));
      localPath = proj?.localPath ?? null;
      if (localPath !== null) break;
      if (Date.now() - linkStart > 30_000) break; // non-fatal: we still check below
      await new Promise((r) => setTimeout(r, 300));
    }
    expect(localPath, "project.local_path not set after clone").toBe(clonedPath);

    // a project-linked feed row should exist
    const linked = await db
      .select({ id: feedEvents.id })
      .from(feedEvents)
      .where(and(eq(feedEvents.projectId, projectId), eq(feedEvents.kind, "project-linked")));
    expect(linked.length, "no project-linked feed row").toBeGreaterThan(0);

    // navigate to the project page and verify the "cloned at" status line
    await page.goto(`/projects/${PROJECT_SLUG}`);
    await expect(page.getByText(/cloned at/)).toBeVisible({ timeout: 15_000 });

    // the brief is cleaned up in afterAll via cleanupE2ERows (briefs → tickets → projects cascade).
  });
});
