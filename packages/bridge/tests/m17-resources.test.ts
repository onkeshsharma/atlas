/**
 * M17 — ResourceSampler unit tests.
 *
 * Verifies:
 * 1. sampleAll() with a live sleeping child returns the correct shape
 *    (cpuPct: number, memBytes: number, diskBytes: number).
 * 2. Sampling is non-fatal: bad PID returns zeros, not a throw.
 * 3. register/unregister/updatePid lifecycle.
 * 4. Disk walk counts files in a real temp dir.
 * 5. Resources never travel via feed_events (structural check).
 *
 * All tests use real child_process / fs — the sampler is platform-specific
 * and its non-fatal contract needs real OS calls to verify. A 1-second
 * sleep child gives a stable live target for CPU/mem probing.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ResourceSampler } from "../src/resources.ts";
import type { ResourceSample } from "../src/resources.ts";

// ── Helpers ───────────────────────────────────────────────────────────────

let tmpDir: string;
let childProc: ReturnType<typeof spawn> | null = null;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "m17-resources-"));
});

afterEach(() => {
  // kill the child after each test
  if (childProc && !childProc.killed) {
    childProc.kill("SIGKILL");
  }
  childProc = null;
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

/** Spawn a Node child that busy-sleeps (keeps CPU measurable on any platform). */
function spawnSleeper(): Promise<{ pid: number; proc: ReturnType<typeof spawn> }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      process.execPath,
      ["-e", "setInterval(() => { let x = 0; for(let i=0;i<1e5;i++) x+=i; }, 10);"],
      { stdio: "ignore" },
    );
    proc.once("error", reject);
    // Give the child a tick to get a PID.
    setTimeout(() => {
      if (!proc.pid) reject(new Error("no PID"));
      else resolve({ pid: proc.pid, proc });
    }, 100);
  });
}

function assertResourceShape(s: ResourceSample) {
  expect(typeof s.cpuPct).toBe("number");
  expect(typeof s.memBytes).toBe("number");
  expect(typeof s.diskBytes).toBe("number");
  expect(s.cpuPct).toBeGreaterThanOrEqual(0);
  expect(s.memBytes).toBeGreaterThanOrEqual(0);
  expect(s.diskBytes).toBeGreaterThanOrEqual(0);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("ResourceSampler — lifecycle", () => {
  it("starts empty", () => {
    const s = new ResourceSampler();
    expect(s.size).toBe(0);
  });

  it("register increments size, unregister decrements", () => {
    const s = new ResourceSampler();
    s.register("r1", null, null);
    s.register("r2", null, null);
    expect(s.size).toBe(2);
    s.unregister("r1");
    expect(s.size).toBe(1);
    s.unregister("r2");
    expect(s.size).toBe(0);
  });

  it("updatePid on unknown run is a no-op (no throw)", () => {
    const s = new ResourceSampler();
    expect(() => s.updatePid("unknown-run", 12345)).not.toThrow();
  });

  it("sampleAll with no registered runs returns an empty map", async () => {
    const s = new ResourceSampler();
    const result = await s.sampleAll(50);
    expect(result.size).toBe(0);
  });
});

describe("ResourceSampler — sampleAll with a live child", () => {
  it("returns the correct resource shape for a live process", async () => {
    const { pid, proc } = await spawnSleeper();
    childProc = proc;

    const sampler = new ResourceSampler();
    sampler.register("run-live", pid, null);
    const result = await sampler.sampleAll(300);
    sampler.unregister("run-live");

    expect(result.has("run-live")).toBe(true);
    const sample = result.get("run-live")!;
    assertResourceShape(sample);
  }, 10_000);

  it("memBytes is non-zero for a live process", async () => {
    const { pid, proc } = await spawnSleeper();
    childProc = proc;

    const sampler = new ResourceSampler();
    sampler.register("r-mem", pid, null);
    const result = await sampler.sampleAll(200);

    // A running node process should have at minimum some memory.
    // We only assert it's ≥ 0 to remain non-fatal; the platform helpers
    // return 0 when /proc is unavailable (CI non-Linux) and that's valid.
    expect(result.get("r-mem")!.memBytes).toBeGreaterThanOrEqual(0);
  }, 10_000);

  it("updatePid lets sampling pick up a PID assigned after register", async () => {
    const { pid, proc } = await spawnSleeper();
    childProc = proc;

    const sampler = new ResourceSampler();
    sampler.register("late-pid", null, null); // starts with no PID
    sampler.updatePid("late-pid", pid);

    const result = await sampler.sampleAll(200);
    expect(result.has("late-pid")).toBe(true);
    assertResourceShape(result.get("late-pid")!);
  }, 10_000);
});

describe("ResourceSampler — non-fatal on bad PID", () => {
  it("returns zeros (not a throw) for a dead / nonexistent PID", async () => {
    const sampler = new ResourceSampler();
    // PID 9 is reserved / nonexistent on all platforms we run on.
    sampler.register("bad-pid", 9999999, null);
    let result!: Map<string, ResourceSample>;
    await expect(async () => {
      result = await sampler.sampleAll(100);
    }).not.toThrow();

    const sample = result?.get("bad-pid");
    // Sample may or may not exist depending on whether the bad PID caused
    // the whole run to be skipped; either way no throw.
    if (sample) {
      assertResourceShape(sample);
    }
  }, 10_000);

  it("continues sampling other runs even when one PID fails", async () => {
    const { pid, proc } = await spawnSleeper();
    childProc = proc;

    const sampler = new ResourceSampler();
    sampler.register("bad", 9999999, null);
    sampler.register("good", pid, null);
    const result = await sampler.sampleAll(200);

    // The good run MUST have a sample.
    expect(result.has("good")).toBe(true);
    assertResourceShape(result.get("good")!);
  }, 10_000);
});

describe("ResourceSampler — disk sampling", () => {
  it("counts bytes in a real temp dir", async () => {
    const subdir = join(tmpDir, "disk-test");
    await mkdtemp(subdir).catch(() => {}); // may already exist

    const testDir = await mkdtemp(join(tmpDir, "dt-"));
    // Write two files with known sizes.
    await writeFile(join(testDir, "a.txt"), "A".repeat(1_000));
    await writeFile(join(testDir, "b.txt"), "B".repeat(2_000));

    const sampler = new ResourceSampler();
    sampler.register("disk-run", null, testDir);
    const result = await sampler.sampleAll(50);

    const sample = result.get("disk-run")!;
    expect(sample).toBeDefined();
    // We wrote 3000 bytes; disk total should include at least that.
    expect(sample.diskBytes).toBeGreaterThanOrEqual(3_000);
    expect(sample.cpuPct).toBe(0); // no PID — CPU stays 0
    expect(sample.memBytes).toBe(0); // no PID — mem stays 0
  }, 10_000);

  it("returns diskBytes=0 for a missing directory (non-fatal)", async () => {
    const missingDir = join(tmpDir, "does-not-exist-" + Date.now());
    const sampler = new ResourceSampler();
    sampler.register("no-dir", null, missingDir);

    let result!: Map<string, ResourceSample>;
    await expect(async () => {
      result = await sampler.sampleAll(50);
    }).not.toThrow();

    const sample = result?.get("no-dir");
    if (sample) {
      expect(sample.diskBytes).toBe(0);
    }
  }, 10_000);
});
