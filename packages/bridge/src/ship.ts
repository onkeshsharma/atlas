/**
 * Session B — the ship executor (PRD #25: approve-and-ship is one
 * motion). Runs entirely in git on the Owner's machine, from the run's
 * KEPT review-ready worktree (runner.ts deliberately doesn't prune it).
 *
 * Two landing paths, decided by the repo itself:
 *
 *  - REMOTE (origin configured): push the run branch, open a PR, probe
 *    GitHub's mergeability, squash-merge — v1 prior art read-and-
 *    rewritten from atlas/packages/atlas-bridge/src/lib/gh-cli.ts +
 *    probe-mergeable.ts (v2 drops the PAT store: the Owner's ambient
 *    gh/git auth drives the remote; gh missing or unauthenticated is
 *    the honest `gh-cli-error`).
 *  - LOCAL (no remote): merge --no-ff into the repo's checked-out
 *    branch. Honest preconditions: a dirty checkout or detached HEAD
 *    refuses with `not-mergeable` rather than wrecking the Owner's
 *    working tree. A conflicted merge aborts cleanly → `conflict` with
 *    the conflicting files in the detail (K's framing reads it).
 *
 * Worktree hygiene (decision recorded in HANDOFF-M9): pruned on
 * shipped and on `no-changes`; KEPT on conflict / not-mergeable /
 * gh-cli-error so the Owner can inspect the branch manually (K:135's
 * promise). The conflict send-back dispatches a NEW run with its own
 * worktree either way.
 */
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

import type { WorkOrder } from "./protocol.ts";
import {
  gitExec,
  removeRunWorktree,
  runBranch,
  runWorktreePath,
  type GitExecFn,
  type GitResult,
} from "./worktrees.ts";

export type ShipFailureKind = "conflict" | "not-mergeable" | "gh-cli-error" | "no-changes" | "worktree-failed";

export type ShipOutcome =
  | { result: "shipped"; prUrl: string | null; mergeSha: string | null }
  | { result: "failed"; failureKind: ShipFailureKind; detail: string; prUrl: string | null };

export type GhExecFn = (args: string[], options?: { cwd?: string }) => Promise<GitResult>;

export function ghExec(args: string[], options: { cwd?: string } = {}): Promise<GitResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("gh", args, { cwd: options.cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b: Buffer) => (stdout += b.toString("utf8")));
    child.stderr.on("data", (b: Buffer) => (stderr += b.toString("utf8")));
    child.on("error", reject);
    child.on("exit", (code) => resolve({ stdout, stderr, exitCode: code ?? -1 }));
  });
}

const COMMIT_IDENTITY = ["-c", "user.name=Atlas Engine", "-c", "user.email=engine@atlas.local"];

function detail(r: GitResult): string {
  return (r.stderr.trim() || r.stdout.trim() || `exit ${r.exitCode}`).slice(0, 500);
}

export async function executeShip(args: {
  order: WorkOrder;
  dataDir: string;
  exec?: GitExecFn;
  gh?: GhExecFn;
  log?: (line: string) => void;
}): Promise<ShipOutcome> {
  const exec = args.exec ?? gitExec;
  const gh = args.gh ?? ghExec;
  const log = args.log ?? (() => {});
  const { order } = args;
  const repoDir = order.project.localPath;
  const worktree = runWorktreePath(args.dataDir, order.runId);
  const branch = runBranch(order.runId);

  if (!repoDir) {
    return failed("worktree-failed", `project "${order.project.name}" has no local_path on this machine`);
  }
  if (!existsSync(worktree)) {
    return failed("worktree-failed", "the run's worktree is gone (pruned or the data dir moved)");
  }

  // ── commit the staged work (idempotent: an earlier ship attempt may
  //    already have committed) ───────────────────────────────────────
  await exec(["add", "-A"], { cwd: worktree });
  const title = order.ticket ? `${order.ticket.ref} — ${order.ticket.title}` : order.title;
  const commit = await exec(
    [...COMMIT_IDENTITY, "commit", "-m", `${title}\n\nAtlas run ${order.ref}`],
    { cwd: worktree },
  );
  if (commit.exitCode !== 0) {
    const nothingToCommit = /nothing to commit|nothing added to commit/i.test(
      commit.stdout + commit.stderr,
    );
    if (!nothingToCommit) return failed("worktree-failed", `git commit: ${detail(commit)}`);
    // nothing staged — either the run truly changed nothing, or an
    // earlier ship attempt already committed (re-delivery is at-least-
    // once). The Atlas commit subject is the discriminator.
    const last = await exec(["log", "-1", "--format=%B"], { cwd: worktree });
    if (!last.stdout.includes(`Atlas run ${order.ref}`)) {
      return failed("no-changes", "the Engine finished without changing anything");
    }
  }

  // ── path decision: remote or local ─────────────────────────────────
  const remote = await exec(["remote", "get-url", "origin"], { cwd: repoDir });
  if (remote.exitCode === 0 && remote.stdout.trim()) {
    return shipViaRemote();
  }
  return shipLocally();

  // ── LOCAL: merge --no-ff into the checked-out branch ────────────────
  async function shipLocally(): Promise<ShipOutcome> {
    const head = await exec(["symbolic-ref", "--short", "HEAD"], { cwd: repoDir! });
    if (head.exitCode !== 0) {
      return failed("not-mergeable", "the repo is on a detached HEAD — check out a branch to ship into");
    }
    const target = head.stdout.trim();
    const status = await exec(["status", "--porcelain"], { cwd: repoDir! });
    if (status.exitCode !== 0 || status.stdout.trim() !== "") {
      return failed(
        "not-mergeable",
        `the ${target} checkout has uncommitted changes — commit or stash before shipping`,
      );
    }
    const merge = await exec(
      [...COMMIT_IDENTITY, "merge", "--no-ff", "--no-edit", "-m", `${title} (Atlas run ${order.ref})`, branch],
      { cwd: repoDir! },
    );
    if (merge.exitCode !== 0) {
      const conflicts = await exec(["diff", "--name-only", "--diff-filter=U"], { cwd: repoDir! });
      await exec(["merge", "--abort"], { cwd: repoDir! }).catch(() => {});
      const files = conflicts.stdout.trim().split("\n").filter(Boolean);
      if (files.length) {
        return failed("conflict", `conflicting files: ${files.join(", ")}`);
      }
      return failed("not-mergeable", `git merge: ${detail(merge)}`);
    }
    const sha = await exec(["rev-parse", "HEAD"], { cwd: repoDir! });
    log(`ship ${order.ref}: merged into ${target} locally`);
    await prune();
    return { result: "shipped", prUrl: null, mergeSha: sha.exitCode === 0 ? sha.stdout.trim() : null };
  }

  // ── REMOTE: push → PR → probe → squash-merge (v1 prior art) ────────
  async function shipViaRemote(): Promise<ShipOutcome> {
    const ghOk = await gh(["--version"]).catch(() => null);
    if (!ghOk || ghOk.exitCode !== 0) {
      return failed("gh-cli-error", "gh is not installed — Atlas ships PRs through the GitHub CLI");
    }
    const push = await exec(["push", "-u", "origin", branch], { cwd: worktree });
    if (push.exitCode !== 0) {
      return failed("gh-cli-error", `git push: ${detail(push)}`);
    }
    const create = await gh(
      ["pr", "create", "--title", title, "--body", `Shipped by Atlas — run ${order.ref}.`, "--head", branch],
      { cwd: worktree },
    );
    if (create.exitCode !== 0) {
      // "already exists" carries the URL in stderr — a re-ship attempt.
      const existing = (create.stderr.match(/https:\/\/\S+\/pull\/\d+/) ?? [])[0];
      if (!existing) return failed("gh-cli-error", `gh pr create: ${detail(create)}`);
      return mergePr(existing);
    }
    const url = create.stdout.trim().split("\n").pop()?.trim() ?? "";
    if (!url.startsWith("https://")) {
      return failed("gh-cli-error", `gh pr create returned unexpected output: ${create.stdout.slice(0, 200)}`);
    }
    return mergePr(url);
  }

  async function mergePr(prUrl: string): Promise<ShipOutcome> {
    // probe mergeability (v1 probe-mergeable.ts vocabulary) — GitHub
    // computes it async, so give it a few tries before trusting "unknown".
    const m = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (m) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const probe = await gh(
          ["api", `repos/${m[1]}/${m[2]}/pulls/${m[3]}`, "--jq", ".mergeable, .mergeable_state"],
          { cwd: worktree },
        );
        if (probe.exitCode !== 0) break; // the merge attempt below is the honest arbiter
        const [rawMergeable, rawState] = probe.stdout.trim().split(/\r?\n/);
        const state = (rawState ?? "").trim().toLowerCase();
        if (rawMergeable?.trim() === "false" || state === "dirty") {
          return failed("conflict", `GitHub reports the PR conflicts with the base branch`, prUrl);
        }
        if (state === "blocked" || state === "behind") {
          return failed("not-mergeable", `GitHub reports ${state.toUpperCase()} — checks or protections in the way`, prUrl);
        }
        if (state && state !== "unknown") break;
        await new Promise((r) => setTimeout(r, 2_000));
      }
    }
    const merge = await gh(["pr", "merge", prUrl, "--squash"], { cwd: worktree });
    if (merge.exitCode !== 0) {
      return failed("not-mergeable", `gh pr merge: ${detail(merge)}`, prUrl);
    }
    let mergeSha: string | null = null;
    const view = await gh(["pr", "view", prUrl, "--json", "mergeCommit"], { cwd: worktree }).catch(
      () => null,
    );
    if (view && view.exitCode === 0) {
      try {
        mergeSha = (JSON.parse(view.stdout) as { mergeCommit?: { oid?: string } }).mergeCommit?.oid ?? null;
      } catch {
        // informational only (the v1 rule)
      }
    }
    log(`ship ${order.ref}: PR merged (${prUrl})`);
    await prune();
    return { result: "shipped", prUrl, mergeSha };
  }

  async function prune(): Promise<void> {
    if (repoDir) await removeRunWorktree({ repoDir, runId: order.runId, dataDir: args.dataDir });
  }

  async function failed(
    failureKind: ShipFailureKind,
    failureDetail: string,
    prUrl: string | null = null,
  ): Promise<ShipOutcome> {
    // worktree KEPT for inspection except when there's nothing in it.
    if (failureKind === "no-changes" && repoDir) {
      await removeRunWorktree({ repoDir, runId: order.runId, dataDir: args.dataDir });
    }
    return { result: "failed", failureKind, detail: failureDetail, prUrl };
  }
}
