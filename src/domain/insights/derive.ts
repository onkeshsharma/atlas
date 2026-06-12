/**
 * M16 — Insights derivations (PRD #55): pure functions over the real
 * record. Every number on /insights comes from these — no DB, no IO, no
 * estimates. The query layer (./queries.ts) feeds them rows; the tables
 * in tests/m16-insights-pure.test.ts feed them synthetic streams
 * (incl. empty/degenerate — the charter's hard requirement).
 *
 * Honesty rules baked in:
 * - percentiles are nearest-rank over REAL filed→shipped deltas; small N
 *   is the caller's to disclose ("from N shipped Tickets"), never padded.
 * - a velocity comparison only exists when a previous window exists —
 *   range=all yields `none`, prev=0 yields `new`, never a fake percent.
 * - stragglers = open Tickets sitting STRICTLY longer than the median of
 *   open Tickets — one open Ticket is never "longer than typical".
 */

export type InsightsRange = "30d" | "12w" | "all";

export const INSIGHTS_RANGES: readonly InsightsRange[] = ["30d", "12w", "all"];

export function isInsightsRange(v: unknown): v is InsightsRange {
  return typeof v === "string" && (INSIGHTS_RANGES as readonly string[]).includes(v);
}

export type RangeWindow = {
  range: InsightsRange;
  /** inclusive window start; null = all time. */
  from: Date | null;
  /** start of the previous equal-length window; null when range=all. */
  prevFrom: Date | null;
  /** breadcrumb phrase — "last 30 days" / "last 12 weeks" / "all time". */
  label: string;
  /** hero phrase — "over the last 30 days" / "over 12 weeks" / "all time". */
  heroLabel: string;
  /** the comparison phrase — "the 30 days before" etc. (null = no compare). */
  compareLabel: string | null;
};

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/** start of the local Monday (the cockpit's weekStart law — M6). */
export function weekStartOf(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Mon=0
  return d;
}

export function rangeWindow(range: InsightsRange, now: Date): RangeWindow {
  if (range === "30d") {
    const from = new Date(now.getTime() - 30 * DAY_MS);
    return {
      range,
      from,
      prevFrom: new Date(from.getTime() - 30 * DAY_MS),
      label: "last 30 days",
      heroLabel: "over the last 30 days",
      compareLabel: "the 30 days before",
    };
  }
  if (range === "12w") {
    // 12 calendar weeks ending now: this week (Mon-anchored) + 11 before —
    // matches OO's w1..w12 axis where w12 is the running week.
    const from = new Date(weekStartOf(now).getTime() - 11 * WEEK_MS);
    return {
      range,
      from,
      prevFrom: new Date(from.getTime() - 12 * WEEK_MS),
      label: "last 12 weeks",
      heroLabel: "over 12 weeks",
      compareLabel: "the 12 weeks before",
    };
  }
  return {
    range,
    from: null,
    prevFrom: null,
    label: "all time",
    heroLabel: "all time",
    compareLabel: null,
  };
}

// ── weekly throughput (OO:131–185) ─────────────────────────────────────

export type OutcomeEvent = {
  kind: "shipped" | "failed" | "cancelled";
  at: Date;
  projectId: string | null;
  ticketId: string | null;
  /** run rows carry it; ship rows recorded straight on a ticket may not. */
  runId: string | null;
};

export type ThroughputBar = { label: string; shipped: number; failed: number };

export type Throughput = {
  bars: ThroughputBar[];
  /** index of the running week (always the last bar). */
  currentIndex: number;
  /** 0-based index of the best week, ties broken latest; null when no ships. */
  bestIndex: number | null;
  totalShipped: number;
  totalFailed: number;
};

/**
 * Monday-anchored weekly buckets covering the window (oldest → current
 * week). For range=all the first bucket is the earliest event's week
 * (one empty bucket when there are no events — the chart stays honest,
 * not invented).
 */
export function weeklyThroughput(
  events: readonly OutcomeEvent[],
  window: RangeWindow,
  now: Date,
): Throughput {
  const thisWeek = weekStartOf(now).getTime();
  let firstWeek: number;
  if (window.from) {
    firstWeek = weekStartOf(window.from).getTime();
  } else {
    const earliest = events.reduce<number | null>(
      (min, e) => (min === null || e.at.getTime() < min ? e.at.getTime() : min),
      null,
    );
    firstWeek = earliest === null ? thisWeek : weekStartOf(new Date(earliest)).getTime();
  }
  const weekCount = Math.max(1, Math.round((thisWeek - firstWeek) / WEEK_MS) + 1);
  const bars: ThroughputBar[] = Array.from({ length: weekCount }, (_, i) => ({
    label: `w${i + 1}`,
    shipped: 0,
    failed: 0,
  }));
  let totalShipped = 0;
  let totalFailed = 0;
  for (const e of events) {
    if (e.kind === "cancelled") continue; // OO charts ships + failures only
    if (window.from && e.at < window.from) continue;
    const idx = Math.floor((weekStartOf(e.at).getTime() - firstWeek) / WEEK_MS);
    if (idx < 0 || idx >= weekCount) continue;
    if (e.kind === "shipped") {
      bars[idx].shipped++;
      totalShipped++;
    } else {
      bars[idx].failed++;
      totalFailed++;
    }
  }
  let bestIndex: number | null = null;
  for (let i = 0; i < bars.length; i++) {
    if (bars[i].shipped > 0 && (bestIndex === null || bars[i].shipped >= bars[bestIndex].shipped)) {
      bestIndex = i;
    }
  }
  return { bars, currentIndex: weekCount - 1, bestIndex, totalShipped, totalFailed };
}

// ── time-to-ship (OO:188–225) ───────────────────────────────────────────

export type LifecycleEvent = { kind: "filed" | "shipped"; ticketId: string; at: Date };

export type ShipPair = { ticketId: string; filedAt: Date; shippedAt: Date; deltaMs: number };

/**
 * filed → shipped pairs: first `filed` per ticket, first `shipped` at or
 * after it. Tickets missing either side simply don't pair — the surface
 * discloses N instead of inventing.
 */
export function timeToShipPairs(events: readonly LifecycleEvent[]): ShipPair[] {
  const filed = new Map<string, Date>();
  for (const e of events) {
    if (e.kind !== "filed") continue;
    const prev = filed.get(e.ticketId);
    if (!prev || e.at < prev) filed.set(e.ticketId, e.at);
  }
  const shipped = new Map<string, Date>();
  for (const e of events) {
    if (e.kind !== "shipped") continue;
    const filedAt = filed.get(e.ticketId);
    if (!filedAt || e.at < filedAt) continue;
    const prev = shipped.get(e.ticketId);
    if (!prev || e.at < prev) shipped.set(e.ticketId, e.at);
  }
  const pairs: ShipPair[] = [];
  for (const [ticketId, shippedAt] of shipped) {
    const filedAt = filed.get(ticketId)!;
    pairs.push({ ticketId, filedAt, shippedAt, deltaMs: shippedAt.getTime() - filedAt.getTime() });
  }
  return pairs.sort((a, b) => a.shippedAt.getTime() - b.shippedAt.getTime());
}

/** nearest-rank percentile over an UNSORTED sample; null on empty. */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[Math.min(rank, sorted.length) - 1];
}

export type PercentileRow = { label: string; p: number; ms: number; widthPct: number };

/** OO:203–208's four rows, widths proportional to the slowest row. */
export function percentileRows(deltasMs: readonly number[]): PercentileRow[] {
  const spec = [
    { label: "Fastest 10%", p: 10 },
    { label: "Median (P50)", p: 50 },
    { label: "Slow tail (P90)", p: 90 },
    { label: "The stragglers (P99)", p: 99 },
  ];
  if (deltasMs.length === 0) return [];
  const rows = spec.map(({ label, p }) => ({ label, p, ms: percentile(deltasMs, p)! }));
  const max = Math.max(...rows.map((r) => r.ms), 1);
  return rows.map((r) => ({ ...r, widthPct: Math.max(Math.round((r.ms / max) * 100), 2) }));
}

/**
 * medians of the window's first and second halves — the Engine-read
 * trend ("median dropped from X to Y"), computed, never narrated.
 * Pairs bucket by ship date. null halves = not enough history.
 */
export function halfWindowMedians(
  pairs: readonly ShipPair[],
  window: RangeWindow,
  now: Date,
): { firstMs: number | null; secondMs: number | null } {
  if (pairs.length === 0) return { firstMs: null, secondMs: null };
  const start = window.from?.getTime() ?? Math.min(...pairs.map((p) => p.shippedAt.getTime()));
  const mid = start + (now.getTime() - start) / 2;
  const first = pairs.filter((p) => p.shippedAt.getTime() < mid).map((p) => p.deltaMs);
  const second = pairs.filter((p) => p.shippedAt.getTime() >= mid).map((p) => p.deltaMs);
  return { firstMs: percentile(first, 50), secondMs: percentile(second, 50) };
}

// ── velocity (OO:84–93, rail :324–354) ─────────────────────────────────

export type Velocity =
  | { kind: "compared"; pctChange: number; direction: "up" | "down" | "flat" }
  | { kind: "new" } //   previous window had zero ships, this one didn't
  | { kind: "quiet" } // both windows empty
  | { kind: "none" }; // no previous window exists (range=all)

export function velocity(current: number, previous: number | null): Velocity {
  if (previous === null) return { kind: "none" };
  if (previous === 0 && current === 0) return { kind: "quiet" };
  if (previous === 0) return { kind: "new" };
  const pctChange = Math.round(((current - previous) / previous) * 100);
  return {
    kind: "compared",
    pctChange,
    direction: pctChange > 0 ? "up" : pctChange < 0 ? "down" : "flat",
  };
}

// ── run outcomes + helper load (charter item 1) ─────────────────────────

export type RunOutcomes = {
  shipped: number;
  failed: number;
  cancelled: number;
  total: number;
  /** failed / terminal, rounded to one decimal; null when no terminal runs. */
  failureRatePct: number | null;
};

/** terminal RUN outcomes — rows must carry a runId (ship rows recorded straight on a ticket aren't run outcomes). */
export function runOutcomes(events: readonly OutcomeEvent[]): RunOutcomes {
  let shipped = 0;
  let failed = 0;
  let cancelled = 0;
  for (const e of events) {
    if (!e.runId) continue;
    if (e.kind === "shipped") shipped++;
    else if (e.kind === "failed") failed++;
    else cancelled++;
  }
  const total = shipped + failed + cancelled;
  return {
    shipped,
    failed,
    cancelled,
    total,
    failureRatePct: total === 0 ? null : Math.round((failed / total) * 1000) / 10,
  };
}

export type HelperLoad = { owner: number; helper: number; total: number };

export function helperLoad(lanes: readonly ("owner" | "helper")[]): HelperLoad {
  const helper = lanes.filter((l) => l === "helper").length;
  return { owner: lanes.length - helper, helper, total: lanes.length };
}

// ── per project (OO:228–281) ────────────────────────────────────────────

export type ProjectInput = { id: string; name: string; slug: string };

export type ProjectInsightRow = {
  name: string;
  slug: string;
  shipped: number;
  failed: number;
  /** share of all ships in range, whole percent; 0 when no ships anywhere. */
  sharePct: number;
  /** mean filed→shipped over this project's pairs; null = unmeasured. */
  avgMs: number | null;
  pairCount: number;
};

/**
 * one row per project with any outcome activity in range, ordered by
 * ships desc then name — OO's "N active" census is `rows.length`.
 */
export function perProject(
  events: readonly OutcomeEvent[],
  pairs: readonly ShipPair[],
  ticketProject: ReadonlyMap<string, string>,
  projects: readonly ProjectInput[],
): ProjectInsightRow[] {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const acc = new Map<string, { shipped: number; failed: number; deltas: number[] }>();
  const bucket = (id: string) => {
    let b = acc.get(id);
    if (!b) {
      b = { shipped: 0, failed: 0, deltas: [] };
      acc.set(id, b);
    }
    return b;
  };
  let totalShipped = 0;
  for (const e of events) {
    if (!e.projectId || !byId.has(e.projectId)) continue;
    if (e.kind === "shipped") {
      bucket(e.projectId).shipped++;
      totalShipped++;
    } else if (e.kind === "failed") {
      bucket(e.projectId).failed++;
    }
  }
  for (const p of pairs) {
    const projectId = ticketProject.get(p.ticketId);
    if (projectId && byId.has(projectId)) bucket(projectId).deltas.push(p.deltaMs);
  }
  const rows: ProjectInsightRow[] = [];
  for (const [id, b] of acc) {
    const { name, slug } = byId.get(id)!;
    rows.push({
      name,
      slug,
      shipped: b.shipped,
      failed: b.failed,
      sharePct: totalShipped === 0 ? 0 : Math.round((b.shipped / totalShipped) * 100),
      avgMs:
        b.deltas.length === 0
          ? null
          : Math.round(b.deltas.reduce((a, v) => a + v, 0) / b.deltas.length),
      pairCount: b.deltas.length,
    });
  }
  return rows.sort((a, b) => b.shipped - a.shipped || a.name.localeCompare(b.name));
}

/** the slowest measured project (highest avg) — the Engine-suggests subject. */
export function slowestProject(rows: readonly ProjectInsightRow[]): ProjectInsightRow | null {
  let slowest: ProjectInsightRow | null = null;
  for (const r of rows) {
    if (r.avgMs === null) continue;
    if (!slowest || r.avgMs > slowest.avgMs!) slowest = r;
  }
  return slowest;
}

// ── stragglers (OO:284–319) ─────────────────────────────────────────────

export type OpenTicketInput = {
  ref: string;
  title: string;
  /** ticket-state word — "backlog", "needs-info"… */
  state: string;
  projectName: string;
  /** when the ticket entered its current state, best evidence first
   *  (state-change feed row → filed row → last touch). */
  enteredStateAt: Date;
  /** open blocker's ref, when a ticket_links edge says so. */
  blockedBy?: string;
};

export type StragglerRow = OpenTicketInput & { ageMs: number };

/**
 * open Tickets sitting STRICTLY longer in their state than the median
 * open Ticket — "longer than typical" needs a typical to exceed, so a
 * lone open Ticket (or a perfectly even field) yields none. Capped 5.
 */
export function stragglers(open: readonly OpenTicketInput[], now: Date, cap = 5): StragglerRow[] {
  if (open.length < 2) return [];
  const aged = open.map((t) => ({ ...t, ageMs: now.getTime() - t.enteredStateAt.getTime() }));
  const median = percentile(aged.map((t) => t.ageMs), 50)!;
  return aged
    .filter((t) => t.ageMs > median)
    .sort((a, b) => b.ageMs - a.ageMs)
    .slice(0, cap);
}

// ── display formatting (OO's "~5 hrs" / "2 days" vocabulary) ────────────

const HOUR_MS = 3_600_000;

/** "18 min" · "5.1 hrs" · "2.3 days" · "1.5 wks" — one unit, one decimal. */
export function formatDuration(ms: number): string {
  if (ms < HOUR_MS) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  if (ms < 48 * HOUR_MS) return withUnit(ms / HOUR_MS, "hr", "hrs");
  if (ms < 14 * DAY_MS) return withUnit(ms / DAY_MS, "day", "days");
  return withUnit(ms / WEEK_MS, "wk", "wks");
}

function withUnit(v: number, singular: string, plural: string): string {
  const display = trimDecimal(v);
  return `${display} ${display === "1" ? singular : plural}`;
}

function trimDecimal(v: number): string {
  const oneDp = Math.round(v * 10) / 10;
  return Number.isInteger(oneDp) ? String(oneDp) : oneDp.toFixed(1);
}

/** compact age for straggler meta — "3 hours" / "2 days" (OO:17–19 vocabulary). */
export function formatAge(ms: number): string {
  if (ms < HOUR_MS) return `${Math.max(1, Math.round(ms / 60_000))} minutes`;
  if (ms < DAY_MS) {
    const h = Math.round(ms / HOUR_MS);
    return h === 1 ? "1 hour" : `${h} hours`;
  }
  if (ms < 14 * DAY_MS) {
    const d = Math.round(ms / DAY_MS);
    return d === 1 ? "1 day" : `${d} days`;
  }
  const w = Math.round(ms / WEEK_MS);
  return w === 1 ? "1 week" : `${w} weeks`;
}
