/**
 * M10 — the daemon's doctor (PRD #34): honest preflight, checks derived
 * from the failure kinds the runner can actually produce (HANDOFF-M9
 * "Doctor hooks"): `no-repo` → every project local_path exists and is a
 * git repo; `worktree-failed` → git itself works; `gh-cli-error` → gh
 * presence/auth (remote ships); plus the Atlas auth+DB round-trip
 * (sync), the stale-kept-worktree sweep (HANDOFF-M9 ruling 2), the
 * single-instance lock, and the Engine binary when the flavor is real.
 *
 * Pure assembly over an injectable exec/fs seam — table-tested without
 * spawning anything.
 */
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

import type { BridgeDoctorResult, DoctorCheck } from "./protocol.ts";

export type ExecProbe = (
  cmd: string,
  args: string[],
) => Promise<{ exitCode: number; stdout: string; stderr: string }>;

/**
 * BP3 — DEP0190 fix: shell:false everywhere; on Windows use cmd.exe /C.
 *
 * Node 24 emits DEP0190 when `shell:true` is combined with a separate args
 * array (the args are concatenated, not escaped — security + deprecation).
 * Fix: shell:false everywhere. On Windows, npm-installed bins are .cmd batch
 * wrappers that require cmd.exe to run; we invoke them as:
 *   spawn('cmd.exe', ['/C', cmd, ...args], { shell: false })
 * This is semantically equivalent and suppresses DEP0190.
 * On non-Windows (and for .exe suffixed commands on Windows), shell:false
 * with direct args is always safe.
 */
export function execProbe(cmd: string, args: string[]): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const isWin = process.platform === "win32";
  // On Windows non-exe commands need cmd.exe /C to run npm-installed .cmd shims.
  const spawnCmd = isWin && !cmd.endsWith(".exe") ? "cmd.exe" : cmd;
  const spawnArgs = isWin && !cmd.endsWith(".exe") ? ["/C", cmd, ...args] : args;

  return new Promise((resolve) => {
    const child = spawn(spawnCmd, spawnArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (b: Buffer) => (stdout += b.toString("utf8")));
    child.stderr?.on("data", (b: Buffer) => (stderr += b.toString("utf8")));
    child.on("error", (err) => resolve({ exitCode: -1, stdout, stderr: String(err) }));
    child.on("exit", (code) => resolve({ exitCode: code ?? -1, stdout, stderr }));
  });
}

function firstLine(s: string): string {
  return s.split(/\r?\n/, 1)[0]?.trim() ?? "";
}

export type DoctorContext = {
  /** the request's inputs (Atlas-known facts the daemon can't derive). */
  projects: Array<{ slug: string; localPath: string }>;
  keepWorktreeRunIds: string[];
  /** daemon facts. */
  version: string;
  engine: "real" | "fake";
  lockPort: number;
  dataDir: string;
  runningRunIds: string[];
  /** seams (injectable for tests). */
  exec?: ExecProbe;
  /** Atlas round-trip probe — sync() is auth + DB end to end. */
  syncProbe: () => Promise<{ cap: number; queued: number }>;
  listWorktreeDirs?: (dataDir: string) => string[];
  pathExists?: (path: string) => boolean;
};

function defaultListWorktreeDirs(dataDir: string): string[] {
  try {
    return readdirSync(join(dataDir, "worktrees"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

export async function runDoctor(ctx: DoctorContext): Promise<BridgeDoctorResult> {
  const exec = ctx.exec ?? execProbe;
  const listDirs = ctx.listWorktreeDirs ?? defaultListWorktreeDirs;
  const checks: DoctorCheck[] = [];

  // 1 — Atlas reachable, token good, DB answering (sync is the cheap
  //     end-to-end probe — HANDOFF-M9).
  try {
    const sync = await ctx.syncProbe();
    checks.push({
      key: "atlas-sync",
      label: "Atlas reachable · auth + DB round-trip",
      status: "pass",
      detail: `cap ${sync.cap} · ${sync.queued} queued`,
    });
  } catch (err) {
    checks.push({
      key: "atlas-sync",
      label: "Atlas reachable · auth + DB round-trip",
      status: "fail",
      detail: firstLine(String(err)) || "sync failed",
    });
  }

  // 2 — git works at all (`worktree-failed` territory).
  const git = await exec("git", ["--version"]);
  checks.push({
    key: "git",
    label: "git available",
    status: git.exitCode === 0 ? "pass" : "fail",
    detail:
      git.exitCode === 0 ? firstLine(git.stdout) : firstLine(git.stderr) || "git not found",
  });

  // 3 — gh auth (`gh-cli-error` territory). Warn, not fail: local-merge
  //     ships work without it; remote ships honestly say so.
  const gh = await exec("gh", ["auth", "status"]);
  checks.push({
    key: "gh",
    label: "GitHub CLI auth",
    status: gh.exitCode === 0 ? "pass" : "warn",
    detail:
      gh.exitCode === 0
        ? "authenticated"
        : "gh missing or signed out — remote ships will fail honest (gh-cli-error)",
  });

  // 4 — every project working copy (`no-repo` territory), one check each.
  for (const project of ctx.projects) {
    const probe = await exec("git", ["-C", project.localPath, "rev-parse", "--git-dir"]);
    checks.push({
      key: `repo:${project.slug}`,
      label: `repo · ${project.slug}`,
      status: probe.exitCode === 0 ? "pass" : "fail",
      detail:
        probe.exitCode === 0
          ? project.localPath
          : `${project.localPath} — ${firstLine(probe.stderr) || "not a git repository"}`,
    });
  }
  if (ctx.projects.length === 0) {
    checks.push({
      key: "repos",
      label: "project working copies",
      status: "warn",
      detail: "no project has a local_path yet — dispatch will fail honest (no-repo)",
    });
  }

  // 5 — stale kept worktrees (HANDOFF-M9 ruling 2): anything on disk
  //     that is neither running here nor legitimately kept (review-ready).
  const legit = new Set([...ctx.keepWorktreeRunIds, ...ctx.runningRunIds]);
  const stale = listDirs(ctx.dataDir).filter((dir) => !legit.has(dir));
  checks.push({
    key: "worktrees",
    label: "kept worktrees",
    status: stale.length === 0 ? "pass" : "warn",
    detail:
      stale.length === 0
        ? "no stale worktrees on disk"
        : `${stale.length} stale (kept past their run): ${stale.slice(0, 3).join(", ")}${stale.length > 3 ? "…" : ""}`,
  });

  // 6 — single-instance lock sanity: this process IS the holder.
  checks.push({
    key: "lock",
    label: "single-instance lock",
    status: "pass",
    detail: `127.0.0.1:${ctx.lockPort} held by pid ${process.pid}`,
  });

  // 7 — the Engine binary, real flavor only (fake is the suites' engine
  //     by design — nothing to probe).
  if (ctx.engine === "real") {
    const claude = await exec("claude", ["--version"]);
    checks.push({
      key: "engine",
      label: "Engine (claude) on PATH",
      status: claude.exitCode === 0 ? "pass" : "fail",
      detail:
        claude.exitCode === 0
          ? firstLine(claude.stdout)
          : "claude not found — real Runs cannot start",
    });
  } else {
    checks.push({
      key: "engine",
      label: "Engine flavor",
      status: "pass",
      detail: "fake engine (suite mode) — nothing to probe",
    });
  }

  return {
    ranAt: new Date().toISOString(),
    version: ctx.version,
    engine: ctx.engine,
    lockPort: ctx.lockPort,
    checks,
  };
}
