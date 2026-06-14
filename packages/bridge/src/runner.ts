/**
 * Run executor — one Run from claim to terminal outcome (ADR-0002 §3).
 *
 *   fetch work order → claim (worktree fields ride the claim) →
 *   create worktree (owner / ingest runs) → engine session →
 *   stdout batched up · questions raised as needs-input ·
 *   answers/cancel steered in → outcome posted (review-ready + real
 *   git diff stats / failed + typed kind / helper-result) →
 *   prune the worktree on failure or cancel (review-ready keeps it:
 *   Session B's ship commits from there).
 *
 * Honest failure paths: no local_path → failed(no-repo);
 * `git worktree add` error → failed(worktree-failed). Stale posts lose
 * cleanly (409) — the runner treats a lost conditional claim as "the
 * cockpit moved the run" and stops quietly.
 */
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import type { AtlasClient } from "./atlas-client.ts";
import type { EngineAdapter, EngineSession } from "./engine/types.ts";
import type { NeedsInputAnswer, WorkOrder } from "./protocol.ts";
import { StdoutBatcher } from "./stdout-batcher.ts";
import {
  captureDiffPatch,
  captureDiffStats,
  createRunWorktree,
  removeRunWorktree,
  runBranch,
  runWorktreePath,
} from "./worktrees.ts";

const STDOUT_FLUSH_MS = 500;

export type RunExecution = {
  runId: string;
  answer: (answer: NeedsInputAnswer) => void;
  cancel: () => void;
  done: Promise<void>;
  /** M17 — the Engine child PID (available after claim; null before start
   *  or when the engine doesn't expose one). For resource sampling only. */
  getPid: () => number | null;
  /** M17 — the claimed worktree path (null for helper/no-repo runs). */
  worktreePath: string | null;
};

export type RunnerDeps = {
  client: AtlasClient;
  engine: EngineAdapter;
  dataDir: string;
  engineTimeoutMs: number;
  log: (line: string) => void;
};

function needsWorktree(order: WorkOrder): boolean {
  return order.lane === "owner" || order.helperKind === "ingest-project";
}

export function executeRun(runId: string, deps: RunnerDeps): RunExecution {
  let session: EngineSession | null = null;
  let cancelled = false;
  let pendingAnswer: NeedsInputAnswer | null = null;
  // M17 — tracked for resource sampling.
  let claimedWorktreePath: string | null = null;

  const done = (async () => {
    const order = await deps.client.workOrder(runId);
    if (!order) {
      deps.log(`run ${runId}: no work order (gone) — dropping`);
      return;
    }

    const sandbox = join(deps.dataDir, "sandboxes", runId);
    await mkdir(sandbox, { recursive: true });

    const wantsWorktree = needsWorktree(order);
    const repoDir = order.project.localPath;
    const plannedWorktree = wantsWorktree && repoDir ? runWorktreePath(deps.dataDir, runId) : null;

    const claimed = await deps.client.claim(runId, {
      worktreePath: plannedWorktree,
      branch: plannedWorktree ? runBranch(runId) : null,
    });
    if (!claimed) {
      deps.log(`run ${order.ref}: lost the claim — dropping`);
      return;
    }
    deps.log(`run ${order.ref}: claimed (${order.lane}${order.helperKind ? `/${order.helperKind}` : ""})`);

    const prune = async () => {
      if (plannedWorktree && repoDir) {
        await removeRunWorktree({ repoDir, runId, dataDir: deps.dataDir });
      }
      await rm(sandbox, { recursive: true, force: true }).catch(() => {});
    };

    // honest pre-engine failures
    if (wantsWorktree && !repoDir) {
      await deps.client.transition(runId, {
        to: "failed",
        failureKind: "no-repo",
        failureDetail: `project "${order.project.name}" has no local_path on this machine`,
      });
      return;
    }

    let worktree: string | null = null;
    if (wantsWorktree && repoDir) {
      try {
        const created = await createRunWorktree({ repoDir, runId, dataDir: deps.dataDir });
        worktree = created.path;
        claimedWorktreePath = worktree; // M17
      } catch (err) {
        await deps.client.transition(runId, {
          to: "failed",
          failureKind: "worktree-failed",
          failureDetail: (err as Error).message,
        });
        return;
      }
    }

    const batcher = new StdoutBatcher({
      flushMs: STDOUT_FLUSH_MS,
      send: (chunks) => deps.client.postStdout(runId, chunks),
    });
    batcher.start();

    session = deps.engine.start({
      order,
      worktree,
      sandbox,
      timeoutMs: deps.engineTimeoutMs,
      onStdout: (text) => batcher.push(text),
      onQuestion: (question) => {
        void deps.client
          .transition(runId, { to: "needs-input", question })
          .then((applied) => {
            if (!applied) {
              // the run moved under us (cancelled) — stop the session.
              session?.cancel();
            }
          })
          .catch((err) => deps.log(`run ${order.ref}: needs-input post failed — ${String(err)}`));
      },
    });
    if (cancelled) session.cancel();
    if (pendingAnswer) session.answer(pendingAnswer);

    const outcome = await session.done;
    await batcher.stop();

    switch (outcome.result) {
      case "review-ready": {
        const diffStats = worktree ? await captureDiffStats({ worktree }) : null;
        // Session B — the unified diff rides up with the numstat so KK
        // can render real hunks cloud-side (capped; worktrees.ts).
        const diffPatch = worktree ? await captureDiffPatch({ worktree }) : null;
        const applied = await deps.client.transition(runId, {
          to: "review-ready",
          diffStats,
          ...(diffPatch ? { diffPatch } : {}),
        });
        deps.log(
          applied
            ? `run ${order.ref}: review-ready (${diffStats?.filesChanged ?? 0} files)`
            : `run ${order.ref}: review-ready post lost the claim (run moved)`,
        );
        // the worktree STAYS — the diff lives there until ship (Session B).
        return;
      }
      case "helper-complete": {
        const applied = await deps.client.postHelperResult(runId, outcome.payload);
        deps.log(
          applied
            ? `run ${order.ref}: helper deliverable landed`
            : `run ${order.ref}: helper deliverable rejected (run moved or invalid)`,
        );
        await prune();
        return;
      }
      case "failed": {
        await deps.client.transition(runId, {
          to: "failed",
          failureKind: outcome.failureKind,
          failureDetail: outcome.detail,
        });
        deps.log(`run ${order.ref}: failed (${outcome.failureKind})`);
        await prune();
        return;
      }
      case "cancelled": {
        // Atlas already flipped the row (steering writes Atlas-first);
        // nothing to post — just clean the disk.
        deps.log(`run ${order.ref}: cancelled — pruned`);
        await prune();
        return;
      }
    }
  })();

  return {
    runId,
    answer(answer) {
      if (session) session.answer(answer);
      else pendingAnswer = answer;
    },
    cancel() {
      cancelled = true;
      session?.cancel();
    },
    done,
    // M17 — resource sampling accessors (non-fatal: may return null).
    getPid() {
      return session?.pid ?? null;
    },
    get worktreePath() {
      return claimedWorktreePath;
    },
  };
}
