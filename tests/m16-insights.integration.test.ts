/**
 * M16 — the insights query layer against the REAL Neon m16-dev DB.
 * Self-cleaning (IT-M16 marker rows, deleted in afterAll); assertions
 * stay project-scoped wherever the metric is instance-wide so parallel
 * test files can't race them. The pure derivations have their own
 * tables — this file proves the WIRING: feed rows in, honest rows out,
 * helper-lane `shipped` rows excluded, state-entry evidence honored.
 */
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/src/db/client";
import { feedEvents, projects, runs, tickets } from "@/src/db/schema";
import { insightsCsv } from "@/src/domain/insights/csv";
import { insightsData } from "@/src/domain/insights/queries";

const MARK = `IT-M16-${Date.now()}`;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const now = Date.now();

let projectId: string;
let stragglerRef: string;
const stragglerMovedAt = new Date(now - 200 * DAY);
const cleanup = { tickets: [] as string[], runs: [] as string[] };

beforeAll(async () => {
  const [p] = await db
    .insert(projects)
    .values({ name: `${MARK}-proj`, slug: MARK.toLowerCase(), pinned: false, seeded: false })
    .returning({ id: projects.id });
  projectId = p.id;

  // two shipped tickets with filed→shipped deltas of 2h and 6h (avg 4h),
  // shipped inside the last 30 days.
  const mkShipped = async (suffix: string, filedAgoMs: number, deltaMs: number) => {
    const filedAt = new Date(now - filedAgoMs);
    const shippedAt = new Date(filedAt.getTime() + deltaMs);
    const [t] = await db
      .insert(tickets)
      .values({
        ref: `${MARK}-${suffix}`,
        projectId,
        title: `${MARK} shipped ${suffix}`,
        state: "shipped",
        reporter: "it-suite",
        createdAt: filedAt,
        updatedAt: shippedAt,
      })
      .returning({ id: tickets.id });
    cleanup.tickets.push(t.id);
    const [r] = await db
      .insert(runs)
      .values({
        ref: `${MARK}-R-${suffix}`,
        projectId,
        ticketId: t.id,
        title: `${MARK} run ${suffix}`,
        state: "shipped",
        lane: "owner",
        createdAt: filedAt,
        updatedAt: shippedAt,
      })
      .returning({ id: runs.id });
    cleanup.runs.push(r.id);
    await db.insert(feedEvents).values([
      {
        kind: "filed",
        actor: "it-suite",
        summary: `${MARK}-${suffix} filed`,
        projectId,
        ticketId: t.id,
        createdAt: filedAt,
        readAt: filedAt,
      },
      {
        kind: "shipped",
        actor: "Engine",
        summary: `${MARK}-${suffix} shipped`,
        projectId,
        ticketId: t.id,
        runId: r.id,
        payload: { from: "review-ready", to: "shipped" },
        createdAt: shippedAt,
        readAt: shippedAt,
      },
    ]);
    return { ticketId: t.id, runId: r.id };
  };
  await mkShipped("A", 5 * DAY, 2 * HOUR);
  const b = await mkShipped("B", 3 * DAY, 6 * HOUR);

  // one failed owner run on ticket B (the retry story).
  const [fr] = await db
    .insert(runs)
    .values({
      ref: `${MARK}-R-F`,
      projectId,
      ticketId: b.ticketId,
      title: `${MARK} failed attempt`,
      state: "failed",
      lane: "owner",
      createdAt: new Date(now - 4 * DAY),
      updatedAt: new Date(now - 4 * DAY),
    })
    .returning({ id: runs.id });
  cleanup.runs.push(fr.id);
  await db.insert(feedEvents).values({
    kind: "failed",
    actor: "Engine",
    summary: `${MARK} failed attempt`,
    projectId,
    ticketId: b.ticketId,
    runId: fr.id,
    payload: { from: "running", to: "failed" },
    createdAt: new Date(now - 4 * DAY),
    readAt: new Date(now - 4 * DAY),
  });

  // a COMPLETED HELPER run whose terminal feed row reads `shipped` —
  // the exact row insights must NOT count as a code landing.
  const [hr] = await db
    .insert(runs)
    .values({
      ref: `${MARK}-R-H`,
      projectId,
      title: `${MARK} helper enrich`,
      state: "shipped",
      lane: "helper",
      helperKind: "enrich-ticket",
      createdAt: new Date(now - 2 * DAY),
      updatedAt: new Date(now - 2 * DAY),
    })
    .returning({ id: runs.id });
  cleanup.runs.push(hr.id);
  await db.insert(feedEvents).values({
    kind: "shipped",
    actor: "Engine",
    summary: `${MARK} helper completion (not a code landing)`,
    projectId,
    runId: hr.id,
    payload: { from: "review-ready", to: "shipped" },
    createdAt: new Date(now - 2 * DAY),
    readAt: new Date(now - 2 * DAY),
  });

  // an ancient open ticket whose state-entry evidence is a `moved` feed
  // row 200 days back while updated_at is RECENT — the straggler must
  // read the record, not the touch time.
  stragglerRef = `${MARK}-S`;
  const [st] = await db
    .insert(tickets)
    .values({
      ref: stragglerRef,
      projectId,
      title: `${MARK} straggler`,
      state: "backlog",
      reporter: "it-suite",
      createdAt: new Date(now - 201 * DAY),
      updatedAt: new Date(now - 1 * DAY),
    })
    .returning({ id: tickets.id });
  cleanup.tickets.push(st.id);
  await db.insert(feedEvents).values({
    kind: "moved",
    actor: "you",
    summary: `${stragglerRef} moved to backlog`,
    projectId,
    ticketId: st.id,
    payload: { from: "triage", to: "backlog" },
    createdAt: stragglerMovedAt,
    readAt: stragglerMovedAt,
  });
});

afterAll(async () => {
  await db.delete(feedEvents).where(eq(feedEvents.projectId, projectId));
  if (cleanup.runs.length) await db.delete(runs).where(inArray(runs.id, cleanup.runs));
  if (cleanup.tickets.length) await db.delete(tickets).where(inArray(tickets.id, cleanup.tickets));
  await db.delete(projects).where(eq(projects.id, projectId));
});

describe("insightsData over real rows", () => {
  it("per-project rows: 2 ships + 1 fail + avg 4h; helper `shipped` rows never count", async () => {
    const data = await insightsData("30d");
    const row = data.projects.find((p) => p.name === `${MARK}-proj`);
    expect(row).toBeDefined();
    expect(row!.shipped).toBe(2); // 3 if the helper completion leaked in
    expect(row!.failed).toBe(1);
    expect(row!.pairCount).toBe(2);
    expect(row!.avgMs).toBe(4 * HOUR);
  });

  it("window plumbing + instance-wide invariants hold", async () => {
    const data = await insightsData("12w");
    expect(data.window.label).toBe("last 12 weeks");
    expect(data.throughput.bars).toHaveLength(12);
    expect(data.throughput.currentIndex).toBe(11);
    // shares add up over projects with ships (rounding tolerance)
    const shareSum = data.projects.reduce((a, p) => a + p.sharePct, 0);
    expect(shareSum).toBeGreaterThanOrEqual(95);
    expect(shareSum).toBeLessThanOrEqual(105);
    expect(data.pairCount).toBeGreaterThanOrEqual(2);
    expect(data.medianMs).not.toBeNull();
    expect(data.percentiles).toHaveLength(4);
    expect(data.outcomes.failureRatePct).not.toBeNull();
  });

  it("stragglers read state-entry from the feed record, not last touch", async () => {
    const data = await insightsData("12w");
    const row = data.stragglers.find((s) => s.ref === stragglerRef);
    expect(row).toBeDefined(); // 200 days in backlog tops any seeded field
    expect(Math.abs(row!.enteredStateAt.getTime() - stragglerMovedAt.getTime())).toBeLessThan(
      2_000,
    );
    expect(row!.ageMs).toBeGreaterThan(199 * DAY);
  });

  it("range=all derives without a comparison window", async () => {
    const data = await insightsData("all");
    expect(data.window.from).toBeNull();
    expect(data.velocity).toEqual({ kind: "none" });
    expect(data.throughput.totalShipped).toBeGreaterThanOrEqual(2);
  });

  it("the CSV export serializes the same read", async () => {
    const data = await insightsData("30d");
    const csv = insightsCsv(data);
    expect(csv).toContain(`${MARK}-proj`);
    expect(csv).toContain("week,shipped,failed");
  });
});
