/**
 * M6 — integration against the REAL Neon atlas-v2 DB (PRD testing
 * decisions): the transition write helper's single-statement
 * update+outbox atomicity, the cockpit queries, and the live broker's
 * cursor poll. Self-cleaning: every row is created here and deleted in
 * afterAll (marker prefix "IT-M6").
 */
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/src/db/client";
import { feedEvents, projects, runs, tickets } from "@/src/db/schema";
import { heroCounts, recentTickets } from "@/src/domain/cockpit/queries";
import { recentFeedEvents, unreadCount } from "@/src/domain/feed/queries";
import { latestCursor, pollLiveEvents } from "@/src/domain/live/broker";
import type { NeedsInputQuestion } from "@/src/domain/run/needs-input";
import { activeRuns, needsInputRuns } from "@/src/domain/run/queries";
import { applyRunTransition } from "@/src/domain/run/transitions";

const MARK = `IT-M6-${Date.now()}`;
let projectId: string;
let ticketId: string;
let runId: string;

beforeAll(async () => {
  const [p] = await db
    .insert(projects)
    .values({ name: `${MARK}-project`, pinned: true, seeded: false })
    .returning({ id: projects.id });
  projectId = p.id;
  const [t] = await db
    .insert(tickets)
    .values({
      ref: `${MARK}-T1`,
      projectId,
      title: `${MARK} integration ticket`,
      state: "triage",
      reporter: "it-suite",
    })
    .returning({ id: tickets.id });
  ticketId = t.id;
  const [r] = await db
    .insert(runs)
    .values({
      ref: `${MARK}-R1`,
      projectId,
      ticketId,
      title: `${MARK} integration run`,
      state: "queued",
    })
    .returning({ id: runs.id });
  runId = r.id;
});

afterAll(async () => {
  await db.delete(feedEvents).where(inArray(feedEvents.runId, [runId]));
  await db.delete(runs).where(inArray(runs.id, [runId]));
  await db.delete(tickets).where(inArray(tickets.id, [ticketId]));
  await db.delete(projects).where(inArray(projects.id, [projectId]));
});

describe("applyRunTransition — single-statement claim + outbox", () => {
  it("illegal transition is rejected before touching the DB", async () => {
    const result = await applyRunTransition({
      runId,
      from: "queued",
      to: "shipped",
      actor: "it-suite",
    });
    expect(result).toEqual({ ok: false, reason: "illegal-transition" });
  });

  it("needs-input without a question payload is rejected", async () => {
    const result = await applyRunTransition({
      runId,
      from: "running",
      to: "needs-input",
      actor: "it-suite",
    });
    expect(result).toEqual({ ok: false, reason: "missing-payload" });
  });

  it("a stale `from` claim writes nothing — no row, no outbox event", async () => {
    const before = await latestCursor();
    const result = await applyRunTransition({
      runId,
      from: "running", // actual state is queued
      to: "review-ready",
      actor: "it-suite",
    });
    expect(result).toEqual({ ok: false, reason: "not-claimed" });
    const { events } = await pollLiveEvents(before);
    expect(events.filter((e) => e.type === "run-state-changed")).toHaveLength(0);
  });

  it("queued → running flips the row AND appends the outbox event atomically", async () => {
    const before = await latestCursor();
    const result = await applyRunTransition({
      runId,
      from: "queued",
      to: "running",
      actor: "it-suite",
    });
    expect(result.ok).toBe(true);

    const active = await activeRuns();
    const mine = active.find((r) => r.id === runId);
    expect(mine?.state).toBe("running");

    const { events } = await pollLiveEvents(before);
    const change = events.find(
      (e) => e.type === "run-state-changed" && e.runId === runId,
    );
    expect(change).toBeTruthy();
    if (change?.type === "run-state-changed") {
      expect(change.from).toBe("queued");
      expect(change.to).toBe("running");
    }
    const appended = events.find(
      (e) => e.type === "feed-appended" && e.event.runId === runId,
    );
    if (appended?.type === "feed-appended") {
      expect(appended.event.kind).toBe("started");
      expect(appended.event.summary).toContain(`${MARK}-R1`);
      expect(appended.event.ticketRef).toBe(`${MARK}-T1`);
    } else {
      throw new Error("feed-appended missing for the transition");
    }
  });

  it("running → needs-input stores the question and raises the live event", async () => {
    const question: NeedsInputQuestion = {
      kind: "permission",
      prompt: `${MARK}: include archived tickets?`,
      options: ["Include", "Skip"],
      raisedAt: new Date().toISOString(),
    };
    const before = await latestCursor();
    const result = await applyRunTransition({
      runId,
      from: "running",
      to: "needs-input",
      actor: "Engine",
      question,
    });
    expect(result.ok).toBe(true);

    // the question round-trips through jsonb into the panel query
    const waiting = await needsInputRuns();
    const mine = waiting.find((r) => r.id === runId);
    expect(mine?.question).toEqual(question);

    const { events } = await pollLiveEvents(before);
    const raised = events.find(
      (e) => e.type === "needs-input-raised" && e.runId === runId,
    );
    if (raised?.type === "needs-input-raised") {
      expect(raised.question).toEqual(question);
    } else {
      throw new Error("needs-input-raised missing");
    }
  });

  it("answering resumes the run and emits needs-input-answered", async () => {
    const answer = {
      choice: "Skip",
      answeredBy: "you",
      answeredAt: new Date().toISOString(),
    };
    const before = await latestCursor();
    const result = await applyRunTransition({
      runId,
      from: "needs-input",
      to: "running",
      actor: "you",
      answer,
    });
    expect(result.ok).toBe(true);
    const { events } = await pollLiveEvents(before);
    const answered = events.find(
      (e) => e.type === "needs-input-answered" && e.runId === runId,
    );
    if (answered?.type === "needs-input-answered") {
      expect(answered.answer).toEqual(answer);
    } else {
      throw new Error("needs-input-answered missing");
    }
  });
});

describe("cockpit queries read the real rows", () => {
  it("heroCounts counts the inserted triage ticket", async () => {
    const counts = await heroCounts();
    expect(counts.triage).toBeGreaterThanOrEqual(1);
  });

  it("recentTickets carries project name + reporter for the feed rows", async () => {
    const recent = await recentTickets(50);
    const mine = recent.find((t) => t.id === ticketId);
    expect(mine?.projectName).toBe(`${MARK}-project`);
    expect(mine?.reporter).toBe("it-suite");
  });

  it("recentFeedEvents + unreadCount see the transition events", async () => {
    const feed = await recentFeedEvents(50);
    const mine = feed.filter((e) => e.runId === runId);
    expect(mine.length).toBeGreaterThanOrEqual(3);
    expect(mine[0].projectName).toBe(`${MARK}-project`);
    // transition-written events are unread until the Owner marks them
    expect(await unreadCount()).toBeGreaterThanOrEqual(1);
  });
});
