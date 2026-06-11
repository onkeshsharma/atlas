/**
 * M9 — the daemon against a fake Atlas: the typed vocabulary exercised
 * end-to-end from the Bridge side (charter §9 "protocol fake-Bridge ↔
 * fake-Atlas"), with the FAKE Engine (real child processes) and REAL
 * git worktrees in temp dirs.
 *
 * Covers: full owner flow (claim → worktree → stdout → review-ready +
 * real diff stats), needs-input → answer → resume, cancel kills the
 * child + prunes, helper enrich deliverable, honest no-repo failure,
 * offline queueing (dispatch while disconnected; reconnect dispatches),
 * orphan sweep (bridge-lost + needs-input cancel), heartbeat cap.
 */
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeAll, afterAll, describe, expect, it } from "vitest";

import { AtlasClient } from "../src/atlas-client.ts";
import { Daemon } from "../src/daemon.ts";
import { fakeEngineAdapter } from "../src/engine/fake.ts";
import { gitExec, runWorktreePath } from "../src/worktrees.ts";
import { FakeAtlas, waitFor } from "./fake-atlas.ts";

let repoDir: string;
let dataDir: string;
let atlas: FakeAtlas;
let daemon: Daemon | null = null;

async function git(args: string[], cwd: string) {
  const r = await gitExec(args, { cwd });
  if (r.exitCode !== 0) throw new Error(`git ${args[0]} failed: ${r.stderr}`);
}

beforeAll(async () => {
  repoDir = await mkdtemp(join(tmpdir(), "m9-daemon-repo-"));
  await git(["init", "-b", "main"], repoDir);
  await writeFile(join(repoDir, "README.md"), "# daemon fixture\n");
  await git(["add", "-A"], repoDir);
  await git(
    ["-c", "user.name=m9", "-c", "user.email=m9@test.local", "commit", "-m", "init"],
    repoDir,
  );
});

afterAll(async () => {
  await rm(repoDir, { recursive: true, force: true }).catch(() => {});
});

afterEach(async () => {
  await daemon?.stop();
  daemon = null;
  await atlas?.stop();
  await rm(dataDir, { recursive: true, force: true }).catch(() => {});
});

async function bootDaemon(): Promise<Daemon> {
  dataDir = await mkdtemp(join(tmpdir(), "m9-daemon-data-"));
  const client = new AtlasClient({ atlasUrl: atlas.url, token: atlas.token });
  daemon = new Daemon({
    client,
    engine: fakeEngineAdapter(),
    atlasUrl: atlas.url,
    token: atlas.token,
    dataDir,
    tickMs: 100,
    heartbeatMs: 500,
    engineTimeoutMs: 60_000,
  });
  void daemon.start().catch(() => {});
  return daemon;
}

describe("daemon ↔ fake Atlas", () => {
  it("full owner flow: claim → real worktree → stdout chunks → review-ready with REAL diff stats", async () => {
    atlas = new FakeAtlas();
    await atlas.start();
    await bootDaemon();
    await waitFor(() => atlas.heartbeats.length > 0, "first heartbeat");

    const run = atlas.enqueueRun({ localPath: repoDir, title: "Default story run" });
    await waitFor(() => atlas.runs.get(run.runId)!.state === "review-ready", "review-ready");

    const finished = atlas.runs.get(run.runId)!;
    expect(finished.worktreePath).toBe(runWorktreePath(dataDir, run.runId));
    expect(finished.branch).toBe(`atlas/run/${run.runId}`);
    // stdout streamed up as numbered chunks
    expect(finished.stdout.size).toBeGreaterThan(0);
    expect([...finished.stdout.values()].join("")).toContain("engine session start");
    // the fake engine wrote a file → REAL git numstat reported it
    const diff = finished.diffStats as { filesChanged: number } | null;
    expect(diff?.filesChanged).toBeGreaterThan(0);
    // review-ready KEEPS the worktree (ship needs it — Session B)
    expect(existsSync(runWorktreePath(dataDir, run.runId))).toBe(true);
  });

  it("needs-input: question posted up, answer command resumes the session", async () => {
    atlas = new FakeAtlas();
    await atlas.start();
    await bootDaemon();

    const run = atlas.enqueueRun({
      localPath: repoDir,
      briefBody: '@fake:ask {"kind":"question","prompt":"Which env?"}\n@fake:line resumed',
    });
    await waitFor(() => atlas.runs.get(run.runId)!.state === "needs-input", "needs-input");
    expect(atlas.runs.get(run.runId)!.question?.prompt).toBe("Which env?");

    atlas.answerRun(run.runId, {
      text: "staging",
      answeredBy: "you",
      answeredAt: new Date().toISOString(),
    });
    await waitFor(() => atlas.runs.get(run.runId)!.state === "review-ready", "resumed to done");
    expect([...atlas.runs.get(run.runId)!.stdout.values()].join("")).toContain(
      "answered: staging",
    );
  });

  it("cancel: the cockpit flips the row; the daemon kills the child and prunes the worktree", async () => {
    atlas = new FakeAtlas();
    await atlas.start();
    await bootDaemon();

    const run = atlas.enqueueRun({ localPath: repoDir, briefBody: "@fake:hang" });
    await waitFor(
      () => [...atlas.runs.get(run.runId)!.stdout.values()].join("").includes("hanging"),
      "engine hanging",
    );
    expect(atlas.cancelRun(run.runId)).toBe(true);
    await waitFor(() => daemon!.snapshot().running.length === 0, "execution drained");
    expect(atlas.runs.get(run.runId)!.state).toBe("cancelled"); // no late posts flipped it
    await waitFor(
      () => !existsSync(runWorktreePath(dataDir, run.runId)),
      "worktree pruned",
    );
  });

  it("helper enrich: deliverable posted, run shipped, no worktree needed", async () => {
    atlas = new FakeAtlas();
    await atlas.start();
    await bootDaemon();

    const run = atlas.enqueueRun({ lane: "helper", helperKind: "enrich-ticket" });
    await waitFor(() => atlas.runs.get(run.runId)!.state === "shipped", "helper shipped");
    const result = atlas.runs.get(run.runId)!.helperResult as {
      kind: string;
      enrichment: { likelyFiles: string[] };
    };
    expect(result.kind).toBe("enrich-ticket");
    expect(result.enrichment.likelyFiles.length).toBeGreaterThan(0);
  });

  it("honest failure: an owner run on a repo-less project fails with no-repo", async () => {
    atlas = new FakeAtlas();
    await atlas.start();
    await bootDaemon();

    const run = atlas.enqueueRun({ localPath: null });
    await waitFor(() => atlas.runs.get(run.runId)!.state === "failed", "failed");
    expect(atlas.runs.get(run.runId)!.failureKind).toBe("no-repo");
  });

  it("OFFLINE QUEUEING (PRD #35): dispatched while Atlas is unreachable; reconnect dispatches", async () => {
    atlas = new FakeAtlas();
    await atlas.start();
    await bootDaemon();
    await waitFor(() => atlas.heartbeats.length > 0, "connected once");

    // Atlas goes away (deploy, network) — the daemon starts backing off
    await atlas.stop();
    const run = atlas.enqueueRun({ localPath: repoDir, title: "Queued while offline" });
    await new Promise((r) => setTimeout(r, 1_200)); // sit through a backoff round

    await atlas.restart(); // same port — the daemon's next attempt re-syncs
    await waitFor(
      () => atlas.runs.get(run.runId)!.state === "review-ready",
      "queued run dispatched after reconnect",
      20_000,
    );
  });

  it("orphan sweep: running → failed(bridge-lost); needs-input → cancelled", async () => {
    atlas = new FakeAtlas();
    const orphanRunning = atlas.seedActive("running");
    const orphanAsking = atlas.seedActive("needs-input");
    await atlas.start();
    await bootDaemon();

    await waitFor(
      () =>
        atlas.runs.get(orphanRunning.runId)!.state === "failed" &&
        atlas.runs.get(orphanAsking.runId)!.state === "cancelled",
      "orphans swept",
    );
    expect(atlas.runs.get(orphanRunning.runId)!.failureKind).toBe("bridge-lost");
  });

  it("the cap holds: two owner runs, cap 1 — never more than one executing", async () => {
    atlas = new FakeAtlas();
    atlas.cap = 1;
    await atlas.start();
    await bootDaemon();

    atlas.enqueueRun({ localPath: repoDir, briefBody: "@fake:sleep 600\n@fake:line one done" });
    atlas.enqueueRun({ localPath: repoDir, briefBody: "@fake:sleep 600\n@fake:line two done" });

    const sampled = daemon!;
    let maxRunning = 0;
    const sample = setInterval(() => {
      maxRunning = Math.max(maxRunning, sampled.snapshot().running.length);
    }, 25);
    await waitFor(
      () => [...atlas.runs.values()].every((r) => r.state === "review-ready"),
      "both runs finished",
      25_000,
    );
    clearInterval(sample);
    expect(maxRunning).toBe(1);
  });
});
