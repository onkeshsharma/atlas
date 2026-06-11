/**
 * M9 — scheduler tables (charter §9): cap, lanes, full helper yield,
 * determinism. Pure function, table-driven like the M6/M8 state tables.
 */
import { describe, expect, it } from "vitest";

import { nextToStart, type SchedulableRun } from "../src/scheduler.ts";

const run = (
  runId: string,
  lane: "owner" | "helper",
  queuePosition: number | null = null,
): SchedulableRun => ({ runId, lane, queuePosition, ref: runId });

describe("nextToStart — cap", () => {
  const queued = [run("a", "owner", 1), run("b", "owner", 2), run("c", "owner", 3)];

  it.each([
    { cap: 0, running: 0, expected: [] },
    { cap: 2, running: 0, expected: ["a", "b"] },
    { cap: 2, running: 1, expected: ["a"] },
    { cap: 2, running: 2, expected: [] },
    { cap: 2, running: 3, expected: [] }, // over cap (cap was lowered mid-flight) — start nothing
    { cap: 5, running: 0, expected: ["a", "b", "c"] },
  ])("cap $cap with $running running starts $expected", ({ cap, running, expected }) => {
    expect(nextToStart({ cap, runningCount: running, queued }).map((r) => r.runId)).toEqual(
      expected,
    );
  });

  it("returns nothing for an empty queue", () => {
    expect(nextToStart({ cap: 4, runningCount: 0, queued: [] })).toEqual([]);
  });
});

describe("nextToStart — priority lanes (PRD #21)", () => {
  it("owner runs go first regardless of queue position", () => {
    const queued = [run("h1", "helper", 1), run("o1", "owner", 9)];
    expect(nextToStart({ cap: 1, runningCount: 0, queued }).map((r) => r.runId)).toEqual(["o1"]);
  });

  it("helpers take only what owners left over", () => {
    const queued = [run("h1", "helper", 1), run("o1", "owner", 2), run("o2", "owner", 3)];
    expect(nextToStart({ cap: 3, runningCount: 0, queued }).map((r) => r.runId)).toEqual([
      "o1",
      "o2",
      "h1",
    ]);
  });

  it("FULL yield: helpers wait while ANY owner is still queued beyond capacity", () => {
    const queued = [run("o1", "owner", 1), run("o2", "owner", 2), run("h1", "helper", 3)];
    // capacity 1: o1 starts; h1 must NOT slip in beside it next tick
    expect(nextToStart({ cap: 1, runningCount: 0, queued }).map((r) => r.runId)).toEqual(["o1"]);
    const after = [run("o2", "owner", 2), run("h1", "helper", 3)];
    expect(nextToStart({ cap: 2, runningCount: 1, queued: after }).map((r) => r.runId)).toEqual([
      "o2",
    ]);
  });

  it("helpers run when no owner is waiting", () => {
    const queued = [run("h1", "helper", 2), run("h2", "helper", 1)];
    expect(nextToStart({ cap: 1, runningCount: 0, queued }).map((r) => r.runId)).toEqual(["h2"]);
  });
});

describe("nextToStart — ordering", () => {
  it("orders by queue position, nulls last, ref as tiebreak", () => {
    const queued = [
      run("z", "owner", null),
      run("b", "owner", 2),
      run("a", "owner", 2),
      run("c", "owner", 1),
    ];
    expect(nextToStart({ cap: 4, runningCount: 0, queued }).map((r) => r.runId)).toEqual([
      "c",
      "a",
      "b",
      "z",
    ]);
  });
});
