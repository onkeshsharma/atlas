/**
 * M16 — Insights derivation tables (charter item 1): every pure function
 * in src/domain/insights/derive.ts over synthetic event streams,
 * including the empty/degenerate rows the charter names. No DB here —
 * the query wiring has its own integration spec.
 */
import { describe, expect, it } from "vitest";

import {
  formatAge,
  formatDuration,
  halfWindowMedians,
  helperLoad,
  isInsightsRange,
  percentile,
  percentileRows,
  perProject,
  rangeWindow,
  runOutcomes,
  slowestProject,
  stragglers,
  timeToShipPairs,
  velocity,
  weekStartOf,
  weeklyThroughput,
  type OutcomeEvent,
  type ShipPair,
} from "@/src/domain/insights/derive";
import { insightsCsv } from "@/src/domain/insights/csv";
import type { InsightsData } from "@/src/domain/insights/queries";

// Wednesday 2026-06-10 12:00 local — fixed anchor; Monday of its week is 06-08.
const NOW = new Date(2026, 5, 10, 12, 0, 0, 0);
const MONDAY = new Date(2026, 5, 8, 0, 0, 0, 0);

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const HOUR = 3_600_000;

const at = (msAgo: number) => new Date(NOW.getTime() - msAgo);

function outcome(
  kind: OutcomeEvent["kind"],
  msAgo: number,
  over: Partial<OutcomeEvent> = {},
): OutcomeEvent {
  return { kind, at: at(msAgo), projectId: "p1", ticketId: "t1", runId: "r1", ...over };
}

describe("rangeWindow", () => {
  it("30d — calendar window with an equal previous window", () => {
    const w = rangeWindow("30d", NOW);
    expect(w.from!.getTime()).toBe(NOW.getTime() - 30 * DAY);
    expect(w.prevFrom!.getTime()).toBe(NOW.getTime() - 60 * DAY);
    expect(w.label).toBe("last 30 days");
    expect(w.compareLabel).toBe("the 30 days before");
  });
  it("12w — Monday-anchored: this week + 11 before", () => {
    const w = rangeWindow("12w", NOW);
    expect(w.from!.getTime()).toBe(MONDAY.getTime() - 11 * WEEK);
    expect(w.prevFrom!.getTime()).toBe(w.from!.getTime() - 12 * WEEK);
  });
  it("all — no window, no comparison", () => {
    const w = rangeWindow("all", NOW);
    expect(w.from).toBeNull();
    expect(w.prevFrom).toBeNull();
    expect(w.compareLabel).toBeNull();
  });
  it("isInsightsRange guards the param", () => {
    expect(isInsightsRange("30d")).toBe(true);
    expect(isInsightsRange("90d")).toBe(false);
    expect(isInsightsRange(undefined)).toBe(false);
  });
});

describe("weekStartOf", () => {
  const table: Array<[string, Date, Date]> = [
    ["Wednesday → its Monday", NOW, MONDAY],
    ["Monday maps to itself", new Date(2026, 5, 8, 9, 0), MONDAY],
    ["Sunday belongs to the PREVIOUS Monday", new Date(2026, 5, 7, 23, 0), new Date(2026, 5, 1)],
  ];
  it.each(table)("%s", (_name, input, expected) => {
    expect(weekStartOf(input).getTime()).toBe(expected.getTime());
  });
});

describe("weeklyThroughput", () => {
  const w12 = rangeWindow("12w", NOW);

  it("empty stream → 12 zero bars, no best week", () => {
    const t = weeklyThroughput([], w12, NOW);
    expect(t.bars).toHaveLength(12);
    expect(t.bars.every((b) => b.shipped === 0 && b.failed === 0)).toBe(true);
    expect(t.currentIndex).toBe(11);
    expect(t.bestIndex).toBeNull();
    expect(t.totalShipped).toBe(0);
  });

  it("empty stream on range=all → a single honest bucket", () => {
    const t = weeklyThroughput([], rangeWindow("all", NOW), NOW);
    expect(t.bars).toHaveLength(1);
    expect(t.currentIndex).toBe(0);
  });

  it("buckets by Monday weeks; failed stacks; cancelled never charts", () => {
    const events: OutcomeEvent[] = [
      outcome("shipped", 0), //              this week  → w12
      outcome("shipped", 3 * DAY), //        Sunday 06-07 → w11
      outcome("failed", 3 * DAY),
      outcome("shipped", 11 * WEEK + 2 * DAY), // the oldest in-window week → w1
      outcome("cancelled", DAY),
    ];
    const t = weeklyThroughput(events, w12, NOW);
    expect(t.bars[11]).toEqual({ label: "w12", shipped: 1, failed: 0 });
    expect(t.bars[10]).toEqual({ label: "w11", shipped: 1, failed: 1 });
    expect(t.bars[0]).toEqual({ label: "w1", shipped: 1, failed: 0 });
    expect(t.totalShipped).toBe(3);
    expect(t.totalFailed).toBe(1);
  });

  it("events before the window are ignored", () => {
    const t = weeklyThroughput([outcome("shipped", 13 * WEEK)], w12, NOW);
    expect(t.totalShipped).toBe(0);
  });

  it("best week — ties break to the LATEST week", () => {
    const events = [
      outcome("shipped", 2 * WEEK),
      outcome("shipped", 2 * WEEK),
      outcome("shipped", 0),
      outcome("shipped", HOUR),
    ];
    const t = weeklyThroughput(events, w12, NOW);
    expect(t.bestIndex).toBe(11); // w12 ties w10 at 2 — latest wins
  });

  it("range=all starts at the earliest event's week", () => {
    const t = weeklyThroughput(
      [outcome("shipped", 3 * WEEK), outcome("shipped", 0)],
      rangeWindow("all", NOW),
      NOW,
    );
    expect(t.bars).toHaveLength(4);
    expect(t.bars[0].shipped).toBe(1);
    expect(t.bars[3].shipped).toBe(1);
  });

  it("30d window spans 5 Monday buckets from the fixed anchor", () => {
    const t = weeklyThroughput([], rangeWindow("30d", NOW), NOW);
    expect(t.bars).toHaveLength(5);
  });
});

describe("timeToShipPairs", () => {
  const ev = (kind: "filed" | "shipped", ticketId: string, msAgo: number) => ({
    kind,
    ticketId,
    at: at(msAgo),
  });

  it("empty stream → no pairs", () => {
    expect(timeToShipPairs([])).toEqual([]);
  });
  it("filed without shipped (and vice versa) never pairs", () => {
    expect(timeToShipPairs([ev("filed", "a", DAY)])).toEqual([]);
    expect(timeToShipPairs([ev("shipped", "a", DAY)])).toEqual([]);
  });
  it("a ship BEFORE the filing is degenerate and dropped", () => {
    expect(timeToShipPairs([ev("filed", "a", DAY), ev("shipped", "a", 2 * DAY)])).toEqual([]);
  });
  it("earliest filed + first ship at/after it win; pairs sort by ship date", () => {
    const pairs = timeToShipPairs([
      ev("filed", "a", 10 * DAY),
      ev("filed", "a", 8 * DAY), // later duplicate filing ignored
      ev("shipped", "a", 6 * DAY),
      ev("shipped", "a", 2 * DAY), // re-ship ignored — first ship measures
      ev("filed", "b", 3 * DAY),
      ev("shipped", "b", DAY),
    ]);
    expect(pairs.map((p) => p.ticketId)).toEqual(["a", "b"]);
    expect(pairs[0].deltaMs).toBe(4 * DAY);
    expect(pairs[1].deltaMs).toBe(2 * DAY);
  });
});

describe("percentile (nearest-rank)", () => {
  it("empty sample → null", () => {
    expect(percentile([], 50)).toBeNull();
  });
  it("single value answers every percentile", () => {
    for (const p of [10, 50, 90, 99]) expect(percentile([7], p)).toBe(7);
  });
  it("standard ranks over an unsorted decade", () => {
    const sample = [10, 1, 9, 2, 8, 3, 7, 4, 6, 5];
    expect(percentile(sample, 10)).toBe(1);
    expect(percentile(sample, 50)).toBe(5);
    expect(percentile(sample, 90)).toBe(9);
    expect(percentile(sample, 99)).toBe(10);
  });
  it("even-N median takes the lower middle (nearest-rank, no interpolation)", () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2);
  });
});

describe("percentileRows", () => {
  it("no deltas → no rows (the surface names the gap instead)", () => {
    expect(percentileRows([])).toEqual([]);
  });
  it("single delta → four equal rows at full width", () => {
    const rows = percentileRows([HOUR]);
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.ms === HOUR && r.widthPct === 100)).toBe(true);
  });
  it("widths scale to the slowest row with a 2% visibility floor", () => {
    const rows = percentileRows([1, 2, 3, 4, 5, 6, 7, 8, 9, 1000]);
    expect(rows[3].widthPct).toBe(100);
    expect(rows[0].widthPct).toBe(2); // 1/1000 rounds to 0 → floor 2
  });
});

describe("halfWindowMedians", () => {
  const pair = (shippedMsAgo: number, deltaMs: number): ShipPair => ({
    ticketId: `t${shippedMsAgo}`,
    filedAt: new Date(NOW.getTime() - shippedMsAgo - deltaMs),
    shippedAt: at(shippedMsAgo),
    deltaMs,
  });
  const w12 = rangeWindow("12w", NOW);

  it("no pairs → both halves null", () => {
    expect(halfWindowMedians([], w12, NOW)).toEqual({ firstMs: null, secondMs: null });
  });
  it("splits at the window midpoint", () => {
    const res = halfWindowMedians(
      [pair(10 * WEEK, 8 * HOUR), pair(9 * WEEK, 6 * HOUR), pair(WEEK, 4 * HOUR)],
      w12,
      NOW,
    );
    expect(res.firstMs).toBe(6 * HOUR); // nearest-rank of [8h, 6h]
    expect(res.secondMs).toBe(4 * HOUR);
  });
  it("one-sided history leaves the other half null", () => {
    const res = halfWindowMedians([pair(DAY, 2 * HOUR)], w12, NOW);
    expect(res.firstMs).toBeNull();
    expect(res.secondMs).toBe(2 * HOUR);
  });
});

describe("velocity", () => {
  const table: Array<[string, number, number | null, unknown]> = [
    ["no previous window", 5, null, { kind: "none" }],
    ["both windows empty", 0, 0, { kind: "quiet" }],
    ["previous empty, current not", 4, 0, { kind: "new" }],
    ["up", 31, 25, { kind: "compared", pctChange: 24, direction: "up" }],
    ["down", 8, 10, { kind: "compared", pctChange: -20, direction: "down" }],
    ["flat", 10, 10, { kind: "compared", pctChange: 0, direction: "flat" }],
    ["current zero against history", 0, 10, { kind: "compared", pctChange: -100, direction: "down" }],
  ];
  it.each(table)("%s", (_name, current, previous, expected) => {
    expect(velocity(current, previous)).toEqual(expected);
  });
});

describe("runOutcomes", () => {
  it("empty → zero mix and a null rate (never 0%-by-fiat)", () => {
    expect(runOutcomes([])).toEqual({
      shipped: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
      failureRatePct: null,
    });
  });
  it("rows without a runId are ticket bookkeeping, not run outcomes", () => {
    const res = runOutcomes([outcome("shipped", 0, { runId: null })]);
    expect(res.total).toBe(0);
  });
  it("mix + one-decimal rate", () => {
    const res = runOutcomes([
      outcome("shipped", 0),
      outcome("shipped", 1),
      outcome("shipped", 2),
      outcome("shipped", 3),
      outcome("shipped", 4),
      outcome("failed", 5),
      outcome("cancelled", 6),
    ]);
    expect(res).toMatchObject({ shipped: 5, failed: 1, cancelled: 1, total: 7 });
    expect(res.failureRatePct).toBe(14.3);
  });
});

describe("helperLoad", () => {
  it("empty", () => {
    expect(helperLoad([])).toEqual({ owner: 0, helper: 0, total: 0 });
  });
  it("mixed lanes", () => {
    expect(helperLoad(["owner", "helper", "owner", "helper", "helper"])).toEqual({
      owner: 2,
      helper: 3,
      total: 5,
    });
  });
});

describe("perProject", () => {
  const projects = [
    { id: "p1", name: "acme-website", slug: "acme-website" },
    { id: "p2", name: "atlas-internal", slug: "atlas-internal" },
  ];
  const tp = new Map([
    ["t1", "p1"],
    ["t2", "p2"],
  ]);

  it("empty record → no rows", () => {
    expect(perProject([], [], tp, projects)).toEqual([]);
  });
  it("shares + avg per project; failures alone still make a row", () => {
    const events = [
      outcome("shipped", 0, { projectId: "p1" }),
      outcome("shipped", 1, { projectId: "p1" }),
      outcome("shipped", 2, { projectId: "p1" }),
      outcome("failed", 3, { projectId: "p2" }),
    ];
    const pairs: ShipPair[] = [
      { ticketId: "t1", filedAt: at(2 * HOUR), shippedAt: at(0), deltaMs: 2 * HOUR },
      { ticketId: "t1", filedAt: at(4 * HOUR), shippedAt: at(0), deltaMs: 4 * HOUR },
    ];
    const rows = perProject(events, pairs, tp, projects);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: "acme-website", shipped: 3, sharePct: 100, avgMs: 3 * HOUR, pairCount: 2 });
    expect(rows[1]).toMatchObject({ name: "atlas-internal", shipped: 0, failed: 1, sharePct: 0, avgMs: null });
  });
  it("events for unknown projects are dropped, never crash", () => {
    expect(perProject([outcome("shipped", 0, { projectId: "ghost" })], [], tp, projects)).toEqual(
      [],
    );
  });
  it("slowestProject picks the highest measured avg; unmeasured → null", () => {
    expect(slowestProject([])).toBeNull();
    const rows = perProject(
      [outcome("shipped", 0, { projectId: "p1" }), outcome("shipped", 1, { projectId: "p2", ticketId: "t2" })],
      [
        { ticketId: "t1", filedAt: at(HOUR), shippedAt: at(0), deltaMs: HOUR },
        { ticketId: "t2", filedAt: at(9 * HOUR), shippedAt: at(0), deltaMs: 9 * HOUR },
      ],
      tp,
      projects,
    );
    expect(slowestProject(rows)?.name).toBe("atlas-internal");
  });
});

describe("stragglers", () => {
  const open = (ref: string, ageMs: number, over: Record<string, unknown> = {}) => ({
    ref,
    title: ref,
    state: "backlog",
    projectName: "acme-website",
    enteredStateAt: at(ageMs),
    ...over,
  });

  it("empty set → none", () => {
    expect(stragglers([], NOW)).toEqual([]);
  });
  it("a lone open ticket is never 'longer than typical'", () => {
    expect(stragglers([open("T-1", 30 * DAY)], NOW)).toEqual([]);
  });
  it("a perfectly even field has no stragglers", () => {
    expect(stragglers([open("T-1", DAY), open("T-2", DAY), open("T-3", DAY)], NOW)).toEqual([]);
  });
  it("strictly-above-median, oldest first, capped at 5", () => {
    // 12 ages → median (nearest-rank) = 11d; six sit above it; cap keeps 5.
    const ages = [1, 2, 3, 4, 10, 11, 12, 13, 14, 15, 16, 17];
    const field = ages.map((d, i) => open(`T-${d}`, d * DAY, { title: `t${i}` }));
    const rows = stragglers(field, NOW);
    expect(rows.map((r) => r.ref)).toEqual(["T-17", "T-16", "T-15", "T-14", "T-13"]);
    expect(rows[0].ageMs).toBe(17 * DAY);
  });
  it("carries the blockedBy ref through", () => {
    const rows = stragglers(
      [open("T-1", DAY), open("T-2", 5 * DAY, { blockedBy: "T-9" })],
      NOW,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].blockedBy).toBe("T-9");
  });
});

describe("formatting", () => {
  const durations: Array<[number, string]> = [
    [5 * 60_000, "5 min"],
    [59 * 60_000, "59 min"],
    [HOUR, "1 hr"],
    [5.13 * HOUR, "5.1 hrs"],
    [47 * HOUR, "47 hrs"],
    [2.3 * DAY, "2.3 days"],
    [13 * DAY, "13 days"],
    [1.5 * WEEK, "10.5 days"], // still inside the 14-day band
    [3 * WEEK, "3 wks"],
    [2 * WEEK, "2 wks"],
  ];
  it.each(durations)("formatDuration(%d) → %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  const ages: Array<[number, string]> = [
    [30 * 60_000, "30 minutes"],
    [HOUR, "1 hour"],
    [3 * HOUR, "3 hours"],
    [DAY, "1 day"],
    [3 * DAY, "3 days"],
    [3 * WEEK, "3 weeks"],
  ];
  it.each(ages)("formatAge(%d) → %s", (ms, expected) => {
    expect(formatAge(ms)).toBe(expected);
  });
});

describe("insightsCsv", () => {
  function fixture(): InsightsData {
    const w = rangeWindow("12w", NOW);
    const events = [outcome("shipped", DAY), outcome("failed", 2 * DAY)];
    return {
      window: w,
      now: NOW,
      throughput: weeklyThroughput(events, w, NOW),
      medianMs: 2 * HOUR,
      pairCount: 1,
      percentiles: percentileRows([2 * HOUR]),
      trend: { firstMs: null, secondMs: 2 * HOUR },
      velocity: velocity(1, 0),
      outcomes: runOutcomes(events),
      helpers: helperLoad(["owner", "helper"]),
      projects: perProject(
        events,
        [{ ticketId: "t1", filedAt: at(3 * HOUR), shippedAt: at(HOUR), deltaMs: 2 * HOUR }],
        new Map([["t1", "p1"]]),
        [{ id: "p1", name: 'acme "web", site', slug: "acme-website" }],
      ),
      slowest: null,
      slowestContext: null,
      stragglers: [],
    };
  }

  it("serializes every section with CSV-safe escaping", () => {
    const csv = insightsCsv(fixture());
    expect(csv).toContain("atlas insights,last 12 weeks");
    expect(csv).toContain("tickets shipped,1");
    expect(csv).toContain("week,shipped,failed");
    expect(csv).toContain("percentile,ms,hours");
    // quotes + commas escape per RFC 4180
    expect(csv).toContain('"acme ""web"", site"');
    expect(csv.endsWith("\n")).toBe(true);
  });
  it("null metrics export as empty cells, never invented zeros", () => {
    const data = { ...fixture(), medianMs: null, percentiles: [] };
    const csv = insightsCsv(data);
    expect(csv).toContain("median time-to-ship (ms),\n");
  });
});
