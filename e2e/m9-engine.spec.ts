// M9 — THE LOOP, Playwright-asserted (charter §8 proof): a seeded ticket
// is dispatched from the detail page; the REAL daemon (packages/bridge,
// fake Engine, real git worktree in a temp repo) drafts the Brief via a
// Helper Run, executes the Owner Run, streams stdout up (read back
// through the browser's per-run SSE), raises needs-input — answered
// from Today in an OPEN browser (no reload) — and lands review-ready
// with real diff stats. Cancel proven on a second Run. Self-cleaning;
// afterAll kills the daemon and reseeds the demo.
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
const OWNER_EMAIL = `e2e-m9-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const BRIDGE_TOKEN = `e2e-bridge-${randomBytes(12).toString("hex")}`;

const PROJECT_NAME = `E2E m9 project ${RUN}`;
const LOOP_TITLE = `E2E the full loop ${RUN}`;
const LOOP_QUESTION = "Which environment should the export hit?";
const CANCEL_TITLE = `E2E cancel me ${RUN}`;

let daemon: ChildProcess | null = null;
let daemonLog = "";
let repoDir: string;
let dataDir: string;
let projectId: string;

async function signIn(page: Page) {
  // M10 — retry discipline lives in the shared helper (e2e/support/sign-in.ts)
  await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
}

async function cleanupE2ERows() {
  const e2eProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(like(projects.name, "E2E m9 %"));
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
  await db.delete(bridges).where(like(bridges.name, "E2E m9 %"));
  const e2eMembers = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M9 %"));
  if (e2eMembers.length) {
    await db
      .delete(userPreferences)
      .where(inArray(userPreferences.userId, e2eMembers.map((m) => m.userId)));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E M9 %"));
}

test.beforeAll(async () => {
  test.setTimeout(180_000);
  await cleanupE2ERows();

  // seeded queued runs would be claimed by OUR daemon (no local_path →
  // noisy failed rows mid-suite). Park them; afterAll's reseed restores.
  await db
    .update(runs)
    .set({ state: "cancelled" })
    .where(and(eq(runs.seeded, true), eq(runs.state, "queued")));

  // a real repo for worktree-per-Run (ADR-0001 §3)
  repoDir = mkdtempSync(join(tmpdir(), "m9-e2e-repo-"));
  dataDir = mkdtempSync(join(tmpdir(), "m9-e2e-bridge-"));
  execSync("git init -b main", { cwd: repoDir });
  writeFileSync(join(repoDir, "README.md"), "# e2e fixture\n");
  execSync("git add -A", { cwd: repoDir });
  execSync('git -c user.name=e2e -c user.email=e2e@test.local commit -m init', { cwd: repoDir });

  // pair the bridge (token hashed at rest — ADR-0002 §1)
  await db.insert(bridges).values({
    name: `E2E m9 bridge ${RUN}`,
    tokenHash: createHash("sha256").update(BRIDGE_TOKEN, "utf8").digest("hex"),
  });

  const [project] = await db
    .insert(projects)
    .values({
      name: PROJECT_NAME,
      slug: `e2e-m9-${RUN}`,
      localPath: repoDir,
      pinned: false,
      seeded: false,
    })
    .returning({ id: projects.id });
  projectId = project.id;

  // the REAL daemon, fake Engine (charter hard wall: suites never spawn claude)
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
        ATLAS_BRIDGE_LOCK_PORT: "9223",
        ATLAS_BRIDGE_TICK_MS: "250",
        ATLAS_BRIDGE_HEARTBEAT_MS: "2000",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  daemon.stdout?.on("data", (b: Buffer) => (daemonLog += b.toString("utf8")));
  daemon.stderr?.on("data", (b: Buffer) => (daemonLog += b.toString("utf8")));

  // the daemon is alive once its heartbeat lands (the sidebar's source)
  const start = Date.now();
  for (;;) {
    const [bridge] = await db
      .select({ beat: bridges.lastHeartbeatAt })
      .from(bridges)
      .where(eq(bridges.name, `E2E m9 bridge ${RUN}`));
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
  // restore the pristine demo universe (parked seeded runs included)
  execSync("node scripts/seed-demo.mjs", { cwd: REPO_ROOT });
});

test.describe.serial("M9 — the cockpit is true", () => {
  test("owner bootstrap — and the paired bridge is heartbeating", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M9 Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });

    const [bridge] = await db
      .select({ beat: bridges.lastHeartbeatAt, capabilities: bridges.capabilities })
      .from(bridges)
      .where(eq(bridges.name, `E2E m9 bridge ${RUN}`));
    expect(bridge.beat).not.toBeNull();
    expect((bridge.capabilities as { engine: string }).engine).toBe("fake");
  });

  test("THE LOOP: dispatch → Brief drafted by a Helper Run → stdout streams → needs-input answered from Today (no reload) → review-ready", async ({
    page,
    context,
  }) => {
    test.setTimeout(300_000);
    await signIn(page);

    // a seeded approved ticket whose story scripts the fake Engine
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
      .values({
        ref: `E2E9-${RUN}`,
        projectId,
        title: LOOP_TITLE,
        body,
        state: "approved",
        reporter: "you",
      })
      .returning({ id: tickets.id, ref: tickets.ref });

    // ── step 1: first dispatch click drafts the Brief (Helper Run) ──
    await page.goto(`/tickets/${ticket.ref}`);
    const dispatchCta = page.getByRole("button", { name: /dispatch to ai/i });
    await expect(dispatchCta).toBeEnabled();
    await expect(page.getByText("drafts the Brief first", { exact: false })).toBeVisible();
    await dispatchCta.click();

    // the page is LIVE: the helper round-trips through the real daemon
    // and the Brief section fills without any reload.
    // (Session B's F:201–243 port phrases provenance "drafted by Engine")
    await expect(page.getByText("drafted by Engine")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("executes the drafted Brief below")).toBeVisible();
    await expect(
      page.getByText("The export needs an environment decision", { exact: false }).nth(1),
    ).toBeVisible(); // the Brief quotes the story verbatim

    // ── step 2: open Today in a SECOND tab (it stays open, no reloads) ──
    const today = await context.newPage();
    await today.goto("/today");
    await expect(today.getByText("Active runs")).toBeVisible();
    await expect(today.getByText(LOOP_QUESTION)).toHaveCount(0);

    // ── step 3: the real dispatch ──
    await dispatchCta.click();
    await expect(page.getByText("A Run owns this Ticket right now.")).toBeVisible({
      timeout: 60_000,
    });

    const [ownerRun] = await db
      .select({ id: runs.id, ref: runs.ref })
      .from(runs)
      .where(and(eq(runs.ticketId, ticket.id), eq(runs.lane, "owner")));
    expect(ownerRun).toBeTruthy();

    // ── step 4: needs-input surfaces on the OPEN Today tab — no reload ──
    // (diagnostic shadow-poll: surfaces the run row + daemon log if the
    //  UI assertion is about to fail — evidence survives cleanup.)
    {
      const deadline = Date.now() + 90_000;
      let lastState = "";
      for (;;) {
        const [r] = await db.select().from(runs).where(eq(runs.id, ownerRun.id));
        if (r.state !== lastState) {
          console.log(`[diag] run ${ownerRun.ref}: ${r.state}`);
          lastState = r.state;
        }
        if (r.state === "needs-input" || Date.now() > deadline) break;
        await new Promise((res) => setTimeout(res, 1_000));
      }
      if (lastState !== "needs-input") {
        const chunkCount = (
          await db
            .select({ seq: runStdoutChunks.seq })
            .from(runStdoutChunks)
            .where(eq(runStdoutChunks.runId, ownerRun.id))
        ).length;
        console.log(`[diag] stdout chunks: ${chunkCount}`);
        console.log(`[diag] daemon log tail:\n${daemonLog.slice(-4000)}`);
      }
    }
    // 60 s window: a healthy stream delivers in ~3 s, but if LiveRefresh's
    // half-dead-stream watchdog has to reopen the connection (40 s silence
    // threshold) the live update legitimately takes up to ~50 s — still a
    // no-reload proof, the tab heals itself.
    await expect(today.getByText(LOOP_QUESTION)).toBeVisible({ timeout: 60_000 });

    // stdout is browser-readable through the per-run SSE cursor (PRD #5)
    const firstFrame = await today.evaluate(
      (runId: string) =>
        new Promise<string>((resolve, reject) => {
          const es = new EventSource(`/api/runs/${runId}/stdout?since=0`);
          const timer = setTimeout(() => {
            es.close();
            reject(new Error("no stdout frame within 30s"));
          }, 30_000);
          es.addEventListener("stdout", (e) => {
            clearTimeout(timer);
            es.close();
            resolve((e as MessageEvent).data as string);
          });
        }),
      ownerRun.id,
    );
    expect(firstFrame).toContain("engine session start");

    // ── step 5: answer from Today, in place ──
    const panelRow = today.locator("li", { hasText: LOOP_QUESTION });
    await panelRow.getByPlaceholder("Answer the Engine…").fill("staging");
    await panelRow.getByRole("button", { name: /answer/i }).click();

    // the run resumes and lands review-ready; the open tabs follow live
    await expect(today.getByText(LOOP_QUESTION)).toHaveCount(0, { timeout: 90_000 });
    await expect(
      page.getByText("The Run finished — ready for your review."),
    ).toBeVisible({ timeout: 90_000 });

    // ── the rows tell the whole story (THE OUTBOX RULE) ──
    const [finished] = await db.select().from(runs).where(eq(runs.id, ownerRun.id));
    expect(finished.state).toBe("review-ready");
    expect(finished.bridgeId).not.toBeNull();
    expect(finished.worktreePath).toContain(ownerRun.id);
    const diff = finished.diffStats as { filesChanged: number; files: Array<{ path: string }> };
    expect(diff.filesChanged).toBeGreaterThanOrEqual(1);
    expect(diff.files.map((f) => f.path)).toContain("e2e-change.md");
    const history = finished.questionHistory as Array<{ answer: { text?: string } }>;
    expect(history).toHaveLength(1);
    expect(history[0].answer.text).toBe("staging");

    const stdoutRows = await db
      .select({ content: runStdoutChunks.content })
      .from(runStdoutChunks)
      .where(eq(runStdoutChunks.runId, ownerRun.id));
    const stdout = stdoutRows.map((r) => r.content).join("");
    expect(stdout).toContain("analyzing the ticket");
    expect(stdout).toContain("answered: staging");

    const kinds = (
      await db
        .select({ kind: feedEvents.kind })
        .from(feedEvents)
        .where(eq(feedEvents.runId, ownerRun.id))
    ).map((r) => r.kind);
    for (const kind of ["dispatched", "started", "needs-input", "answered", "review-ready"]) {
      expect(kinds).toContain(kind);
    }

    await today.close();
  });

  test("CANCEL: a running Run stopped from Today; the Ticket goes back to approved", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await signIn(page);

    const [ticket] = await db
      .insert(tickets)
      .values({
        ref: `E2E9C-${RUN}`,
        projectId,
        title: CANCEL_TITLE,
        body: "Runs forever until cancelled.",
        state: "approved",
        reporter: "you",
      })
      .returning({ id: tickets.id, ref: tickets.ref });
    // a pre-drafted Brief scripts the hang — dispatch is one click
    await db.insert(briefs).values({
      ticketId: ticket.id,
      body: "@fake:line spinning up\n@fake:hang",
      status: "draft",
      source: "helper-run",
    });

    await page.goto(`/tickets/${ticket.ref}`);
    await page.getByRole("button", { name: /dispatch to ai/i }).click();
    await expect(page.getByText("A Run owns this Ticket right now.")).toBeVisible({
      timeout: 60_000,
    });

    await page.goto("/today");
    // scope to the Active-runs row (it carries the cancel ghost) — the
    // same title also sits in the Recent TICKET list below.
    const runRow = page
      .locator("li", { hasText: CANCEL_TITLE })
      .filter({ has: page.getByRole("button", { name: /cancel/i }) });
    await expect(runRow).toBeVisible({ timeout: 60_000 });
    await runRow.getByRole("button", { name: /cancel/i }).click();

    // the strip clears live; the record is honest end to end
    await expect(runRow).toHaveCount(0, { timeout: 60_000 });
    const [run] = await db
      .select()
      .from(runs)
      .where(and(eq(runs.ticketId, ticket.id), eq(runs.lane, "owner")));
    expect(run.state).toBe("cancelled");
    const [trow] = await db.select().from(tickets).where(eq(tickets.id, ticket.id));
    expect(trow.state).toBe("approved");

    await page.goto(`/tickets/${ticket.ref}`);
    await expect(page.getByText("Approved by you. Not dispatched yet.")).toBeVisible();
  });
});
