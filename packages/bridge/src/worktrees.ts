/**
 * Worktree-per-Run lifecycle against real git (ADR-0001 §3; v1 prior
 * art: lib/git-ops.ts, rewritten — v2 drops the clone/PAT machinery:
 * the repo already lives on the Owner's machine at projects.local_path;
 * remote auth is Session B's ship concern).
 *
 * Branch: atlas/run/<runId>. Worktree: <dataDir>/worktrees/<runId>.
 * Removal is best-effort (the dir may already be gone) — v1 T33 rule.
 */
import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import type { RunDiffStats } from "./protocol.ts";

export type GitResult = { stdout: string; stderr: string; exitCode: number };

export type GitExecFn = (args: string[], options?: { cwd?: string }) => Promise<GitResult>;

export function gitExec(args: string[], options: { cwd?: string } = {}): Promise<GitResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      // Windows: without this every git invocation flashes a console window.
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b: Buffer) => (stdout += b.toString("utf8")));
    child.stderr.on("data", (b: Buffer) => (stderr += b.toString("utf8")));
    child.on("error", reject);
    child.on("exit", (code) => resolve({ stdout, stderr, exitCode: code ?? -1 }));
  });
}

export function runWorktreePath(dataDir: string, runId: string): string {
  return join(dataDir, "worktrees", runId);
}

export function runBranch(runId: string): string {
  return `atlas/run/${runId}`;
}

export class WorktreeError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "WorktreeError";
  }
}

/** create the run's worktree on a fresh branch off HEAD. */
export async function createRunWorktree(args: {
  repoDir: string;
  runId: string;
  dataDir: string;
  exec?: GitExecFn;
}): Promise<{ path: string; branch: string }> {
  const exec = args.exec ?? gitExec;
  const path = runWorktreePath(args.dataDir, args.runId);
  const branch = runBranch(args.runId);
  await mkdir(join(args.dataDir, "worktrees"), { recursive: true });
  const r = await exec(["worktree", "add", "-b", branch, path, "HEAD"], { cwd: args.repoDir });
  if (r.exitCode !== 0) {
    throw new WorktreeError(r.stderr.trim() || r.stdout.trim() || `exit ${r.exitCode}`);
  }
  return { path, branch };
}

/** best-effort prune: worktree, branch, dir (disk hygiene on terminal states). */
export async function removeRunWorktree(args: {
  repoDir: string;
  runId: string;
  dataDir: string;
  exec?: GitExecFn;
}): Promise<void> {
  const exec = args.exec ?? gitExec;
  const path = runWorktreePath(args.dataDir, args.runId);
  await exec(["worktree", "remove", "--force", path], { cwd: args.repoDir }).catch(() => {});
  await exec(["branch", "-D", runBranch(args.runId)], { cwd: args.repoDir }).catch(() => {});
  await rm(path, { recursive: true, force: true }).catch(() => {});
}

/**
 * Session B — the full unified diff for KK's hunks (`git diff --cached`
 * after captureDiffStats staged everything). Capped so a generated-file
 * avalanche can't bloat the runs row; the marker is parsed app-side
 * (src/domain/run/diff-patch.ts) into an honest "truncated" line.
 */
export const DIFF_PATCH_MAX_CHARS = 400_000;
export const DIFF_TRUNCATION_MARKER = "\n…atlas: diff truncated…\n";

export async function captureDiffPatch(args: {
  worktree: string;
  exec?: GitExecFn;
}): Promise<string | null> {
  const exec = args.exec ?? gitExec;
  const diff = await exec(["diff", "--cached"], { cwd: args.worktree });
  if (diff.exitCode !== 0) return null;
  if (diff.stdout.length <= DIFF_PATCH_MAX_CHARS) return diff.stdout;
  return diff.stdout.slice(0, DIFF_PATCH_MAX_CHARS) + DIFF_TRUNCATION_MARKER;
}

/**
 * Stage everything and read the run's real diff stats (`git add -A` +
 * `git diff --cached --numstat` in the run's OWN worktree — staging is
 * private to the run; Session B's ship commits from here). Binary files
 * report "-" counts → 0.
 */
export async function captureDiffStats(args: {
  worktree: string;
  exec?: GitExecFn;
}): Promise<RunDiffStats | null> {
  const exec = args.exec ?? gitExec;
  const add = await exec(["add", "-A"], { cwd: args.worktree });
  if (add.exitCode !== 0) return null;
  const diff = await exec(["diff", "--cached", "--numstat"], { cwd: args.worktree });
  if (diff.exitCode !== 0) return null;

  const files = diff.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [ins, del, ...pathParts] = line.split("\t");
      return {
        path: pathParts.join("\t"),
        insertions: ins === "-" ? 0 : Number(ins) || 0,
        deletions: del === "-" ? 0 : Number(del) || 0,
      };
    })
    .filter((f) => f.path.length > 0);

  return {
    filesChanged: files.length,
    insertions: files.reduce((sum, f) => sum + f.insertions, 0),
    deletions: files.reduce((sum, f) => sum + f.deletions, 0),
    files,
  };
}
