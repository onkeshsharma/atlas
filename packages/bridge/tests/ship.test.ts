/**
 * M9 Session B — the ship executor against REAL git in temp dirs
 * (charter §9 heavy tier; PRD #25). Local-merge path end to end:
 * clean landing, conflict (worktree KEPT for inspection), no-changes
 * (pruned), dirty-checkout refusal, re-ship idempotence. The gh/remote
 * path is exercised only through injected stubs — suites never talk to
 * GitHub.
 */
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { WorkOrder } from "../src/protocol.ts";
import { executeShip, type GhExecFn } from "../src/ship.ts";
import { captureDiffStats, createRunWorktree, gitExec, runWorktreePath } from "../src/worktrees.ts";

let repoDir: string;
let dataDir: string;
let runN = 0;

async function git(args: string[], cwd: string) {
  const r = await gitExec(args, { cwd });
  if (r.exitCode !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  return r;
}

const IDENT = ["-c", "user.name=m9-test", "-c", "user.email=m9@test.local"];

beforeEach(async () => {
  repoDir = await mkdtemp(join(tmpdir(), "m9-ship-repo-"));
  dataDir = await mkdtemp(join(tmpdir(), "m9-ship-data-"));
  await git(["init", "-b", "main"], repoDir);
  await writeFile(join(repoDir, "README.md"), "# fixture\nline two\n");
  await git(["add", "-A"], repoDir);
  await git([...IDENT, "commit", "-m", "init"], repoDir);
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true }).catch(() => {});
  await rm(repoDir, { recursive: true, force: true }).catch(() => {});
});

function order(runId: string): WorkOrder {
  return {
    runId,
    ref: `R-${950 + ++runN}`,
    title: "Ship fixture",
    state: "review-ready",
    lane: "owner",
    helperKind: null,
    queuePosition: null,
    project: { id: "p1", name: "fixture", slug: "fixture", localPath: repoDir },
    ticket: {
      id: "t1",
      ref: "T-950",
      title: "Ship fixture ticket",
      body: "story",
      kind: "bug",
      priority: "soon",
    },
    briefBody: null,
    question: null,
  };
}

/** simulate a completed run: worktree + staged change (the runner's numstat staging). */
async function reviewReadyWorktree(runId: string, file = "change.md", content = "the change\n") {
  const created = await createRunWorktree({ repoDir, runId, dataDir });
  await writeFile(join(created.path, file), content);
  await captureDiffStats({ worktree: created.path }); // stages via add -A
  return created;
}

describe("executeShip — local merge path", () => {
  it("commits the staged work and lands it on main with a real merge sha; worktree pruned", async () => {
    await reviewReadyWorktree("ship-clean");
    const outcome = await executeShip({ order: order("ship-clean"), dataDir });
    expect(outcome).toMatchObject({ result: "shipped", prUrl: null });
    if (outcome.result !== "shipped") throw new Error("unreachable");
    expect(outcome.mergeSha).toMatch(/^[0-9a-f]{40}$/);

    const head = await git(["rev-parse", "HEAD"], repoDir);
    expect(head.stdout.trim()).toBe(outcome.mergeSha);
    const show = await git(["show", "--stat", "HEAD"], repoDir);
    expect(show.stdout).toContain("change.md");
    // disk hygiene: the kept worktree is gone after landing
    expect(existsSync(runWorktreePath(dataDir, "ship-clean"))).toBe(false);
  });

  it("a base branch that moved CONFLICTING fails honest `conflict` and KEEPS the worktree (K:135)", async () => {
    await reviewReadyWorktree("ship-conflict", "README.md", "# rewritten by the run\n");
    // main moves under the run — same file, different content
    await writeFile(join(repoDir, "README.md"), "# rewritten on main meanwhile\n");
    await git(["add", "-A"], repoDir);
    await git([...IDENT, "commit", "-m", "main moved"], repoDir);

    const outcome = await executeShip({ order: order("ship-conflict"), dataDir });
    expect(outcome.result).toBe("failed");
    if (outcome.result !== "failed") throw new Error("unreachable");
    expect(outcome.failureKind).toBe("conflict");
    expect(outcome.detail).toContain("README.md");
    // the merge aborted cleanly — main's checkout is pristine
    const status = await git(["status", "--porcelain"], repoDir);
    expect(status.stdout.trim()).toBe("");
    // the branch survives for manual inspection
    expect(existsSync(runWorktreePath(dataDir, "ship-conflict"))).toBe(true);
  });

  it("a base branch that moved WITHOUT overlap still lands (merge, not fast-forward)", async () => {
    await reviewReadyWorktree("ship-diverged", "feature.md", "new feature\n");
    await writeFile(join(repoDir, "other.md"), "unrelated mainline work\n");
    await git(["add", "-A"], repoDir);
    await git([...IDENT, "commit", "-m", "main moved elsewhere"], repoDir);

    const outcome = await executeShip({ order: order("ship-diverged"), dataDir });
    expect(outcome.result).toBe("shipped");
    const files = await git(["ls-tree", "--name-only", "HEAD"], repoDir);
    expect(files.stdout).toContain("feature.md");
    expect(files.stdout).toContain("other.md");
  });

  it("an untouched worktree fails honest `no-changes` and prunes", async () => {
    await createRunWorktree({ repoDir, runId: "ship-empty", dataDir });
    const outcome = await executeShip({ order: order("ship-empty"), dataDir });
    expect(outcome).toMatchObject({ result: "failed", failureKind: "no-changes" });
    expect(existsSync(runWorktreePath(dataDir, "ship-empty"))).toBe(false);
  });

  it("a dirty main checkout refuses with `not-mergeable` — never wrecks the Owner's tree", async () => {
    await reviewReadyWorktree("ship-dirty");
    await writeFile(join(repoDir, "wip.txt"), "uncommitted owner work\n");

    const outcome = await executeShip({ order: order("ship-dirty"), dataDir });
    expect(outcome).toMatchObject({ result: "failed", failureKind: "not-mergeable" });
    if (outcome.result !== "failed") throw new Error("unreachable");
    expect(outcome.detail).toContain("uncommitted");
    // the Owner's WIP file is untouched
    expect(existsSync(join(repoDir, "wip.txt"))).toBe(true);
  });

  it("a missing worktree fails honest `worktree-failed` (daemon restarted, dir gone)", async () => {
    const outcome = await executeShip({ order: order("ship-gone"), dataDir });
    expect(outcome).toMatchObject({ result: "failed", failureKind: "worktree-failed" });
  });

  it("re-shipping after a transient failure is idempotent — the earlier commit is reused, not double-applied", async () => {
    await reviewReadyWorktree("ship-retry");
    const retryOrder = order("ship-retry"); // ONE order — a redelivery carries the same run
    // first attempt refused by a dirty checkout (commit already made)
    await writeFile(join(repoDir, "wip.txt"), "wip\n");
    const first = await executeShip({ order: retryOrder, dataDir });
    expect(first).toMatchObject({ result: "failed", failureKind: "not-mergeable" });
    // the Owner cleans up; the re-ship lands the SAME commit
    await rm(join(repoDir, "wip.txt"));
    const second = await executeShip({ order: retryOrder, dataDir });
    expect(second.result).toBe("shipped");
    const log = await git(["log", "--oneline"], repoDir);
    const shipCommits = log.stdout.split("\n").filter((l) => l.includes("Ship fixture ticket"));
    expect(shipCommits.length).toBe(2); // the work commit + the merge commit, once each
  });
});

describe("executeShip — remote path (gh stubbed; suites never talk to GitHub)", () => {
  async function withOrigin(runId: string) {
    const created = await reviewReadyWorktree(runId);
    // a bare "remote" on disk — push is real git, gh is the stub.
    const bare = await mkdtemp(join(tmpdir(), "m9-ship-origin-"));
    await git(["init", "--bare", "-b", "main"], bare);
    await git(["remote", "add", "origin", bare], repoDir);
    return { created, bare };
  }

  it("pushes the branch, opens + squash-merges the PR through gh, returns url + sha", async () => {
    const { bare } = await withOrigin("ship-gh");
    const calls: string[][] = [];
    const gh: GhExecFn = async (args) => {
      calls.push(args);
      if (args[0] === "--version") return { stdout: "gh 2.x", stderr: "", exitCode: 0 };
      if (args[0] === "pr" && args[1] === "create") {
        return { stdout: "https://github.com/acme/fixture/pull/7\n", stderr: "", exitCode: 0 };
      }
      if (args[0] === "api") {
        return { stdout: "true\nclean\n", stderr: "", exitCode: 0 };
      }
      if (args[0] === "pr" && args[1] === "merge") return { stdout: "", stderr: "", exitCode: 0 };
      if (args[0] === "pr" && args[1] === "view") {
        return { stdout: '{"mergeCommit":{"oid":"abc123"}}', stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: `unexpected gh ${args.join(" ")}`, exitCode: 1 };
    };

    const outcome = await executeShip({ order: order("ship-gh"), dataDir, gh });
    expect(outcome).toMatchObject({
      result: "shipped",
      prUrl: "https://github.com/acme/fixture/pull/7",
      mergeSha: "abc123",
    });
    // the branch really reached the bare origin before gh took over
    const remoteBranches = await git(["branch", "--list", "atlas/run/ship-gh"], bare);
    expect(remoteBranches.stdout).toContain("atlas/run/ship-gh");
    expect(calls.some((c) => c[0] === "pr" && c[1] === "merge")).toBe(true);
    await rm(bare, { recursive: true, force: true }).catch(() => {});
  });

  it("GitHub reporting a dirty PR fails `conflict` and carries the PR url (K:307)", async () => {
    const { bare } = await withOrigin("ship-gh-dirty");
    const gh: GhExecFn = async (args) => {
      if (args[0] === "--version") return { stdout: "gh 2.x", stderr: "", exitCode: 0 };
      if (args[0] === "pr" && args[1] === "create") {
        return { stdout: "https://github.com/acme/fixture/pull/8\n", stderr: "", exitCode: 0 };
      }
      if (args[0] === "api") return { stdout: "false\ndirty\n", stderr: "", exitCode: 0 };
      return { stdout: "", stderr: "unexpected", exitCode: 1 };
    };
    const outcome = await executeShip({ order: order("ship-gh-dirty"), dataDir, gh });
    expect(outcome).toMatchObject({
      result: "failed",
      failureKind: "conflict",
      prUrl: "https://github.com/acme/fixture/pull/8",
    });
    await rm(bare, { recursive: true, force: true }).catch(() => {});
  });

  it("gh missing fails honest `gh-cli-error`", async () => {
    const { bare } = await withOrigin("ship-gh-missing");
    const gh: GhExecFn = async () => {
      throw new Error("spawn gh ENOENT");
    };
    const outcome = await executeShip({ order: order("ship-gh-missing"), dataDir, gh });
    expect(outcome).toMatchObject({ result: "failed", failureKind: "gh-cli-error" });
    await rm(bare, { recursive: true, force: true }).catch(() => {});
  });
});
