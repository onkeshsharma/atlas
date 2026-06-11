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
  latestEngineBriefForTicket,
  saveOwnerBriefDraft,
} from "@/src/domain/dispatch/brief-edit";
import { sendBackToEngine } from "@/src/domain/dispatch/send-back";
import {
  answerRun,
  claimRun,
  completeRun,
  failRun,
  ingestStdoutChunks,
  requestShipRun,
  shipFailRun,
  shipRun,
} from "@/src/domain/run/bridge-writers";
import { applyRunTransition } from "@/src/domain/run/transitions";
import { applyTicketTransition } from "@/src/domain/ticket/mutations";

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

// ── M9 Session B — the ship + send-back + brief-edit writers ─────────

/** dispatch a ticket all the way to a review-ready owner run. */
async function reviewReadyRun(body = "A story."): Promise<{
  ticketId: string;
  ticketRef: string;
  runId: string;
  runRef: string;
  briefId: string;
}> {
  const ticket = await makeTicket("approved", body);
  const drafted = await insertDraftBrief({
    ticketId: ticket.id,
    body: `# Brief\n\n${body}`,
    source: "helper-run",
    actor: "atlas",
  });
  if (!drafted.ok) throw new Error("draft failed");
  const dispatched = await dispatchTicket({
    ticketId: ticket.id,
    briefId: drafted.briefId,
    actor: "you",
  });
  if (!dispatched.ok) throw new Error("dispatch failed");
  await claimRun({
    runId: dispatched.runId,
    bridgeId,
    worktreePath: "C:\\wt\\s",
    branch: "atlas/run/s",
  });
  const done = await completeRun({
    runId: dispatched.runId,
    diffStats: {
      filesChanged: 1,
      insertions: 2,
      deletions: 0,
      files: [{ path: "src/shipped.ts", insertions: 2, deletions: 0 }],
    },
    diffPatch:
      "diff --git a/src/shipped.ts b/src/shipped.ts\nnew file mode 100644\n@@ -0,0 +1,2 @@\n+a\n+b",
  });
  if (!done.ok) throw new Error("complete failed");
  await applyTicketTransition({
    ticketId: ticket.id,
    from: "in-progress",
    to: "review-ready",
    actor: "Engine",
  });
  return {
    ticketId: ticket.id,
    ticketRef: ticket.ref,
    runId: dispatched.runId,
    runRef: dispatched.ref,
    briefId: drafted.briefId,
  };
}

describe("requestShipRun — the durable approve-and-ship click (Session B)", () => {
  it("marks the review-ready run + writes `ship-requested`; double-clicks lose on IS NULL", async () => {
    const fixture = await reviewReadyRun();
    const first = await requestShipRun({ runId: fixture.runId, actor: "you" });
    expect(first.ok).toBe(true);
    const again = await requestShipRun({ runId: fixture.runId, actor: "you" });
    expect(again).toEqual({ ok: false, reason: "not-claimed" });

    const [row] = await db.select().from(runs).where(eq(runs.id, fixture.runId));
    expect(row.shipRequestedAt).not.toBeNull();
    expect(row.state).toBe("review-ready"); // shipping is the daemon's job
    expect(row.diffPatch).toContain("diff --git"); // completeRun stored the patch
    const events = await feedKindsFor({ runId: fixture.runId });
    expect(events.map((e) => e.kind)).toContain("ship-requested");
  });

  it("refuses runs that are not review-ready", async () => {
    const ticket = await makeTicket("approved");
    const enq = await enqueueHelperRun({
      projectId,
      ticketId: ticket.id,
      helperKind: "enrich-ticket",
      title: "not shippable",
      actor: "atlas",
    });
    if (!enq.ok) throw new Error("enqueue failed");
    expect(await requestShipRun({ runId: enq.runId, actor: "you" })).toEqual({
      ok: false,
      reason: "not-claimed",
    });
  });
});

describe("shipRun / shipFailRun — the daemon's outcome posts (Session B)", () => {
  it("shipRun lands refs + `shipped` row; a second post loses the claim", async () => {
    const fixture = await reviewReadyRun();
    await requestShipRun({ runId: fixture.runId, actor: "you" });
    const shipped = await shipRun({
      runId: fixture.runId,
      prUrl: "https://github.com/acme/x/pull/12",
      mergeSha: "a".repeat(40),
    });
    expect(shipped.ok).toBe(true);
    expect(await shipRun({ runId: fixture.runId })).toEqual({
      ok: false,
      reason: "not-claimed",
    });

    const [row] = await db.select().from(runs).where(eq(runs.id, fixture.runId));
    expect(row.state).toBe("shipped");
    expect(row.prUrl).toBe("https://github.com/acme/x/pull/12");
    expect(row.mergeSha).toBe("a".repeat(40));
    const kinds = (await feedKindsFor({ runId: fixture.runId })).map((e) => e.kind);
    expect(kinds).toContain("shipped");
  });

  it("shipFailRun flips review-ready → failed with the typed kind + keeps the PR ref", async () => {
    const fixture = await reviewReadyRun();
    const failed = await shipFailRun({
      runId: fixture.runId,
      failureKind: "conflict",
      failureDetail: "conflicting files: src/shipped.ts",
      prUrl: "https://github.com/acme/x/pull/13",
    });
    expect(failed.ok).toBe(true);
    const [row] = await db.select().from(runs).where(eq(runs.id, fixture.runId));
    expect(row.state).toBe("failed");
    expect(row.failureKind).toBe("conflict");
    expect(row.prUrl).toBe("https://github.com/acme/x/pull/13");
  });
});

describe("sendBackToEngine — PRD #22–23 (Session B)", () => {
  it("CONFLICT path: re-Briefs with the conflict context; ticket failed → approved → in-progress; a NEW run queues", async () => {
    const fixture = await reviewReadyRun("@fake:line replay me");
    await shipFailRun({
      runId: fixture.runId,
      failureKind: "conflict",
      failureDetail: "conflicting files: src/shipped.ts",
    });
    await applyTicketTransition({
      ticketId: fixture.ticketId,
      from: "review-ready",
      to: "failed",
      actor: "Engine",
    });

    const result = await sendBackToEngine({ runId: fixture.runId, actor: "you" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.runRef).not.toBe(fixture.runRef); // a NEW run

    const [trow] = await db.select().from(tickets).where(eq(tickets.id, fixture.ticketId));
    expect(trow.state).toBe("in-progress");
    const brief = await latestBriefForTicket(fixture.ticketId);
    expect(brief?.source).toBe("owner");
    expect(brief?.status).toBe("final"); // dispatch finalized it
    expect(brief?.body).toContain("Conflict context (appended by Atlas)");
    expect(brief?.body).toContain("@fake:line replay me"); // the story survives verbatim
    expect(brief?.body).toContain("src/shipped.ts");
  });

  it("REVIEW decline path: cancels the old run and redispatches review-ready → in-progress", async () => {
    const fixture = await reviewReadyRun();
    const result = await sendBackToEngine({ runId: fixture.runId, actor: "you" });
    expect(result.ok).toBe(true);

    const [oldRun] = await db.select().from(runs).where(eq(runs.id, fixture.runId));
    expect(oldRun.state).toBe("cancelled");
    const [trow] = await db.select().from(tickets).where(eq(tickets.id, fixture.ticketId));
    expect(trow.state).toBe("in-progress");
    const brief = await latestBriefForTicket(fixture.ticketId);
    expect(brief?.body).toContain("Another pass (appended by Atlas)");
  });

  it("refuses runs in unsendable states", async () => {
    const fixture = await reviewReadyRun();
    await shipRun({ runId: fixture.runId, mergeSha: "b".repeat(40) });
    expect(await sendBackToEngine({ runId: fixture.runId, actor: "you" })).toEqual({
      ok: false,
      reason: "not-sendable",
    });
  });
});

describe("saveOwnerBriefDraft — W's autosave write shape (Session B)", () => {
  it("first edit INSERTS the owner draft (one outbox row); autosaves UPDATE in place (no rows)", async () => {
    const ticket = await makeTicket("approved");
    const engine = await insertDraftBrief({
      ticketId: ticket.id,
      body: "# Engine draft",
      source: "helper-run",
      actor: "atlas",
    });
    if (!engine.ok) throw new Error("engine draft failed");

    // first owner edit — continues FROM the engine draft id → inserts
    const first = await saveOwnerBriefDraft({
      ticketId: ticket.id,
      briefId: engine.briefId,
      body: "# Engine draft\n\nplus my edit",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.briefId).not.toBe(engine.briefId);

    const rowsBefore = await feedKindsFor({ ticketId: ticket.id });

    // autosave — updates the owner row, NO new feed rows
    const second = await saveOwnerBriefDraft({
      ticketId: ticket.id,
      briefId: first.briefId,
      body: "# Engine draft\n\nplus my second edit",
    });
    expect(second).toEqual({ ok: true, briefId: first.briefId });
    const rowsAfter = await feedKindsFor({ ticketId: ticket.id });
    expect(rowsAfter.length).toBe(rowsBefore.length);

    const brief = await latestBriefForTicket(ticket.id);
    expect(brief?.id).toBe(first.briefId);
    expect(brief?.body).toContain("second edit");
    // the Engine draft survives untouched (the Diff tab's baseline)
    const engineRow = await latestEngineBriefForTicket(ticket.id);
    expect(engineRow?.id).toBe(engine.briefId);
    expect(engineRow?.body).toBe("# Engine draft");

    expect(
      await saveOwnerBriefDraft({ ticketId: ticket.id, briefId: first.briefId, body: "  " }),
    ).toEqual({ ok: false, reason: "empty-body" });
  });
});
