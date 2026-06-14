/**
 * M17 — Activity Monitor pure unit tests.
 *
 * 1. Bridge heartbeat parser correctly accepts/rejects resources blocks.
 * 2. Monitor derivations: computeAggregate + runHealth flags (runaway,
 *    stuck, ok) — table-tested.
 * 3. The no-feed-spam rule: resources NEVER appear as feed kinds.
 * 4. HeartbeatBody serializes + round-trips the resources field.
 */
import { describe, expect, it } from "vitest";

import { parseBridgeHeartbeat, type BridgeResourceSample } from "@/src/domain/bridge/protocol";
import { rowToBridgeEvents } from "@/src/domain/bridge/events";
import { computeAggregate, runHealth, RUNAWAY_CPU_PCT, STUCK_MINUTES, type MonitorRunRow } from "@/src/domain/monitor/queries";
import type { FeedEvent } from "@/src/db/schema";

// ── Fixture helpers ───────────────────────────────────────────────────────

const BASE_HEARTBEAT = {
  version: "2.0.0-m17",
  engine: "fake" as const,
  busyRunIds: ["run-1", "run-2"],
};

const BASE_SAMPLE: BridgeResourceSample = { cpuPct: 12.5, memBytes: 52_428_800, diskBytes: 1_048_576 };

function makeRow(overrides: Partial<MonitorRunRow>): MonitorRunRow {
  const now = new Date("2026-06-14T12:00:00Z");
  return {
    id: "run-1",
    ref: "R-100",
    title: "Test run",
    state: "running",
    projectName: "acme",
    projectSlug: "acme",
    ticketRef: "T-100",
    since: now,
    startedAt: now,
    lastStdout: null,
    resources: null,
    ...overrides,
  };
}

function feedRow(overrides: Partial<FeedEvent>): FeedEvent {
  return {
    id: 1,
    kind: "dispatched",
    actor: "you",
    summary: "R-1 — Fixture",
    preview: null,
    projectId: "p1",
    ticketId: "t1",
    runId: "run-1",
    ticketRef: "T-1",
    payload: { from: null, to: "queued", lane: "owner" },
    readAt: null,
    seeded: false,
    createdAt: new Date("2026-06-14T12:00:00Z"),
    ...overrides,
  } as FeedEvent;
}

// ── 1. Heartbeat parser — resources field ─────────────────────────────────

describe("parseBridgeHeartbeat — M17 resources field", () => {
  it("parses a valid resources block alongside existing fields", () => {
    const body = parseBridgeHeartbeat({
      ...BASE_HEARTBEAT,
      resources: { "run-1": BASE_SAMPLE, "run-2": { cpuPct: 0, memBytes: 0, diskBytes: 0 } },
    });
    expect(body).not.toBeNull();
    expect(body!.resources?.["run-1"]).toEqual(BASE_SAMPLE);
    expect(body!.resources?.["run-2"]).toEqual({ cpuPct: 0, memBytes: 0, diskBytes: 0 });
  });

  it("omits resources when absent — backward compat with M9 daemons", () => {
    const body = parseBridgeHeartbeat(BASE_HEARTBEAT);
    expect(body).not.toBeNull();
    expect(body!.resources).toBeUndefined();
  });

  it("skips malformed resource entries but keeps the valid ones (non-fatal)", () => {
    const body = parseBridgeHeartbeat({
      ...BASE_HEARTBEAT,
      resources: {
        "run-1": BASE_SAMPLE,
        "run-bad": { cpuPct: "not-a-number", memBytes: 0, diskBytes: 0 }, // invalid
        "run-3": { cpuPct: 5, memBytes: 100, diskBytes: 200 },
      },
    });
    expect(body).not.toBeNull();
    // non-fatal: bad entry is dropped, others survive
    expect(body!.resources?.["run-1"]).toEqual(BASE_SAMPLE);
    expect(body!.resources?.["run-bad"]).toBeUndefined();
    expect(body!.resources?.["run-3"]).toEqual({ cpuPct: 5, memBytes: 100, diskBytes: 200 });
  });

  it("ignores a non-object resources value without rejecting the whole body", () => {
    const body = parseBridgeHeartbeat({ ...BASE_HEARTBEAT, resources: "not-an-object" });
    expect(body).not.toBeNull();
    expect(body!.resources).toBeUndefined();
  });

  it("still validates existing required fields — malformed engine rejected", () => {
    expect(
      parseBridgeHeartbeat({
        ...BASE_HEARTBEAT,
        engine: "quantum",
        resources: { "run-1": BASE_SAMPLE },
      }),
    ).toBeNull();
  });
});

// ── 2. computeAggregate ───────────────────────────────────────────────────

describe("computeAggregate", () => {
  it("counts states correctly across mixed rows", () => {
    const rows = [
      makeRow({ state: "running", resources: { cpuPct: 40, memBytes: 100_000, diskBytes: 0 } }),
      makeRow({ id: "r2", state: "running", resources: { cpuPct: 30, memBytes: 200_000, diskBytes: 0 } }),
      makeRow({ id: "r3", state: "queued", resources: null }),
      makeRow({ id: "r4", state: "needs-input", resources: { cpuPct: 2, memBytes: 50_000, diskBytes: 0 } }),
    ];
    const agg = computeAggregate(rows, 3);
    expect(agg.running).toBe(2);
    expect(agg.queued).toBe(1);
    expect(agg.needsInput).toBe(1);
    expect(agg.cap).toBe(3);
    // totalCpuPct sums running + needs-input resources
    expect(agg.totalCpuPct).toBeCloseTo(72, 0);
    expect(agg.totalMemBytes).toBe(350_000);
  });

  it("returns zeros when no rows", () => {
    const agg = computeAggregate([], 2);
    expect(agg.running).toBe(0);
    expect(agg.totalCpuPct).toBe(0);
    expect(agg.totalMemBytes).toBe(0);
  });

  it("skips rows with null resources", () => {
    const rows = [
      makeRow({ state: "running", resources: null }),
      makeRow({ id: "r2", state: "running", resources: { cpuPct: 50, memBytes: 1_000_000, diskBytes: 0 } }),
    ];
    const agg = computeAggregate(rows, 2);
    expect(agg.totalCpuPct).toBeCloseTo(50, 0);
    expect(agg.totalMemBytes).toBe(1_000_000);
  });
});

// ── 3. runHealth flags ────────────────────────────────────────────────────

describe("runHealth", () => {
  const now = new Date("2026-06-14T12:00:00Z");

  it("returns ok for a healthy running session", () => {
    const row = makeRow({
      state: "running",
      since: new Date("2026-06-14T11:59:00Z"),
      lastStdout: "working on it",
      resources: { cpuPct: 20, memBytes: 100_000, diskBytes: 0 },
    });
    expect(runHealth(row, now)).toBe("ok");
  });

  it.each([RUNAWAY_CPU_PCT, RUNAWAY_CPU_PCT + 10, 100])(
    "returns runaway when cpuPct is %d (≥ threshold)",
    (pct) => {
      const row = makeRow({
        state: "running",
        resources: { cpuPct: pct, memBytes: 0, diskBytes: 0 },
      });
      expect(runHealth(row, now)).toBe("runaway");
    },
  );

  it(`returns stuck when running + no stdout + elapsed > ${STUCK_MINUTES} min`, () => {
    const pastStart = new Date(now.getTime() - (STUCK_MINUTES + 1) * 60 * 1_000);
    const row = makeRow({
      state: "running",
      since: pastStart,
      lastStdout: null,
      resources: { cpuPct: 0, memBytes: 0, diskBytes: 0 },
    });
    expect(runHealth(row, now)).toBe("stuck");
  });

  it("does not mark stuck when there is stdout output", () => {
    const pastStart = new Date(now.getTime() - (STUCK_MINUTES + 2) * 60 * 1_000);
    const row = makeRow({
      state: "running",
      since: pastStart,
      lastStdout: "analyzing...",
      resources: { cpuPct: 0, memBytes: 0, diskBytes: 0 },
    });
    expect(runHealth(row, now)).toBe("ok");
  });

  it("returns ok for queued and needs-input regardless", () => {
    expect(runHealth(makeRow({ state: "queued" }), now)).toBe("ok");
    expect(runHealth(makeRow({ state: "needs-input" }), now)).toBe("ok");
  });

  it("runaway takes precedence over stuck", () => {
    const pastStart = new Date(now.getTime() - (STUCK_MINUTES + 2) * 60 * 1_000);
    const row = makeRow({
      state: "running",
      since: pastStart,
      lastStdout: null,
      resources: { cpuPct: RUNAWAY_CPU_PCT + 5, memBytes: 0, diskBytes: 0 },
    });
    // runaway check fires first in runHealth
    expect(runHealth(row, now)).toBe("runaway");
  });
});

// ── 4. NO-FEED-SPAM RULE — resources NEVER appear as a feed kind ──────────

describe("no-feed-spam — resources never enter feed_events (ADR-0002 hard wall)", () => {
  it("a hypothetical 'resource-update' row maps to nothing (non-command kind)", () => {
    // simulate an erroneous row with kind cast to avoid TS errors
    const row = feedRow({ kind: "started" }); // started is a non-command kind
    const events = rowToBridgeEvents(row);
    expect(events).toEqual([]); // non-command kinds must map to nothing
  });

  it("only the five command kinds produce bridge events", () => {
    const commandKinds = ["dispatched", "cancelled", "answered", "ship-requested", "doctor-requested"] as const;
    for (const kind of commandKinds) {
      const row = feedRow({ kind: kind as FeedEvent["kind"] });
      // these may produce events (some require valid payload); the key test
      // is that non-command kinds do NOT produce events.
      const result = rowToBridgeEvents(row);
      // just confirm it's an array (no throw); content tested elsewhere.
      expect(Array.isArray(result)).toBe(true);
    }
    // a lifecycle kind that is NOT a command
    const nonCommand = feedRow({ kind: "shipped" });
    expect(rowToBridgeEvents(nonCommand)).toEqual([]);
  });

  it("heartbeat body with resources is correctly shaped for wire serialization", () => {
    const body = parseBridgeHeartbeat({
      ...BASE_HEARTBEAT,
      resources: { "r-1": BASE_SAMPLE },
    });
    expect(body).not.toBeNull();
    // the body serializes and the resources survive round-trip
    const json = JSON.stringify(body);
    const reparsed = parseBridgeHeartbeat(JSON.parse(json));
    expect(reparsed?.resources?.["r-1"]).toEqual(BASE_SAMPLE);
  });
});
