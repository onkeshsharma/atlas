/**
 * M9 — integration against the REAL Neon m9-dev DB (PRD heavy tier):
 * every new writer's single-statement write+outbox atomicity (THE
 * OUTBOX RULE) and the stale-claim races (the M6 conditional-UPDATE
 * pattern). Self-cleaning: rows are created here and deleted in
 * afterAll (marker "IT-M9").
 */
import { randomBytes } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/src/db/client";
import {
  bridges,
  briefs,
  contextTerms,
  feedEvents,
  projects,
  runStdoutChunks,
  runs,
  tickets,
} from "@/src/db/schema";
import { bridgeFromRequest, hashBridgeToken } from "@/src/domain/bridge/auth";
import { beginDispatch } from "@/src/domain/dispatch/dispatch";
import {
  insertDraftBrief,
  writeEnrichment,
  writeIngestSummary,
} from "@/src/domain/dispatch/helper-results";
import { dispatchTicket, enqueueHelperRun } from "@/src/domain/dispatch/mutations";
import {
  activeHelperRun,
  latestBriefForTicket,
  queuedWorkOrders,
  workOrder,
} from "@/src/domain/dispatch/queries";
import { executeLiveCommand } from "@/src/domain/live/executors";
import {
  answerRun,
  claimRun,
  completeRun,
  failRun,
  ingestStdoutChunks,
} from "@/src/domain/run/bridge-writers";
import { applyRunTransition } from "@/src/domain/run/transitions";

const MARK = `IT-M9-${Date.now()}`;
const TOKEN = `it-m9-token-${randomBytes(8).toString("hex")}`;

let projectId: string;
let bridgeId: string;

async function makeTicket(state: string, body = "A story."): Promise<{ id: string; ref: string }> {
  const [row] = await db
    .insert(tickets)
    .values({
      ref: `IT9-${randomBytes(4).toString("hex")}`,
      projectId,
      title: `${MARK} ticket`,
      body,
      state: state as never,
      reporter: "it-suite",
    })
    .returning({ id: tickets.id, ref: tickets.ref });
  return row;
}

async function feedKindsFor(filter: { runId?: string; ticketId?: string }) {
  const rows = await db
    .select({ kind: feedEvents.kind, payload: feedEvents.payload })
    .from(feedEvents)
    .where(
      filter.runId ? eq(feedEvents.runId, filter.runId) : eq(feedEvents.ticketId, filter.ticketId!),
    );
  return rows;
}

beforeAll(async () => {
  const [p] = await db
    .insert(projects)
    .values({
      name: `${MARK}-project`,
      slug: MARK.toLowerCase(),
      ingestStatus: "queued",
      pinned: false,
      seeded: false,
    })
    .returning({ id: projects.id });
  projectId = p.id;

  const [b] = await db
    .insert(bridges)
    .values({ name: `${MARK}-bridge`, tokenHash: hashBridgeToken(TOKEN) })
    .returning({ id: bridges.id });
  bridgeId = b.id;
});

afterAll(async () => {
  const ticketRows = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.projectId, projectId));
  const ticketIds = ticketRows.map((t) => t.id);
  const runRows = await db
    .select({ id: runs.id })
    .from(runs)
    .where(eq(runs.projectId, projectId));
  const runIds = runRows.map((r) => r.id);

  if (runIds.length) {
    await db.delete(runStdoutChunks).where(inArray(runStdoutChunks.runId, runIds));
  }
  await db.delete(feedEvents).where(eq(feedEvents.projectId, projectId));
  if (runIds.length) await db.delete(runs).where(inArray(runs.id, runIds));
  if (ticketIds.length) await db.delete(briefs).where(inArray(briefs.ticketId, ticketIds));
  if (ticketIds.length) await db.delete(tickets).where(inArray(tickets.id, ticketIds));
  await db.delete(contextTerms).where(eq(contextTerms.projectId, projectId));
  await db.delete(projects).where(eq(projects.id, projectId));
  await db.delete(bridges).where(eq(bridges.id, bridgeId));
});

describe("enqueueHelperRun — guarded queue write + dispatched outbox", () => {
  it("creates the helper run + its `dispatched` row in one statement", async () => {
    const ticket = await makeTicket("triage");
    const result = await enqueueHelperRun({
      projectId,
      ticketId: ticket.id,
      helperKind: "enrich-ticket",
      title: `Enrich ${ticket.ref}`,
      actor: "atlas",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ref).toMatch(/^R-\d+$/);

    const events = await feedKindsFor({ runId: result.runId });
    expect(events.map((e) => e.kind)).toEqual(["dispatched"]);
    expect((events[0].payload as { lane: string }).lane).toBe("helper");

    // double-enqueue while active → clean no-op (no second run, no row)
    const again = await enqueueHelperRun({
      projectId,
      ticketId: ticket.id,
      helperKind: "enrich-ticket",
      title: `Enrich ${ticket.ref}`,
      actor: "atlas",
    });
    expect(again).toEqual({ ok: false, reason: "already-active" });
    expect(await activeHelperRun(ticket.id, "enrich-ticket")).not.toBeNull();
  });
});

describe("claimRun — the queued→running conditional claim (stale-claim race)", () => {
  it("first claim wins and writes `started`; the second loses cleanly", async () => {
    const ticket = await makeTicket("triage");
    const enq = await enqueueHelperRun({
      projectId,
      ticketId: ticket.id,
      helperKind: "draft-brief",
      title: `Draft Brief for ${ticket.ref}`,
      actor: "atlas",
    });
    if (!enq.ok) throw new Error("enqueue failed");

    const claim = { runId: enq.runId, bridgeId, worktreePath: "C:\\wt\\x", branch: "atlas/run/x" };
    const first = await claimRun(claim);
    expect(first.ok).toBe(true);
    const second = await claimRun(claim);
    expect(second).toEqual({ ok: false, reason: "not-claimed" });

    const [row] = await db.select().from(runs).where(eq(runs.id, enq.runId));
    expect(row.state).toBe("running");
    expect(row.bridgeId).toBe(bridgeId);
    expect(row.worktreePath).toBe("C:\\wt\\x");
    const events = await feedKindsFor({ runId: enq.runId });
    expect(events.map((e) => e.kind).sort()).toEqual(["dispatched", "started"]);
  });
});

describe("completeRun / failRun / answerRun — the M9 sibling writers", () => {
  it("completeRun stores the diff stats with the review-ready flip", async () => {
    const ticket = await makeTicket("triage");
    const enq = await enqueueHelperRun({
      projectId,
      ticketId: ticket.id,
      helperKind: "draft-brief",
      title: "complete fixture",
      actor: "atlas",
    });
    if (!enq.ok) throw new Error("enqueue failed");
    await claimRun({ runId: enq.runId, bridgeId, worktreePath: null, branch: null });

    const diffStats = {
      filesChanged: 1,
      insertions: 3,
      deletions: 1,
      files: [{ path: "src/x.ts", insertions: 3, deletions: 1 }],
    };
    const done = await completeRun({ runId: enq.runId, diffStats });
    expect(done.ok).toBe(true);
    // stale post after the fact loses
    expect(await completeRun({ runId: enq.runId, diffStats: null })).toEqual({
      ok: false,
      reason: "not-claimed",
    });
    const [row] = await db.select().from(runs).where(eq(runs.id, enq.runId));
    expect(row.state).toBe("review-ready");
    expect(row.diffStats).toEqual(diffStats);
  });

  it("failRun records the typed kind + detail", async () => {
    const ticket = await makeTicket("triage");
    const enq = await enqueueHelperRun({
      projectId,
      ticketId: ticket.id,
      helperKind: "enrich-ticket",
      title: "fail fixture",
      actor: "atlas",
    });
    if (!enq.ok) throw new Error("enqueue failed");
    await claimRun({ runId: enq.runId, bridgeId, worktreePath: null, branch: null });

    const failed = await failRun({
      runId: enq.runId,
      failureKind: "engine-crash",
      failureDetail: "exit 1",
    });
    expect(failed.ok).toBe(true);
    const [row] = await db.select().from(runs).where(eq(runs.id, enq.runId));
    expect(row.state).toBe("failed");
    expect(row.failureKind).toBe("engine-crash");
    expect(row.failureDetail).toBe("exit 1");
    const events = await feedKindsFor({ runId: enq.runId });
    expect(events.map((e) => e.kind)).toContain("failed");
  });

  it("answerRun appends {question, answer} to question_history in the SAME claim", async () => {
    const ticket = await makeTicket("triage");
    const enq = await enqueueHelperRun({
      projectId,
      ticketId: ticket.id,
      helperKind: "enrich-ticket",
      title: "answer fixture",
      actor: "atlas",
    });
    if (!enq.ok) throw new Error("enqueue failed");
    await claimRun({ runId: enq.runId, bridgeId, worktreePath: null, branch: null });

    const question = {
      kind: "question" as const,
      prompt: "Which env?",
      raisedAt: new Date().toISOString(),
    };
    const raised = await applyRunTransition({
      runId: enq.runId,
      from: "running",
      to: "needs-input",
      actor: "Engine",
      question,
    });
    expect(raised.ok).toBe(true);

    const answer = { text: "staging", answeredBy: "you", answeredAt: new Date().toISOString() };
    const answered = await answerRun({ runId: enq.runId, answer });
    expect(answered.ok).toBe(true);
    // answering twice loses cleanly (the run already resumed)
    expect(await answerRun({ runId: enq.runId, answer })).toEqual({
      ok: false,
      reason: "not-claimed",
    });

    const [row] = await db.select().from(runs).where(eq(runs.id, enq.runId));
    expect(row.state).toBe("running");
    expect(row.answer).toEqual(answer);
    const history = row.questionHistory as Array<{ question: unknown; answer: unknown }>;
    expect(history).toHaveLength(1);
    expect(history[0].question).toEqual(question);
    expect(history[0].answer).toEqual(answer);

    const events = await feedKindsFor({ runId: enq.runId });
    const answeredRow = events.find((e) => e.kind === "answered");
    expect((answeredRow?.payload as { answer: unknown }).answer).toEqual(answer);
  });
});

describe("ingestStdoutChunks — idempotent, never the outbox", () => {
  it("dedupes on (run_id, seq); writes no feed rows", async () => {
    const ticket = await makeTicket("triage");
    const enq = await enqueueHelperRun({
      projectId,
      ticketId: ticket.id,
      helperKind: "draft-brief",
      title: "stdout fixture",
      actor: "atlas",
    });
    if (!enq.ok) throw new Error("enqueue failed");

    const before = (await feedKindsFor({ runId: enq.runId })).length;
    expect(
      await ingestStdoutChunks(enq.runId, [
        { seq: 1, content: "line one\n" },
        { seq: 2, content: "line two\n" },
      ]),
    ).toEqual({ inserted: 2 });
    expect(await ingestStdoutChunks(enq.runId, [{ seq: 1, content: "dup\n" }])).toEqual({
      inserted: 0,
    });
    const chunks = await db
      .select()
      .from(runStdoutChunks)
      .where(eq(runStdoutChunks.runId, enq.runId));
    expect(chunks).toHaveLength(2);
    expect((await feedKindsFor({ runId: enq.runId })).length).toBe(before); // stdout NEVER in feed_events
  });
});

describe("helper deliverable writers — validated, atomic, outboxed", () => {
  it("writeEnrichment: valid payload lands + `enriched` row; junk is rejected before the DB", async () => {
    const ticket = await makeTicket("triage");
    expect(await writeEnrichment({ ticketId: ticket.id, enrichment: { kind: "??" } })).toEqual({
      ok: false,
      reason: "invalid-payload",
    });

    const enrichment = {
      kind: "bug",
      severity: "medium",
      confidence: "medium",
      likelyFiles: ["src/a.ts"],
      enrichedAt: new Date().toISOString(),
    };
    const ok = await writeEnrichment({ ticketId: ticket.id, enrichment });
    expect(ok.ok).toBe(true);
    const [row] = await db.select().from(tickets).where(eq(tickets.id, ticket.id));
    expect(row.enrichment).toEqual(enrichment);
    const events = await feedKindsFor({ ticketId: ticket.id });
    expect(events.map((e) => e.kind)).toContain("enriched");
  });

  it("writeIngestSummary: flips queued→ready, validates the shape, suggests terms idempotently", async () => {
    expect(
      await writeIngestSummary({ projectId, summary: { schemaVersion: 2 } }),
    ).toEqual({ ok: false, reason: "invalid-payload" });

    const summary = {
      schemaVersion: 1,
      tagline: "fixture",
      engineRead: ["read"],
      stack: ["TypeScript"],
      stackProse: "prose",
      architectureProse: "prose",
      architecture: [{ name: "src", sub: "tier", detail: "d" }],
      smells: [],
      health: [{ label: "Builds", value: "clean", ok: true }],
      churnWeeks: [1, 2],
      coverage: [{ area: "Overall", pct: 50, hero: true }],
      stats: { coveragePct: 50, prevCoveragePct: null, linesOfCode: "~100", files: 3 },
      commits: [],
      commitsTotal: 0,
      repo: { branch: "main", commitsSinceIngest: 0 },
    };
    const ok = await writeIngestSummary({
      projectId,
      summary,
      suggestedTerms: [{ term: `${MARK}-term`, uses: 4 }],
    });
    expect(ok.ok).toBe(true);

    const [proj] = await db.select().from(projects).where(eq(projects.id, projectId));
    expect(proj.ingestStatus).toBe("ready");
    expect(proj.ingestedAt).not.toBeNull();

    // idempotent suggestion (unique (project, term))
    const again = await writeIngestSummary({
      projectId,
      summary,
      suggestedTerms: [{ term: `${MARK}-term`, uses: 9 }],
    });
    expect(again.ok).toBe(true);
    const terms = await db
      .select()
      .from(contextTerms)
      .where(and(eq(contextTerms.projectId, projectId), eq(contextTerms.term, `${MARK}-term`)));
    expect(terms).toHaveLength(1);
    expect(terms[0].status).toBe("suggested");
    expect(terms[0].provenance).toBe("engine");
    expect(terms[0].uses).toBe(4); // first write wins; re-ingest never clobbers
  });
});

describe("the dispatch pipeline (Ticket → Brief → Run → queue)", () => {
  it("beginDispatch with no Brief queues the draft-brief helper; again → brief-pending", async () => {
    const ticket = await makeTicket("approved");
    const first = await beginDispatch({ ticketId: ticket.id, actor: "you" });
    expect(first).toMatchObject({ ok: true, phase: "brief-queued" });
    const second = await beginDispatch({ ticketId: ticket.id, actor: "you" });
    expect(second).toEqual({ ok: false, reason: "brief-pending" });
    // and never from a non-approved state
    const triaged = await makeTicket("triage");
    expect(await beginDispatch({ ticketId: triaged.id, actor: "you" })).toEqual({
      ok: false,
      reason: "not-approved",
    });
  });

  it("dispatchTicket: ONE statement finalizes the Brief + creates the Run; ticket → in-progress; the loser race cancels its run", async () => {
    const ticket = await makeTicket("approved");
    const drafted = await insertDraftBrief({
      ticketId: ticket.id,
      body: "# Brief\nDo it.",
      source: "helper-run",
    });
    expect(drafted.ok).toBe(true);
    if (!drafted.ok) return;
    const events0 = await feedKindsFor({ ticketId: ticket.id });
    expect(events0.map((e) => e.kind)).toContain("brief-drafted");

    const dispatched = await dispatchTicket({
      ticketId: ticket.id,
      briefId: drafted.briefId,
      actor: "you",
    });
    expect(dispatched.ok).toBe(true);
    if (!dispatched.ok) return;

    const brief = await latestBriefForTicket(ticket.id);
    expect(brief?.status).toBe("final");
    const [trow] = await db.select().from(tickets).where(eq(tickets.id, ticket.id));
    expect(trow.state).toBe("in-progress");
    const [rrow] = await db.select().from(runs).where(eq(runs.id, dispatched.runId));
    expect(rrow.lane).toBe("owner");
    expect(rrow.briefId).toBe(drafted.briefId);
    expect(rrow.queuePosition).not.toBeNull();

    // the run is a queued work order the Bridge can see
    const orders = await queuedWorkOrders();
    const mine = orders.find((o) => o.runId === dispatched.runId);
    expect(mine?.briefBody).toBe("# Brief\nDo it.");
    expect(mine?.project.id).toBe(projectId);
    const order = await workOrder(dispatched.runId);
    expect(order?.ticket?.ref).toBe(ticket.ref);

    // racing dispatch: ticket is no longer approved → loser backs off
    const raced = await dispatchTicket({
      ticketId: ticket.id,
      briefId: drafted.briefId,
      actor: "you",
    });
    expect(raced.ok).toBe(false);
  });

  it("queuedWorkOrders puts owner-lane runs ahead of older helpers (PRD #21)", async () => {
    const orders = await queuedWorkOrders();
    const lanes = orders.map((o) => o.lane);
    const firstHelper = lanes.indexOf("helper");
    const lastOwner = lanes.lastIndexOf("owner");
    if (firstHelper !== -1 && lastOwner !== -1) {
      expect(lastOwner).toBeLessThan(firstHelper);
    }
  });
});

describe("the live-command executors (cancel / answer made real)", () => {
  it("cancel-run flips an active run AND hands the ticket back to approved", async () => {
    const ticket = await makeTicket("approved");
    const drafted = await insertDraftBrief({
      ticketId: ticket.id,
      body: "# Brief",
      source: "helper-run",
    });
    if (!drafted.ok) throw new Error("draft failed");
    const dispatched = await dispatchTicket({
      ticketId: ticket.id,
      briefId: drafted.briefId,
      actor: "you",
    });
    if (!dispatched.ok) throw new Error("dispatch failed");

    const cancelled = await executeLiveCommand(
      { type: "cancel-run", runId: dispatched.runId },
      "you",
    );
    expect(cancelled).toEqual({ ok: true });
    const [rrow] = await db.select().from(runs).where(eq(runs.id, dispatched.runId));
    expect(rrow.state).toBe("cancelled");
    const [trow] = await db.select().from(tickets).where(eq(tickets.id, ticket.id));
    expect(trow.state).toBe("approved");
    // cancelling a terminal run is refused
    expect(
      await executeLiveCommand({ type: "cancel-run", runId: dispatched.runId }, "you"),
    ).toEqual({ ok: false, reason: "not-active" });
  });
});

describe("bridgeFromRequest — token auth (ADR-0002 §1)", () => {
  it("resolves the bridge from a Bearer token; rejects everything else", async () => {
    const good = new Request("http://x/api/bridge/sync", {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    const bridge = await bridgeFromRequest(good);
    expect(bridge?.id).toBe(bridgeId);

    const bad = new Request("http://x/api/bridge/sync", {
      headers: { authorization: "Bearer wrong-token" },
    });
    expect(await bridgeFromRequest(bad)).toBeNull();
    expect(await bridgeFromRequest(new Request("http://x/api/bridge/sync"))).toBeNull();
  });
});
