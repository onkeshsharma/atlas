/**
 * M18 — clone-on-dispatch: resolve a project's local checkout, cloning
 * from repo_url if no local path exists yet.
 *
 * Default projects home: ~/atlas/projects/<slug>
 * Override: ATLAS_PROJECTS_HOME (absolute path env var).
 *
 * Clone uses the machine's ambient git credentials (no PAT storage —
 * the v2 hard wall: charter §"Hard walls").
 *
 * Non-fatal: errors are returned, never thrown past the runner.
 * Cheap on reuse: one `rev-parse` when the dest already exists.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";

import type { GitExecFn } from "./worktrees.ts";
import { gitExec } from "./worktrees.ts";

export function resolveProjectsHome(): string {
  return process.env.ATLAS_PROJECTS_HOME?.trim() || join(os.homedir(), "atlas", "projects");
}

export function projectRepoDir(home: string, slug: string): string {
  return join(home, slug);
}

export type EnsureClonedRepoArgs = {
  repoUrl: string;
  slug: string;
  projectsHome: string;
  exec?: GitExecFn;
};

export type EnsureClonedRepoResult =
  | { ok: true; path: string; cloned: boolean }
  | { ok: false; detail: string };

/**
 * Ensure a cloned repo exists at ~/atlas/projects/<slug>.
 * - If dest is a git work tree → reuse (idempotent, one rev-parse).
 * - If dest exists but is NOT a git repo (and is non-empty) → error.
 * - Else `git clone <repoUrl> <dest>`.
 */
export async function ensureClonedRepo(
  args: EnsureClonedRepoArgs,
): Promise<EnsureClonedRepoResult> {
  const exec = args.exec ?? gitExec;
  const dest = projectRepoDir(args.projectsHome, args.slug);

  // ensure the home dir exists (mkdir -p).
  await mkdir(args.projectsHome, { recursive: true });

  if (existsSync(dest)) {
    // cheap probe: is this already a git work tree?
    const probe = await exec(["rev-parse", "--is-inside-work-tree"], { cwd: dest });
    if (probe.exitCode === 0 && probe.stdout.trim() === "true") {
      // reuse — idempotent; do NOT re-clone or pull.
      return { ok: true, path: dest, cloned: false };
    }
    // dest exists but is not a git repo (non-empty dir, stale download, etc.).
    return {
      ok: false,
      detail: `${dest} exists and is not an Atlas clone — move or remove it and dispatch again`,
    };
  }

  // fresh clone
  const result = await exec(["clone", args.repoUrl, dest], { cwd: args.projectsHome });
  if (result.exitCode === 0) {
    return { ok: true, path: dest, cloned: true };
  }
  return {
    ok: false,
    detail: result.stderr.trim() || result.stdout.trim() || `git clone exited ${result.exitCode}`,
  };
}
