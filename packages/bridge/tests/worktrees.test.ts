/**
 * M9 — worktree lifecycle against REAL git in temp dirs (charter §9 /
 * PRD heavy tier: "Bridge orchestrator (against real git worktrees in
 * temp dirs)").
 */
import { mkdtemp, rm, writeFile, mkdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  captureDiffStats,
  createRunWorktree,
  gitExec,
  removeRunWorktree,
  runWorktreePath,
  WorktreeError,
} from "../src/worktrees.ts";

let repoDir: string;
let dataDir: string;

async function git(args: string[], cwd: string) {
  const r = await gitExec(args, { cwd });
  if (r.exitCode !== 0) throw new Error(`git ${args[0]} failed: ${r.stderr}`);
  return r;
}

beforeAll(async () => {
  repoDir = await mkdtemp(join(tmpdir(), "m9-repo-"));
  dataDir = await mkdtemp(join(tmpdir(), "m9-data-"));
  await git(["init", "-b", "main"], repoDir);
  await writeFile(join(repoDir, "README.md"), "# fixture\n");
  await git(["add", "-A"], repoDir);
  await git(
    ["-c", "user.name=m9-test", "-c", "user.email=m9@test.local", "commit", "-m", "init"],
    repoDir,
  );
});

afterAll(async () => {
  await rm(dataDir, { recursive: true, force: true }).catch(() => {});
  await rm(repoDir, { recursive: true, force: true }).catch(() => {});
});

describe("createRunWorktree", () => {
  it("creates the per-run worktree on its own branch off HEAD", async () => {
    const created = await createRunWorktree({ repoDir, runId: "run-a", dataDir });
    expect(created.path).toBe(runWorktreePath(dataDir, "run-a"));
    expect(created.branch).toBe("atlas/run/run-a");
    await expect(stat(join(created.path, "README.md"))).resolves.toBeTruthy();

    const branches = await git(["branch", "--list", "atlas/run/run-a"], repoDir);
    expect(branches.stdout).toContain("atlas/run/run-a");
  });

  it("two runs on one project get DISJOINT working copies (ADR-0001 §3)", async () => {
    const b = await createRunWorktree({ repoDir, runId: "run-b", dataDir });
    const c = await createRunWorktree({ repoDir, runId: "run-c", dataDir });
    await writeFile(join(b.path, "only-in-b.txt"), "b\n");
    const bStats = await captureDiffStats({ worktree: b.path });
    const cStats = await captureDiffStats({ worktree: c.path });
    expect(bStats?.filesChanged).toBe(1);
    expect(cStats?.filesChanged).toBe(0);
  });

  it("throws WorktreeError against a non-repo", async () => {
    const notARepo = await mkdtemp(join(tmpdir(), "m9-notrepo-"));
    await expect(
      createRunWorktree({ repoDir: notARepo, runId: "run-x", dataDir }),
    ).rejects.toBeInstanceOf(WorktreeError);
    await rm(notARepo, { recursive: true, force: true });
  });
});

describe("captureDiffStats", () => {
  it("reads real numstat: new + modified files, insertions and deletions", async () => {
    const created = await createRunWorktree({ repoDir, runId: "run-d", dataDir });
    await writeFile(join(created.path, "README.md"), "# fixture\nrewritten\n");
    await mkdir(join(created.path, "src"), { recursive: true });
    await writeFile(join(created.path, "src", "new.ts"), "export const a = 1;\nexport const b = 2;\n");

    const stats = await captureDiffStats({ worktree: created.path });
    expect(stats).not.toBeNull();
    expect(stats!.filesChanged).toBe(2);
    expect(stats!.insertions).toBeGreaterThanOrEqual(3);
    const paths = stats!.files.map((f) => f.path).sort();
    expect(paths).toEqual(["README.md", "src/new.ts"]);
  });

  it("returns an empty-but-valid shape for an untouched worktree", async () => {
    const created = await createRunWorktree({ repoDir, runId: "run-e", dataDir });
    const stats = await captureDiffStats({ worktree: created.path });
    expect(stats).toEqual({ filesChanged: 0, insertions: 0, deletions: 0, files: [] });
  });
});

describe("removeRunWorktree", () => {
  it("prunes worktree, branch, and dir; a second prune is a clean no-op", async () => {
    const created = await createRunWorktree({ repoDir, runId: "run-f", dataDir });
    await removeRunWorktree({ repoDir, runId: "run-f", dataDir });
    await expect(stat(created.path)).rejects.toThrow();
    const branches = await git(["branch", "--list", "atlas/run/run-f"], repoDir);
    expect(branches.stdout.trim()).toBe("");
    // idempotent
    await removeRunWorktree({ repoDir, runId: "run-f", dataDir });
  });
});
