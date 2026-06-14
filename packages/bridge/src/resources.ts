/**
 * M17 — per-Run resource sampler (CHEAP + NON-FATAL).
 *
 * Samples CPU %, resident memory bytes, and worktree disk bytes for each
 * running Engine session. A sampling failure NEVER disrupts a run —
 * every method catches and defaults to 0.
 *
 * Design:
 *  - CPU %: computed from two `wmic` / `/proc` reads (process user+kernel
 *    time delta over a fixed window). On Windows uses wmic; on POSIX uses
 *    /proc/<pid>/stat. Falls back to 0 gracefully on either platform.
 *  - Memory (RSS): wmic WorkingSetSize on Windows; /proc/<pid>/status
 *    VmRSS on POSIX. Falls back to 0.
 *  - Disk bytes: async walk of the worktree dir via `fs.stat`; falls back
 *    to 0 if the dir is absent or unreadable.
 *
 * CPU sampling is window-based: `startCpuWindow()` snapshots the raw
 * process times; `endCpuWindow()` reads them again ~sampleMs later and
 * computes the delta as a percentage of elapsed wall time. This requires
 * the sampler to be called on the heartbeat cadence (every ~heartbeatMs).
 */
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export type ResourceSample = {
  /** 0–100 (across all CPUs; may exceed 100 on multi-core if reported as
   *  summed user time — still useful as a relative "busiest" signal). */
  cpuPct: number;
  /** resident set size, bytes. */
  memBytes: number;
  /** worktree directory bytes (0 if no worktree or unreadable). */
  diskBytes: number;
};

// ── Platform-specific helpers ─────────────────────────────────────────────

/** raw process CPU times in ms (user + system) at a point in time. */
type CpuSnapshot = { timeMs: number; cpuMs: number };

async function getCpuSnapshot(pid: number): Promise<CpuSnapshot | null> {
  const timeMs = Date.now();
  try {
    if (process.platform === "win32") {
      // wmic: KernelModeTime + UserModeTime are in 100-nanosecond intervals.
      const { execSync } = await import("node:child_process");
      const out = execSync(
        `wmic process where ProcessId=${pid} get KernelModeTime,UserModeTime /format:csv`,
        { timeout: 2_000, stdio: ["ignore", "pipe", "ignore"], windowsHide: true },
      ).toString();
      const lines = out.trim().split("\n").filter((l) => l.trim() && !l.startsWith("Node"));
      const parts = lines[0]?.split(",");
      if (!parts || parts.length < 3) return null;
      const kernel = Number(parts[1]);
      const user = Number(parts[2]);
      if (!Number.isFinite(kernel) || !Number.isFinite(user)) return null;
      // 100ns → ms
      const cpuMs = (kernel + user) / 10_000;
      return { timeMs, cpuMs };
    } else {
      // Linux /proc/<pid>/stat: fields 14 (utime) + 15 (stime) in jiffies.
      const content = await readFile(`/proc/${pid}/stat`, "utf8");
      const fields = content.trim().split(" ");
      const clkTck = 100; // Linux HZ assumption (sysconf(_SC_CLK_TCK))
      const utime = Number(fields[13]);
      const stime = Number(fields[14]);
      if (!Number.isFinite(utime) || !Number.isFinite(stime)) return null;
      const cpuMs = ((utime + stime) / clkTck) * 1_000;
      return { timeMs, cpuMs };
    }
  } catch {
    return null;
  }
}

async function getMemBytes(pid: number): Promise<number> {
  try {
    if (process.platform === "win32") {
      const { execSync } = await import("node:child_process");
      const out = execSync(
        `wmic process where ProcessId=${pid} get WorkingSetSize /format:csv`,
        { timeout: 2_000, stdio: ["ignore", "pipe", "ignore"], windowsHide: true },
      ).toString();
      const lines = out.trim().split("\n").filter((l) => l.trim() && !l.startsWith("Node"));
      const val = Number(lines[0]?.split(",")[1]);
      return Number.isFinite(val) && val >= 0 ? val : 0;
    } else {
      const content = await readFile(`/proc/${pid}/status`, "utf8");
      const match = /VmRSS:\s+(\d+)\s+kB/.exec(content);
      return match ? Number(match[1]) * 1_024 : 0;
    }
  } catch {
    return 0;
  }
}

/** recursive directory byte count — cheap because worktrees are small
 *  (only the working changes); bails on error. Uses a single `du`-style
 *  walk: readdir (non-recursive) per level, stat files, recurse dirs. */
async function getDiskBytesRecursive(dir: string, depth = 0): Promise<number> {
  if (depth > 8) return 0; // guard against symlink loops
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    let total = 0;
    await Promise.all(
      entries.map(async (e) => {
        const full = join(dir, e.name);
        if (e.isSymbolicLink()) return; // skip symlinks — worktrees use them
        if (e.isDirectory()) {
          total += await getDiskBytesRecursive(full, depth + 1).catch(() => 0);
        } else if (e.isFile()) {
          try {
            const s = await stat(full);
            total += s.size;
          } catch {
            // ignore unreadable files
          }
        }
      }),
    );
    return total;
  } catch {
    return 0;
  }
}

async function getDiskBytes(dir: string): Promise<number> {
  return getDiskBytesRecursive(dir, 0).catch(() => 0);
}

// ── ResourceSampler ───────────────────────────────────────────────────────

type RunEntry = {
  pid: number | null;
  worktreePath: string | null;
  /** snapshot taken at the START of the sampling window. */
  cpuStart: CpuSnapshot | null;
};

/**
 * Maintains per-run state for the CPU window computation.
 * Call `beginWindow()` at the START of each heartbeat cycle, then
 * `sample()` at the END of the same cycle (after the heartbeat fires
 * and the window has elapsed naturally on the next tick). In practice
 * the daemon calls `sampleAll()` on the heartbeat interval, which does
 * both phases atomically with a short internal delay.
 */
export class ResourceSampler {
  private entries = new Map<string, RunEntry>();

  /** Register a run's PID + worktree when it claims a slot. */
  register(runId: string, pid: number | null, worktreePath: string | null): void {
    this.entries.set(runId, { pid, worktreePath, cpuStart: null });
  }

  /** Remove a run from tracking on terminal outcome. */
  unregister(runId: string): void {
    this.entries.delete(runId);
  }

  /** Update the PID if the engine session started after initial registration. */
  updatePid(runId: string, pid: number | null): void {
    const e = this.entries.get(runId);
    if (e) e.pid = pid;
  }

  /**
   * Sample all registered runs and return the resource map.
   * Uses a short internal delay between CPU snapshots to compute a delta.
   * NON-FATAL: any error per-run defaults to zeros.
   */
  async sampleAll(windowMs = 500): Promise<Map<string, ResourceSample>> {
    const runIds = [...this.entries.keys()];
    if (runIds.length === 0) return new Map();

    // Phase 1 — snapshot CPU start for all runs.
    const starts = new Map<string, CpuSnapshot | null>();
    await Promise.all(
      runIds.map(async (id) => {
        const e = this.entries.get(id);
        if (!e || e.pid === null) {
          starts.set(id, null);
          return;
        }
        starts.set(id, await getCpuSnapshot(e.pid).catch(() => null));
      }),
    );

    // Brief measurement window.
    await new Promise((r) => setTimeout(r, windowMs));

    // Phase 2 — collect CPU end, memory, disk.
    const result = new Map<string, ResourceSample>();
    await Promise.all(
      runIds.map(async (id) => {
        const e = this.entries.get(id);
        if (!e) return;

        let cpuPct = 0;
        let memBytes = 0;
        let diskBytes = 0;

        try {
          if (e.pid !== null) {
            const [cpuEnd, mem] = await Promise.all([
              getCpuSnapshot(e.pid).catch(() => null),
              getMemBytes(e.pid).catch(() => 0),
            ]);
            memBytes = mem;

            const start = starts.get(id) ?? null;
            if (start && cpuEnd) {
              const wallMs = cpuEnd.timeMs - start.timeMs;
              const cpuMs = cpuEnd.cpuMs - start.cpuMs;
              if (wallMs > 0) {
                cpuPct = Math.min(100, Math.max(0, (cpuMs / wallMs) * 100));
              }
            }
          }

          if (e.worktreePath) {
            diskBytes = await getDiskBytes(e.worktreePath).catch(() => 0);
          }
        } catch {
          // non-fatal — leave as zeros
        }

        result.set(id, { cpuPct, memBytes, diskBytes });
      }),
    );

    return result;
  }

  get size(): number {
    return this.entries.size;
  }
}
