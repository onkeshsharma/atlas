// M9 Session B — THE SHIP LOOP, Playwright-asserted (charter done
// criterion 1, back half): dispatch → review-ready → KK's real hunks →
// Approve & ship → the daemon lands a REAL merge in a temp git repo →
// the open browser swaps to the V shipped page, the ticket closes
// shipped. Plus the CONFLICT + send-back recovery (PRD #22–23) and the
// W composer flow (edit the Helper-drafted Brief → dispatch — PRD #19).
// Same harness as m9-engine.spec.ts (the worked example): real daemon,
// fake Engine, own lock port, self-cleaning, reseeds afterAll.
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";
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
const OWNER_EMAIL = `e2e-m9b-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const BRIDGE_TOKEN = `e2e-bridge-${randomBytes(12).toString("hex")}`;

const PROJECT_NAME = `E2E m9b project ${RUN}`;
const SHIP_TITLE = `E2E ship loop ${RUN}`;
const CONFLICT_TITLE = `E2E conflict loop ${RUN}`;
const COMPOSER_TITLE = `E2E composer loop ${RUN}`;

let daemon: ChildProcess | null = null;
let daemonLog = "";
let repoDir: string;
let dataDir: string;
let projectId: string;

function git(args: string, cwd: string) {
  execSync(`git ${args}`, { cwd });
}

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: /^sign in/i }).click();
  await expect(page).toHaveURL(/\/today/, { timeout: 30_000 });
}

async function cleanupE2ERows() {
  const e2eProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(like(projects.name, "E2E m9b %"));
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
  await db.delete(bridges).where(like(bridges.name, "E2E m9b %"));
  const e2eMembers = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M9B %"));
  if (e2eMembers.length) {
    await db
      .delete(userPreferences)
      .where(inArray(userPreferences.userId, e2eMembers.map((m) => m.userId)));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E M9B %"));
}

/** seeded approved ticket + a pre-drafted Brief (one-click dispatch — the m9 CANCEL idiom). */
async function seedDispatchable(title: string, brief: string) {
  const [ticket] = await db
    .insert(tickets)
    .values({
      ref: `E2E9B-${randomBytes(3).toString("hex")}`,
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
  const rows = await db
    .select()
    .from(runs)
    .where(and(eq(runs.ticketId, ticketId), eq(runs.lane, "owner")));
  return rows;
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

  // park seeded queued runs — our daemon would claim them (m9 law)
  await db
    .update(runs)
    .set({ state: "cancelled" })
    .where(and(eq(runs.seeded, true), eq(runs.state, "queued")));

  repoDir = mkdtempSync(join(tmpdir(), "m9b-e2e-repo-"));
  dataDir = mkdtempSync(join(tmpdir(), "m9b-e2e-bridge-"));
  git("init -b main", repoDir);
  writeFileSync(join(repoDir, "README.md"), "# e2e fixture\noriginal line\n");
  git("add -A", repoDir);
  git('-c user.name=e2e -c user.email=e2e@test.local commit -m init', repoDir);

  await db.insert(bridges).values({
    name: `E2E m9b bridge ${RUN}`,
    tokenHash: createHash("sha256").update(BRIDGE_TOKEN, "utf8").digest("hex"),
  });

  const [project] = await db
    .insert(projects)
    .values({
      name: PROJECT_NAME,
      slug: `e2e-m9b-${RUN}`,
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
        ATLAS_BRIDGE_LOCK_PORT: "9224", // m9-engine holds 9223
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
      .where(eq(bridges.name, `E2E m9b bridge ${RUN}`));
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

test.describe.serial("M9 Session B — review and ship are one motion", () => {
  test("owner bootstrap", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M9B Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("THE SHIP LOOP: dispatch → review-ready → KK real hunks → Approve & ship → V shipped page, live; ticket shipped; the merge is REAL", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await signIn(page);

    const ticket = await seedDispatchable(
      SHIP_TITLE,
      ["@fake:line building the export", "@fake:write export.md the export change"].join("\n"),
    );

    // dispatch (one click — the Brief is pre-drafted)
    await page.goto(`/tickets/${ticket.ref}`);
    await page.getByRole("button", { name: /dispatch to ai/i }).click();
    await expect(page.getByText("A Run owns this Ticket right now.")).toBeVisible({
      timeout: 60_000,
    });

    const [run] = await ownerRunFor(ticket.id);
    await waitForRunState(run.id, "review-ready");

    // the detail page goes review-ready LIVE and grows the diff ghost
    await expect(page.getByText("The Run finished — ready for your review.")).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole("link", { name: /review the diff/i }).click();
    await expect(page).toHaveURL(new RegExp(`/runs/${run.ref}/diff`), { timeout: 30_000 });

    // KK renders the REAL hunks the Bridge uploaded
    await expect(page.getByRole("heading", { name: SHIP_TITLE })).toBeVisible();
    await expect(page.getByText("export.md").first()).toBeVisible();
    await expect(page.getByText("the export change").first()).toBeVisible(); // an actual + line

    // THE emerald CTA (PRD #25)
    await page.getByRole("button", { name: /approve & ship/i }).click();

    // the daemon lands the merge; the open tab swaps to the V page by itself
    await expect(page.getByText(`Atlas shipped ${ticket.ref}.`)).toBeVisible({
      timeout: 120_000,
    });
    await expect(page).toHaveURL(new RegExp(`/runs/${run.ref}$`));
    await expect(page.getByText("what shipped")).toBeVisible();
    await expect(page.getByText("Merge commit")).toBeVisible();

    // the rows + the REPO tell the whole story
    const [shipped] = await db.select().from(runs).where(eq(runs.id, run.id));
    expect(shipped.state).toBe("shipped");
    expect(shipped.mergeSha).toMatch(/^[0-9a-f]{40}$/);
    const head = execSync("git rev-parse HEAD", { cwd: repoDir }).toString().trim();
    expect(head).toBe(shipped.mergeSha);
    const files = execSync("git ls-tree --name-only HEAD", { cwd: repoDir }).toString();
    expect(files).toContain("export.md");
    expect(existsSync(join(dataDir, "worktrees", run.id))).toBe(false); // pruned after landing

    const [trow] = await db.select().from(tickets).where(eq(tickets.id, ticket.id));
    expect(trow.state).toBe("shipped");

    const kinds = (
      await db.select({ kind: feedEvents.kind }).from(feedEvents).where(eq(feedEvents.runId, run.id))
    ).map((r) => r.kind);
    for (const kind of ["dispatched", "started", "review-ready", "ship-requested", "shipped"]) {
      expect(kinds).toContain(kind);
    }
  });

  test("CONFLICT + SEND-BACK (PRD #22–23): the merge conflicts → K's rose page → one click re-runs → the recovery ships", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await signIn(page);

    const ticket = await seedDispatchable(
      CONFLICT_TITLE,
      ["@fake:line rewriting the readme", "@fake:write README.md rewritten by the run"].join("\n"),
    );

    await page.goto(`/tickets/${ticket.ref}`);
    await page.getByRole("button", { name: /dispatch to ai/i }).click();
    await expect(page.getByText("A Run owns this Ticket right now.")).toBeVisible({
      timeout: 60_000,
    });
    const [run] = await ownerRunFor(ticket.id);
    await waitForRunState(run.id, "review-ready");

    // main moves UNDER the kept worktree — the same file, different content
    writeFileSync(join(repoDir, "README.md"), "# e2e fixture\nmoved on main meanwhile\n");
    git("add -A", repoDir);
    git('-c user.name=e2e -c user.email=e2e@test.local commit -m "main moved"', repoDir);

    await page.goto(`/runs/${run.ref}/diff`);
    await page.getByRole("button", { name: /approve & ship/i }).click();

    // honest failure: the run page swaps to K's rose framing, live
    // (typographic apostrophe — &rsquo; in the heading)
    await expect(page.getByText(new RegExp(`Engine couldn.t ship ${ticket.ref}\\.`))).toBeVisible({
      timeout: 120_000,
    });
    await expect(page).toHaveURL(new RegExp(`/runs/${run.ref}$`));
    await expect(page.getByText("conflicting files: README.md", { exact: false })).toBeVisible();

    const [failedRun] = await db.select().from(runs).where(eq(runs.id, run.id));
    expect(failedRun.state).toBe("failed");
    expect(failedRun.failureKind).toBe("conflict");
    const [failedTicket] = await db.select().from(tickets).where(eq(tickets.id, ticket.id));
    expect(failedTicket.state).toBe("failed");

    // ONE CLICK: send back to the Engine (PRD #23). The old URL already
    // matches /runs/R-…, so wait on the NEW run row, then on its page.
    await page.getByRole("button", { name: /send back to engine/i }).click();
    const retry = await (async () => {
      const deadline = Date.now() + 60_000;
      for (;;) {
        const all = await ownerRunFor(ticket.id);
        const next = all.find((r) => r.id !== run.id);
        if (next) return next;
        if (Date.now() > deadline) {
          throw new Error(`no retry run appeared. daemon log:\n${daemonLog.slice(-2000)}`);
        }
        await new Promise((res) => setTimeout(res, 500));
      }
    })();
    await expect(page).toHaveURL(new RegExp(`/runs/${retry.ref}`), { timeout: 60_000 });
    await waitForRunState(retry.id, "review-ready");

    // the re-run branched off the MOVED main — this time the merge is clean
    await page.goto(`/runs/${retry.ref}/diff`);
    await page.getByRole("button", { name: /approve & ship/i }).click();
    await expect(page.getByText(`Atlas shipped ${ticket.ref}.`)).toBeVisible({
      timeout: 120_000,
    });

    const readme = execSync("git show HEAD:README.md", { cwd: repoDir }).toString();
    expect(readme).toContain("rewritten by the run");
    const [recovered] = await db.select().from(tickets).where(eq(tickets.id, ticket.id));
    expect(recovered.state).toBe("shipped");
    // the re-Brief carried the conflict context and the verbatim story
    const briefRows = await db.select().from(briefs).where(eq(briefs.ticketId, ticket.id));
    const reBrief = briefRows.find((b) => b.source === "owner");
    expect(reBrief?.body).toContain("Conflict context (appended by Atlas)");
  });

  test("W COMPOSER (PRD #19): edit the Helper-drafted Brief → diff tab shows the edit → dispatch runs the EDITED Brief", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await signIn(page);

    const ticket = await seedDispatchable(
      COMPOSER_TITLE,
      "@fake:line from the engine draft\n@fake:write draft.md drafted",
    );

    await page.goto(`/tickets/${ticket.ref}/brief`);
    await expect(page.getByText("drafted by Engine")).toBeVisible();
    await expect(page.getByText("Edit the Brief before dispatching it.", { exact: false })).toBeVisible();

    // edit: append lines the fake Engine will speak out loud (the sleep
    // keeps the run ALIVE long enough to watch RR stream for real)
    const editor = page.getByLabel("Brief body");
    await expect(editor).toHaveValue(/from the engine draft/);
    await editor.fill(
      [
        "@fake:line from the engine draft",
        "@fake:write draft.md drafted",
        "@fake:sleep 8000",
        "@fake:line edited-by-owner",
      ].join("\n"),
    );

    // the autosave indicator settles (W:101 made real)
    await expect(page.getByText(/draft · saved/)).toBeVisible({ timeout: 15_000 });

    // the Diff tab shows EXACTLY the owner's addition
    await page.getByRole("button", { name: "Diff from auto-draft" }).click();
    await expect(page.getByText("@fake:line edited-by-owner")).toBeVisible();

    // dispatch — straight onto the live run page (RR)
    await page.getByRole("button", { name: /dispatch to engine/i }).click();
    await expect(page).toHaveURL(/\/runs\/R-\d+/, { timeout: 60_000 });

    // RR for real: the amber live badge + the Engine's words arriving
    // through the per-run SSE into the kit TerminalBlock (PRD #5)
    await expect(page.getByText("live · streaming")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Working on it.")).toBeVisible();
    await expect(page.getByText("from the engine draft").first()).toBeVisible({
      timeout: 30_000,
    });

    const [run] = await ownerRunFor(ticket.id);
    await waitForRunState(run.id, "review-ready");

    // the Engine executed the EDITED Brief, verbatim
    const stdoutRows = await db
      .select({ content: runStdoutChunks.content })
      .from(runStdoutChunks)
      .where(eq(runStdoutChunks.runId, run.id));
    expect(stdoutRows.map((r) => r.content).join("")).toContain("edited-by-owner");

    const briefRows = await db.select().from(briefs).where(eq(briefs.ticketId, ticket.id));
    const ownerBrief = briefRows.find((b) => b.source === "owner");
    expect(ownerBrief?.status).toBe("final");
    expect(ownerBrief?.body).toContain("edited-by-owner");
  });
});
