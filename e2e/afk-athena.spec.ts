// ADR-0006 §4 — AFK Mode, Playwright-asserted (full stack): with AFK Mode ON,
// the REAL daemon (fake Engine) raises a needs-input Ask, the Atlas heartbeat
// sweep hands it to Athena (faked LLM via ATLAS_ATHENA_FAKE=1), and the Run
// resumes and lands review-ready WITHOUT any human answer — the `answered`
// feed row carries actor "Athena" (the delegate-answered audit). Mirrors the
// m9 harness; self-cleaning (afterAll kills the daemon + reseeds).
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { and, eq, inArray, like } from "drizzle-orm";

import { signInAsOwner } from "./support/sign-in";

// .env.local is loaded by playwright.config.ts before specs import.
import { db } from "../src/db/client";
import {
  bridges,
  briefs,
  feedEvents,
  instanceSettings,
  memberships,
  projects,
  runs,
  runStdoutChunks,
  tickets,
  userPreferences,
} from "../src/db/schema";

const BRIDGE_TITLE = `E2E bridge consult ${Date.now()}`;
const BRIDGE_QUESTION = "Which storage backend for the cache?";

const REPO_ROOT = join(__dirname, "..");
const E2E_PORT = Number(process.env.ATLAS_E2E_PORT ?? 3100);
const ATLAS_URL = `http://localhost:${E2E_PORT}`;
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-afk-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const BRIDGE_TOKEN = `e2e-afk-bridge-${randomBytes(12).toString("hex")}`;

const PROJECT_NAME = `E2E afk project ${RUN}`;
const LOOP_TITLE = `E2E afk auto-answer ${RUN}`;
const LOOP_QUESTION = "Which environment should the export hit?";

let daemon: ChildProcess | null = null;
let daemonLog = "";
let repoDir: string;
let dataDir: string;
let projectId: string;

async function signIn(page: Page) {
  await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
}

async function cleanupE2ERows() {
  const e2eProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(like(projects.name, "E2E afk %"));
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
  await db.delete(bridges).where(like(bridges.name, "E2E afk %"));
  const e2eMembers = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E AFK %"));
  if (e2eMembers.length) {
    await db
      .delete(userPreferences)
      .where(inArray(userPreferences.userId, e2eMembers.map((m) => m.userId)));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E AFK %"));
}

test.beforeAll(async () => {
  test.setTimeout(180_000);
  await cleanupE2ERows();

  // park seeded queued runs (OUR daemon would claim them with no local_path).
  await db
    .update(runs)
    .set({ state: "cancelled" })
    .where(and(eq(runs.seeded, true), eq(runs.state, "queued")));
  // AFK is instance-global — make sure no leftover state from another run.
  await db
    .insert(instanceSettings)
    .values({ id: 1, afkMode: false, afkLevel: "off", athenaLocation: "cloud" })
    .onConflictDoUpdate({
      target: instanceSettings.id,
      set: { afkMode: false, afkLevel: "off", athenaLocation: "cloud" },
    });

  repoDir = mkdtempSync(join(tmpdir(), "afk-e2e-repo-"));
  dataDir = mkdtempSync(join(tmpdir(), "afk-e2e-bridge-"));
  execSync("git init -b main", { cwd: repoDir });
  writeFileSync(join(repoDir, "README.md"), "# e2e fixture\n");
  execSync("git add -A", { cwd: repoDir });
  execSync('git -c user.name=e2e -c user.email=e2e@test.local commit -m init', { cwd: repoDir });

  await db.insert(bridges).values({
    name: `E2E afk bridge ${RUN}`,
    tokenHash: createHash("sha256").update(BRIDGE_TOKEN, "utf8").digest("hex"),
  });

  const [project] = await db
    .insert(projects)
    .values({ name: PROJECT_NAME, slug: `e2e-afk-${RUN}`, localPath: repoDir, pinned: false, seeded: false })
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

  const start = Date.now();
  for (;;) {
    const [bridge] = await db
      .select({ beat: bridges.lastHeartbeatAt })
      .from(bridges)
      .where(eq(bridges.name, `E2E afk bridge ${RUN}`));
    if (bridge?.beat) break;
    if (Date.now() - start > 60_000) throw new Error(`bridge never heartbeat. log:\n${daemonLog}`);
    await new Promise((r) => setTimeout(r, 500));
  }
});

test.afterAll(async () => {
  daemon?.kill();
  await new Promise((r) => setTimeout(r, 500));
  await db
    .insert(instanceSettings)
    .values({ id: 1, afkMode: false, afkLevel: "off", athenaLocation: "cloud" })
    .onConflictDoUpdate({
      target: instanceSettings.id,
      set: { afkMode: false, afkLevel: "off", athenaLocation: "cloud" },
    });
  await cleanupE2ERows();
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(repoDir, { recursive: true, force: true });
  execSync("node scripts/seed-demo.mjs", { cwd: REPO_ROOT });
});

test.describe.serial("ADR-0006 — AFK Mode: Athena answers while you're away", () => {
  test("owner bootstrap — paired bridge heartbeating on the fake engine", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E AFK Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("AFK toggle persists, then a Run's Ask is auto-answered by Athena (no human)", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await signIn(page);

    // ── turn AFK Mode ON via the settings toggle, verify it persisted ──
    await page.goto("/settings");
    const afkSection = page.locator("section", { hasText: "AFK Mode" });
    await expect(afkSection).toBeVisible();
    await afkSection.getByRole("button", { name: "On" }).click();
    await expect(async () => {
      const [s] = await db.select({ afk: instanceSettings.afkMode }).from(instanceSettings);
      expect(s?.afk).toBe(true);
    }).toPass({ timeout: 15_000 });

    // ── a ticket whose story scripts a free-text Ask + a file write ──
    const body = [
      "The export needs an environment decision before it can land.",
      "",
      "@fake:line analyzing the ticket",
      `@fake:ask {"kind":"question","prompt":"${LOOP_QUESTION}"}`,
      "@fake:line proceeding with the answer",
      "@fake:write e2e-change.md the export change",
    ].join("\n");
    const [ticket] = await db
      .insert(tickets)
      .values({ ref: `E2EAFK-${RUN}`, projectId, title: LOOP_TITLE, body, state: "approved", reporter: "you" })
      .returning({ id: tickets.id, ref: tickets.ref });

    // ── dispatch: first click drafts the Brief (Helper Run) ──
    await page.goto(`/tickets/${ticket.ref}`);
    const dispatchCta = page.getByRole("button", { name: /dispatch to ai/i });
    await expect(dispatchCta).toBeEnabled();
    await dispatchCta.click();
    await expect(page.getByText("drafted by Engine")).toBeVisible({ timeout: 90_000 });

    // ── real dispatch: the Owner Run starts (created async — poll for it) ──
    await dispatchCta.click();
    let ownerRun: { id: string; ref: string } | undefined;
    await expect(async () => {
      const [r] = await db
        .select({ id: runs.id, ref: runs.ref })
        .from(runs)
        .where(and(eq(runs.ticketId, ticket.id), eq(runs.lane, "owner")));
      expect(r).toBeTruthy();
      ownerRun = r;
    }).toPass({ timeout: 60_000 });

    // ── the proof: WITHOUT any manual answer, Athena resolves the Ask and the
    //    Run reaches review-ready. The needs-input → running flip is Athena's. ──
    const ownerRunId = ownerRun!.id;
    await expect(async () => {
      const [r] = await db
        .select({ state: runs.state, answer: runs.answer, attempted: runs.athenaAttemptedAt })
        .from(runs)
        .where(eq(runs.id, ownerRunId));
      // it passed THROUGH needs-input and Athena answered it
      expect(r.attempted).not.toBeNull();
      expect((r.answer as { answeredBy?: string } | null)?.answeredBy).toBe("Athena");
      expect(r.state).toBe("review-ready");
    }).toPass({ timeout: 180_000 });

    // ── the delegate-answered audit: an `answered` feed row, actor Athena ──
    const answered = await db
      .select({ actor: feedEvents.actor })
      .from(feedEvents)
      .where(and(eq(feedEvents.runId, ownerRunId), eq(feedEvents.kind, "answered")));
    expect(answered).toHaveLength(1);
    expect(answered[0].actor).toBe("Athena");
  });

  test("bridge tier: Athena consults ON the bridge (fake) and answers — no human", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await signIn(page);

    // AFK on + location = bridge (the consult runs on the daemon, not Atlas).
    await db
      .insert(instanceSettings)
      .values({ id: 1, afkLevel: "on", afkMode: true, athenaLocation: "bridge" })
      .onConflictDoUpdate({
        target: instanceSettings.id,
        set: { afkLevel: "on", afkMode: true, athenaLocation: "bridge" },
      });

    const body = [
      "The cache needs a storage decision.",
      "",
      "@fake:line analyzing the ticket",
      `@fake:ask {"kind":"question","prompt":"${BRIDGE_QUESTION}"}`,
      "@fake:line proceeding with the answer",
      "@fake:write e2e-bridge.md the cache change",
    ].join("\n");
    const [ticket] = await db
      .insert(tickets)
      .values({ ref: `E2EBR-${RUN}`, projectId, title: BRIDGE_TITLE, body, state: "approved", reporter: "you" })
      .returning({ id: tickets.id, ref: tickets.ref });

    await page.goto(`/tickets/${ticket.ref}`);
    const dispatchCta = page.getByRole("button", { name: /dispatch to ai/i });
    await expect(dispatchCta).toBeEnabled();
    await dispatchCta.click();
    await expect(page.getByText("drafted by Engine")).toBeVisible({ timeout: 90_000 });
    await dispatchCta.click();

    let ownerRun: { id: string } | undefined;
    await expect(async () => {
      const [r] = await db
        .select({ id: runs.id })
        .from(runs)
        .where(and(eq(runs.ticketId, ticket.id), eq(runs.lane, "owner")));
      expect(r).toBeTruthy();
      ownerRun = r;
    }).toPass({ timeout: 60_000 });
    const ownerRunId = ownerRun!.id;

    // the proof: a consult-requested command was emitted (bridge path), and the
    // Run reached review-ready answered by Athena — with NO human answer.
    await expect(async () => {
      const [r] = await db
        .select({ state: runs.state, answer: runs.answer })
        .from(runs)
        .where(eq(runs.id, ownerRunId));
      expect((r.answer as { answeredBy?: string } | null)?.answeredBy).toBe("Athena");
      expect(r.state).toBe("review-ready");
    }).toPass({ timeout: 180_000 });

    const consult = await db
      .select({ id: feedEvents.id })
      .from(feedEvents)
      .where(and(eq(feedEvents.runId, ownerRunId), eq(feedEvents.kind, "consult-requested")));
    expect(consult.length).toBeGreaterThan(0); // the bridge consult was dispatched
  });
});
