/**
 * The daemon — N concurrent Engine sessions behind the cap, steered
 * from the cockpit (ADR-0001 §2, ADR-0002).
 *
 * Connection loop (ADR-0002 §2 snapshot-then-subscribe):
 *   sync → refresh the queue mirror + cap → orphan sweep → subscribe to
 *   the command SSE from sync.cursor → consume until the stream drops →
 *   backoff → sync again. Offline queueing (PRD #35) falls out: runs
 *   dispatched while we were away are still queued rows in the snapshot.
 *
 * Scheduler tick: every tickMs, ask the pure scheduler what to start
 * (cap + lanes — helpers always yield, PRD #21) and execute the picks.
 */
import type { AtlasClient } from "./atlas-client.ts";
import { TokenRejectedError } from "./atlas-client.ts";
import { BRIDGE_VERSION } from "./config.ts";
import { runDoctor } from "./doctor.ts";
import type { EngineAdapter } from "./engine/types.ts";
import { parseBridgeEvent, type RunLane } from "./protocol.ts";
import { fakeConsultVerdict, runConsult } from "./engine/consult.ts";
import { ResourceSampler } from "./resources.ts";
import { executeRun, type RunExecution } from "./runner.ts";
import { nextToStart, type SchedulableRun } from "./scheduler.ts";
import { executeShip } from "./ship.ts";
import { consumeSse } from "./sse.ts";
import { removeRunWorktree, runWorktreePath } from "./worktrees.ts";
import { existsSync } from "node:fs";

const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000];

/** safety resync cadence — new queued work is never hostage to the
 * stream (belt to the sse idle-watchdog's suspenders). */
const RESYNC_MS = 15_000;

export type DaemonOptions = {
  client: AtlasClient;
  engine: EngineAdapter;
  atlasUrl: string;
  token: string;
  dataDir: string;
  tickMs: number;
  heartbeatMs: number;
  engineTimeoutMs: number;
  /** M10 — reported in doctor verdicts (single-instance sanity surface). */
  lockPort?: number;
  log?: (line: string) => void;
  fetchFn?: typeof fetch;
};

export class Daemon {
  private readonly opts: DaemonOptions;
  private readonly log: (line: string) => void;
  private cap = 1;
  /** last outbox cursor we PROCESSED — resubscribing from here replays
   * anything a half-dead stream swallowed (at-least-once; ADR-0002 §2). */
  private lastCursor: number | null = null;
  private queued = new Map<string, SchedulableRun>();
  private running = new Map<string, RunExecution>();
  /** M17 — per-run resource sampler (cheap, non-fatal). */
  private readonly sampler = new ResourceSampler();
  /** M17 — latest resource snapshot, refreshed each heartbeat. */
  private lastResources = new Map<string, import("./resources.ts").ResourceSample>();
  /** Session B — ship executions in flight. Git ops, not Engine
   * sessions: they never consume cap slots (the worktree already
   * holds the work; shipping is seconds, runs are minutes). */
  private shipping = new Set<string>();
  /** M12 — ship executions SERIALIZE (one merge at a time): batch ship
   * requests (the board cluster, Today's card) arrive as near-simultaneous
   * run-ship commands, and concurrent merges into the same checkout race
   * on the git index — the second ship honest-failed `not-mergeable`
   * while the first's merge was in flight (found by m12-ship-card e2e;
   * the board's "Ship N →" carried the same latent race). Ships still
   * never consume cap slots; they just queue behind each other. */
  private shipChain: Promise<void> = Promise.resolve();
  /** M10 — one doctor at a time; duplicate commands collapse. */
  private doctoring = false;
  private stopped = false;
  /** BP4 — local paused posture: the daemon stays connected but starts no new runs. */
  private paused = false;
  private aborter: AbortController | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private resyncTimer: ReturnType<typeof setInterval> | null = null;
  private loopDone: Promise<void> | null = null;
  private fatal: ((err: Error) => void) | null = null;

  constructor(opts: DaemonOptions) {
    this.opts = opts;
    this.log = opts.log ?? ((line) => console.log(`[bridge] ${line}`));
  }

  /** resolves when the daemon stops; rejects on fatal (revoked token). */
  start(): Promise<void> {
    const fatalPromise = new Promise<never>((_, reject) => {
      this.fatal = (err) => {
        void this.stop();
        reject(err);
      };
    });

    this.tickTimer = setInterval(() => this.tick(), this.opts.tickMs);
    this.heartbeatTimer = setInterval(() => void this.heartbeat(), this.opts.heartbeatMs);
    this.resyncTimer = setInterval(() => void this.resyncQueue(), RESYNC_MS);
    void this.heartbeat();
    this.loopDone = this.connectionLoop();

    return Promise.race([this.loopDone, fatalPromise]);
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.resyncTimer) clearInterval(this.resyncTimer);
    this.aborter?.abort();
    for (const execution of this.running.values()) execution.cancel();
    await Promise.allSettled([...this.running.values()].map((e) => e.done));
  }

  /** test/observability hook. */
  snapshot(): { queued: string[]; running: string[]; cap: number } {
    return {
      queued: [...this.queued.keys()],
      running: [...this.running.keys()],
      cap: this.cap,
    };
  }

  /**
   * BP4 — local paused posture (ADR-0004 §5, tray control).
   * When paused, the daemon stays connected (heartbeats + SSE continue) but
   * claims no new runs. Runs already in flight continue to completion.
   */
  setPaused(paused: boolean): void {
    const changed = this.paused !== paused;
    this.paused = paused;
    if (changed) {
      this.log(paused ? "[bridge] paused — no new runs will start" : "[bridge] resumed — accepting new runs");
      if (!paused) this.tick(); // drain the queue now that we're resumed
    }
  }

  /** Returns the current paused state (for the tray). */
  isPaused(): boolean {
    return this.paused;
  }

  private async connectionLoop(): Promise<void> {
    let attempt = 0;
    while (!this.stopped) {
      try {
        const sync = await this.opts.client.sync();
        this.cap = sync.cap;
        this.queued.clear();
        for (const q of sync.queued) {
          if (!this.running.has(q.runId)) {
            this.queued.set(q.runId, {
              runId: q.runId,
              lane: q.lane,
              queuePosition: q.queuePosition,
              ref: q.ref,
            });
          }
        }
        this.log(
          `sync: cap ${sync.cap} · ${sync.queued.length} queued · ${sync.active.length} active on record`,
        );
        await this.orphanSweep(sync.active);
        // Session B — ships requested while we were away (PRD #35's sibling).
        for (const runId of sync.shipRequested) this.startShip(runId);
        // M10 — a doctor requested while we were away still runs.
        if (sync.doctorRequest) this.startDoctor(sync.doctorRequest);
        this.tick();

        attempt = 0;
        this.aborter = new AbortController();
        // resume from the last PROCESSED cursor when we have one — the
        // sync snapshot covers queued state, but an answer/cancel that
        // landed while the stream was half-dead must replay.
        const since = this.lastCursor ?? sync.cursor;
        await consumeSse({
          url: `${this.opts.atlasUrl}/api/bridge/events?since=${since}`,
          token: this.opts.token,
          signal: this.aborter.signal,
          fetchFn: this.opts.fetchFn,
          onConnected: () => this.log("command stream connected"),
          onFrame: (frame) => {
            if (frame.id && /^\d+$/.test(frame.id)) this.lastCursor = Number(frame.id);
            if (frame.event === "message") return; // keepalives/comments
            let payload: unknown = null;
            try {
              payload = JSON.parse(frame.data);
            } catch {
              return;
            }
            const event = parseBridgeEvent(payload);
            if (event) this.handleEvent(event);
          },
        });
      } catch (err) {
        if (this.stopped) return;
        if ((err as Error).message === "sse-unauthorized" || err instanceof TokenRejectedError) {
          this.fatal?.(new TokenRejectedError());
          return;
        }
        this.log(`connection dropped: ${(err as Error).message}`);
      }
      if (this.stopped) return;
      const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
      attempt += 1;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  private handleEvent(event: {
    type: string;
    runId?: string;
    lane?: RunLane;
    answer?: { text?: string; choice?: string; answeredBy: string; answeredAt: string };
    // M10 — bridge-doctor command fields.
    projects?: Array<{ slug: string; localPath: string }>;
    keepWorktreeRunIds?: string[];
    // ADR-0007 Phase 2 — consult-ask command fields.
    prompt?: { system: string; user: string };
    repoAware?: boolean;
  }): void {
    // M10 — the doctor command addresses the bridge, not a run.
    if (event.type === "bridge-doctor") {
      this.startDoctor({
        projects: event.projects ?? [],
        keepWorktreeRunIds: event.keepWorktreeRunIds ?? [],
      });
      return;
    }
    if (typeof event.runId !== "string") return;
    switch (event.type) {
      case "run-available":
        if (!this.running.has(event.runId) && !this.queued.has(event.runId)) {
          this.queued.set(event.runId, {
            runId: event.runId,
            lane: event.lane ?? "owner",
            queuePosition: null,
            ref: event.runId,
          });
          this.tick();
        }
        return;
      case "run-cancelled": {
        this.queued.delete(event.runId);
        const execution = this.running.get(event.runId);
        if (execution) {
          execution.cancel();
        } else {
          // Session B — a review-ready run cancelled from the cockpit
          // (KK's send-back declines the result): its KEPT worktree has
          // no execution to prune it. Best-effort disk hygiene.
          void this.pruneKeptWorktree(event.runId);
        }
        return;
      }
      case "run-answered": {
        const execution = this.running.get(event.runId);
        if (execution && event.answer) execution.answer(event.answer);
        return;
      }
      case "run-ship": {
        this.startShip(event.runId);
        return;
      }
      case "consult-ask": {
        if (event.prompt) {
          this.startConsult({
            runId: event.runId,
            prompt: event.prompt,
            repoAware: event.repoAware ?? false,
          });
        }
        return;
      }
    }
  }

  /**
   * ADR-0007 Phase 2 — Athena bridge consult: run the Atlas-built prompt through
   * `claude` (in the run's worktree when repoAware, using the bridge's own auth),
   * then POST the raw verdict to /consult-result for Atlas to gate + answer.
   * Fire-and-forget; failures are logged, never fatal. Fake engine → fake verdict
   * (suites/e2e spend no tokens).
   */
  private startConsult(event: {
    runId: string;
    prompt: { system: string; user: string };
    repoAware: boolean;
  }): void {
    if (this.stopped) return;
    const worktree = event.repoAware
      ? (this.running.get(event.runId)?.worktreePath ?? undefined)
      : undefined;
    void (async () => {
      try {
        const verdict =
          this.opts.engine.flavor === "fake"
            ? fakeConsultVerdict(event.prompt)
            : await runConsult({
                systemPrompt: event.prompt.system,
                userPrompt: event.prompt.user,
                worktree,
                timeoutMs: this.opts.engineTimeoutMs,
              });
        await this.opts.client.postConsultResult(event.runId, verdict);
        this.log(`consult ${event.runId}: verdict posted${worktree ? " (repo-aware)" : ""}`);
      } catch (err) {
        this.log(`consult ${event.runId}: failed — ${String(err)}`);
      }
    })();
  }

  /**
   * Session B — approve-and-ship (PRD #25): commit/merge from the kept
   * worktree, then post the honest outcome. Stale posts (the run moved,
   * a duplicate delivery) lose on the conditional claims and drop quietly.
   */
  private startShip(runId: string): void {
    if (this.stopped || this.shipping.has(runId)) return;
    this.shipping.add(runId);
    // M12 — append to the serial chain (see shipChain note above).
    this.shipChain = this.shipChain.then(async () => {
      try {
        if (this.stopped) return; // daemon stopped while queued behind a merge
        const order = await this.opts.client.workOrder(runId);
        if (!order) {
          this.log(`ship ${runId}: no work order (gone) — dropping`);
          return;
        }
        if (order.state !== "review-ready") {
          this.log(`ship ${order.ref}: not review-ready (${order.state}) — dropping`);
          return;
        }
        const outcome = await executeShip({
          order,
          dataDir: this.opts.dataDir,
          log: this.log,
        });
        if (outcome.result === "shipped") {
          const applied = await this.opts.client.transition(runId, {
            to: "shipped",
            ...(outcome.prUrl ? { prUrl: outcome.prUrl } : {}),
            ...(outcome.mergeSha ? { mergeSha: outcome.mergeSha } : {}),
          });
          this.log(
            applied
              ? `ship ${order.ref}: shipped${outcome.mergeSha ? ` (${outcome.mergeSha.slice(0, 7)})` : ""}`
              : `ship ${order.ref}: shipped post lost the claim (run moved)`,
          );
        } else {
          const applied = await this.opts.client.transition(runId, {
            to: "failed",
            from: "review-ready",
            failureKind: outcome.failureKind,
            failureDetail: outcome.detail,
            ...(outcome.prUrl ? { prUrl: outcome.prUrl } : {}),
          });
          this.log(
            applied
              ? `ship ${order.ref}: failed (${outcome.failureKind})`
              : `ship ${order.ref}: failure post lost the claim (run moved)`,
          );
        }
      } catch (err) {
        this.log(`ship ${runId}: executor error — ${String(err)}`);
      } finally {
        this.shipping.delete(runId);
      }
    });
  }

  /**
   * M10 — run preflight and post the verdict (PRD #34). Honest and
   * non-blocking: checks run beside the scheduler; duplicate requests
   * collapse onto the run in flight; a stale post (bridge revoked
   * mid-doctor) loses the conditional claim and drops quietly.
   */
  private startDoctor(request: {
    projects: Array<{ slug: string; localPath: string }>;
    keepWorktreeRunIds: string[];
  }): void {
    if (this.stopped || this.doctoring) return;
    this.doctoring = true;
    void (async () => {
      try {
        this.log(
          `doctor: running (${request.projects.length} repos · ${request.keepWorktreeRunIds.length} kept worktrees on record)`,
        );
        const result = await runDoctor({
          projects: request.projects,
          keepWorktreeRunIds: request.keepWorktreeRunIds,
          version: BRIDGE_VERSION,
          engine: this.opts.engine.flavor,
          lockPort: this.opts.lockPort ?? 0,
          dataDir: this.opts.dataDir,
          runningRunIds: [...this.running.keys()],
          syncProbe: async () => {
            const sync = await this.opts.client.sync();
            return { cap: sync.cap, queued: sync.queued.length };
          },
        });
        const applied = await this.opts.client.postDoctor(result);
        const failed = result.checks.filter((c) => c.status === "fail").length;
        this.log(
          applied
            ? `doctor: posted — ${result.checks.length} checks · ${failed} failed`
            : "doctor: post lost the claim (bridge revoked?)",
        );
      } catch (err) {
        if (err instanceof TokenRejectedError) {
          this.fatal?.(err);
          return;
        }
        this.log(`doctor: error — ${String(err)}`);
      } finally {
        this.doctoring = false;
      }
    })();
  }

  /** prune the kept worktree of a run that left review-ready without shipping. */
  private async pruneKeptWorktree(runId: string): Promise<void> {
    try {
      if (!existsSync(runWorktreePath(this.opts.dataDir, runId))) return;
      const order = await this.opts.client.workOrder(runId);
      const repoDir = order?.project.localPath;
      if (repoDir) {
        await removeRunWorktree({ repoDir, runId, dataDir: this.opts.dataDir });
        this.log(`worktree ${runId}: pruned (run cancelled at review-ready)`);
      }
    } catch (err) {
      this.log(`worktree ${runId}: prune failed — ${String(err)}`);
    }
  }

  private tick(): void {
    if (this.stopped || this.paused) return; // BP4: paused = stay connected, no new starts
    const picks = nextToStart({
      cap: this.cap,
      runningCount: this.running.size,
      queued: [...this.queued.values()],
    });
    for (const pick of picks) {
      this.queued.delete(pick.runId);
      const execution = executeRun(pick.runId, {
        client: this.opts.client,
        engine: this.opts.engine,
        dataDir: this.opts.dataDir,
        engineTimeoutMs: this.opts.engineTimeoutMs,
        log: this.log,
      });
      this.running.set(pick.runId, execution);
      // M17 — register for resource sampling; PID may not be set yet
      // (the engine child spawns asynchronously); sampler.updatePid() is
      // called in the heartbeat loop once the session is underway.
      this.sampler.register(pick.runId, null, execution.worktreePath);
      void execution.done
        .catch((err) => this.log(`run ${pick.runId}: executor error — ${String(err)}`))
        .finally(() => {
          this.running.delete(pick.runId);
          this.sampler.unregister(pick.runId); // M17
          this.tick();
        });
    }
  }

  /**
   * Orphan sweep (ADR-0002 §2): runs Atlas thinks this bridge is
   * executing but we aren't (daemon restarted; their Engines died with
   * us). running → failed(bridge-lost); needs-input → cancelled (its
   * question died with the session; the legal table allows no fail).
   */
  private async orphanSweep(
    active: Array<{ runId: string; state: string }>,
  ): Promise<void> {
    for (const record of active) {
      if (this.running.has(record.runId)) continue;
      try {
        if (record.state === "running") {
          await this.opts.client.transition(record.runId, {
            to: "failed",
            failureKind: "bridge-lost",
            failureDetail: "the Bridge restarted under this run",
          });
          this.log(`orphan ${record.runId}: failed (bridge-lost)`);
        } else if (record.state === "needs-input") {
          await this.opts.client.transition(record.runId, {
            to: "cancelled",
            from: "needs-input",
          });
          this.log(`orphan ${record.runId}: cancelled (question died with the session)`);
        }
      } catch (err) {
        this.log(`orphan ${record.runId}: sweep failed — ${String(err)}`);
      }
    }
  }

  /**
   * Safety resync (RESYNC_MS): merge the live queued snapshot into the
   * mirror — adds work the stream missed, drops runs that left the
   * queue underneath us. Steering commands stay the stream's job (the
   * idle watchdog + cursor replay bound their latency).
   */
  private async resyncQueue(): Promise<void> {
    if (this.stopped) return;
    try {
      const sync = await this.opts.client.sync();
      this.cap = sync.cap;
      const queuedNow = new Set(sync.queued.map((q) => q.runId));
      for (const runId of [...this.queued.keys()]) {
        if (!queuedNow.has(runId)) this.queued.delete(runId);
      }
      for (const q of sync.queued) {
        if (!this.running.has(q.runId) && !this.queued.has(q.runId)) {
          this.queued.set(q.runId, {
            runId: q.runId,
            lane: q.lane,
            queuePosition: q.queuePosition,
            ref: q.ref,
          });
        }
      }
      for (const runId of sync.shipRequested) this.startShip(runId);
      this.tick();
    } catch {
      // transient — the connection loop owns hard failures.
    }
  }

  private async heartbeat(): Promise<void> {
    if (this.stopped) return;
    try {
      // M17 — refresh PIDs (they're set only after the engine child spawns)
      // and sample resources while the heartbeat composes. Cheap + non-fatal:
      // any failure leaves the previous snapshot in place.
      for (const [runId, execution] of this.running) {
        const pid = execution.getPid();
        if (pid !== null) this.sampler.updatePid(runId, pid);
      }
      // Sample with a short window (~500ms) so the heartbeat doesn't block
      // excessively. The window is bounded to half the heartbeat interval.
      const windowMs = Math.min(500, Math.floor(this.opts.heartbeatMs / 2));
      try {
        const snapshot = await this.sampler.sampleAll(windowMs);
        if (snapshot.size > 0) this.lastResources = snapshot;
      } catch {
        // sampling failure is non-fatal — use previous snapshot.
      }

      // Serialize the resource snapshot keyed by runId.
      const resources: Record<string, { cpuPct: number; memBytes: number; diskBytes: number }> = {};
      for (const [runId, sample] of this.lastResources) {
        resources[runId] = {
          cpuPct: Math.round(sample.cpuPct * 10) / 10, // 1 dp
          memBytes: sample.memBytes,
          diskBytes: sample.diskBytes,
        };
      }

      const cap = await this.opts.client.heartbeat({
        version: BRIDGE_VERSION,
        engine: this.opts.engine.flavor,
        busyRunIds: [...this.running.keys()],
        // M10 — echo the cap we HOLD so the Bridges page can show a cap
        // edit actually reached this machine ("daemon confirmed cap N").
        cap: this.cap,
        capabilities: { node: process.version, platform: process.platform },
        // M17 — per-run resource telemetry (resources ride the heartbeat,
        // NEVER feed_events — ADR-0002 + charter hard wall).
        resources: Object.keys(resources).length > 0 ? resources : undefined,
      });
      if (cap !== null) this.cap = cap;
    } catch (err) {
      if (err instanceof TokenRejectedError) {
        this.fatal?.(err);
        return;
      }
      // transient — next beat retries (the heartbeat is best-effort).
    }
  }
}
