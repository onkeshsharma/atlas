/**
 * M9 — the Bridge↔Atlas protocol, app side (charter §9 "protocol
 * fake-Bridge ↔ fake-Atlas across the typed vocabulary"):
 *
 * - outbox rows → BridgeEvents (the command mapping, ADR-0002 §2)
 * - SSE frame round-trips through the daemon's line grammar
 * - every wire-body parser (claim / transition / stdout / helper-result
 *   / heartbeat), good and malformed
 * - THE CROSS-PACKAGE DELIVERABLE CONTRACT: the fake Engine binary is
 *   spawned for each helper kind and its RESULT payloads must pass the
 *   OWNING app modules' parsers (parseEnrichment, parseIngestSummary) —
 *   daemon drift fails here before it 422s in production.
 *   (The daemon's own end of the vocabulary is exercised in
 *   packages/bridge/tests/daemon.test.ts against FakeAtlas; the e2e on
 *   :3300 closes the loop with the REAL routes.)
 */
import { spawn } from "node:child_process";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { FeedEvent } from "@/src/db/schema";
import { hashBridgeToken } from "@/src/domain/bridge/auth";
import { rowToBridgeEvents } from "@/src/domain/bridge/events";
import {
  bridgeSseFrame,
  parseBridgeClaim,
  parseBridgeEvent,
  parseBridgeHeartbeat,
  parseBridgeHelperResult,
  parseBridgeStdout,
  parseBridgeTransition,
} from "@/src/domain/bridge/protocol";
import { parseRunDiffStats } from "@/src/domain/run/diff-stats";
import { FAILURE_KINDS } from "@/src/domain/run/failure";
import { parseIngestSummary } from "@/src/domain/project/ingest-summary";
import { parseEnrichment } from "@/src/domain/ticket/enrichment";
import { VALID_SUMMARY as BRIDGE_VALID_SUMMARY } from "../packages/bridge/tests/fixtures/ingest-summary";

const RUN_ID = "11111111-2222-4333-8444-555555555555";

function feedRow(overrides: Partial<FeedEvent>): FeedEvent {
  return {
    id: 7,
    kind: "dispatched",
    actor: "you",
    summary: "R-500 — Fixture",
    preview: null,
    projectId: "p1",
    ticketId: "t1",
    runId: RUN_ID,
    ticketRef: "T-500",
    payload: { from: null, to: "queued", lane: "owner" },
    readAt: null,
    seeded: false,
    createdAt: new Date("2026-06-11T12:00:00Z"),
    ...overrides,
  } as FeedEvent;
}

describe("rowToBridgeEvents — the outbox IS the command log (ADR-0002 §2)", () => {
  it("dispatched → run-available with the lane", () => {
    expect(rowToBridgeEvents(feedRow({}))).toEqual([
      { type: "run-available", cursor: 7, runId: RUN_ID, lane: "owner" },
    ]);
    expect(
      rowToBridgeEvents(feedRow({ payload: { from: null, to: "queued", lane: "helper" } })),
    ).toEqual([{ type: "run-available", cursor: 7, runId: RUN_ID, lane: "helper" }]);
  });

  it("cancelled → run-cancelled", () => {
    expect(rowToBridgeEvents(feedRow({ kind: "cancelled" }))).toEqual([
      { type: "run-cancelled", cursor: 7, runId: RUN_ID },
    ]);
  });

  it("answered → run-answered carrying the validated answer payload", () => {
    const answer = { text: "staging", answeredBy: "you", answeredAt: "2026-06-11T12:00:00Z" };
    expect(
      rowToBridgeEvents(
        feedRow({ kind: "answered", payload: { from: "needs-input", to: "running", answer } }),
      ),
    ).toEqual([{ type: "run-answered", cursor: 7, runId: RUN_ID, answer }]);
  });

  it("answered with a malformed answer maps to NOTHING (never a half command)", () => {
    expect(
      rowToBridgeEvents(
        feedRow({ kind: "answered", payload: { answer: { answeredBy: "you" } } }),
      ),
    ).toEqual([]);
  });

  it("ship-requested → run-ship (Session B: the KK CTA's command)", () => {
    expect(
      rowToBridgeEvents(feedRow({ kind: "ship-requested", payload: { shipRequested: true } })),
    ).toEqual([{ type: "run-ship", cursor: 7, runId: RUN_ID }]);
  });

  it("non-command kinds and runless rows map to nothing", () => {
    expect(rowToBridgeEvents(feedRow({ kind: "started" }))).toEqual([]);
    expect(rowToBridgeEvents(feedRow({ kind: "shipped" }))).toEqual([]);
    expect(rowToBridgeEvents(feedRow({ runId: null }))).toEqual([]);
  });
});

describe("SSE frames round-trip the daemon's line grammar", () => {
  it.each(
    [
      { type: "run-available" as const, cursor: 41, runId: RUN_ID, lane: "helper" as const },
      { type: "run-cancelled" as const, cursor: 42, runId: RUN_ID },
      {
        type: "run-answered" as const,
        cursor: 43,
        runId: RUN_ID,
        answer: { choice: "Allow", answeredBy: "you", answeredAt: "2026-06-11T12:00:00Z" },
      },
      { type: "run-ship" as const, cursor: 44, runId: RUN_ID },
    ].map((event) => ({ event })),
  )("$event.type", ({ event }) => {
    const frame = bridgeSseFrame(event);
    // the daemon's sse.ts grammar: id / event / data lines, blank-line flush.
    const lines = frame.split("\n");
    const id = lines.find((l) => l.startsWith("id:"))!.slice(3).trim();
    const data = lines.find((l) => l.startsWith("data:"))!.slice(5).trim();
    expect(Number(id)).toBe(event.cursor);
    expect(parseBridgeEvent(JSON.parse(data))).toEqual(event);
  });

  it("rejects malformed command payloads", () => {
    expect(parseBridgeEvent({ type: "run-available", cursor: 1 })).toBeNull();
    expect(parseBridgeEvent({ type: "run-available", cursor: 1, runId: "x", lane: "fast" })).toBeNull();
    expect(parseBridgeEvent({ type: "run-answered", cursor: 1, runId: "x", answer: {} })).toBeNull();
    expect(parseBridgeEvent({ type: "warp", cursor: 1, runId: "x" })).toBeNull();
  });
});

describe("wire-body parsers", () => {
  it("claim: worktree fields nullable, anything else rejected", () => {
    expect(parseBridgeClaim({ worktreePath: "C:\\wt\\r1", branch: "atlas/run/r1" })).toEqual({
      worktreePath: "C:\\wt\\r1",
      branch: "atlas/run/r1",
    });
    expect(parseBridgeClaim({ worktreePath: null, branch: null })).toEqual({
      worktreePath: null,
      branch: null,
    });
    expect(parseBridgeClaim({ worktreePath: 4, branch: null })).toBeNull();
  });

  it("transition: needs-input demands a valid question", () => {
    expect(
      parseBridgeTransition({
        to: "needs-input",
        question: { kind: "question", prompt: "Which env?", raisedAt: "2026-06-11T12:00:00Z" },
      }),
    ).toMatchObject({ to: "needs-input", question: { prompt: "Which env?" } });
    expect(parseBridgeTransition({ to: "needs-input", question: { prompt: "" } })).toBeNull();
  });

  it("transition: review-ready takes optional diff stats + patch, garbage rejected", () => {
    const diffStats = {
      filesChanged: 1,
      insertions: 2,
      deletions: 0,
      files: [{ path: "a.ts", insertions: 2, deletions: 0 }],
    };
    expect(parseBridgeTransition({ to: "review-ready", diffStats })).toEqual({
      to: "review-ready",
      diffStats,
      diffPatch: null,
    });
    expect(
      parseBridgeTransition({ to: "review-ready", diffStats, diffPatch: "diff --git a/a b/a" }),
    ).toMatchObject({ diffPatch: "diff --git a/a b/a" });
    expect(parseBridgeTransition({ to: "review-ready" })).toEqual({
      to: "review-ready",
      diffStats: null,
      diffPatch: null,
    });
    expect(
      parseBridgeTransition({ to: "review-ready", diffStats: { filesChanged: -1 } }),
    ).toBeNull();
    expect(parseRunDiffStats(diffStats)).toEqual(diffStats);
  });

  it("transition: failed demands a TYPED kind; cancelled only from needs-input", () => {
    for (const kind of FAILURE_KINDS) {
      expect(parseBridgeTransition({ to: "failed", failureKind: kind })).toMatchObject({
        to: "failed",
        failureKind: kind,
        from: "running", // default — engine failures
      });
    }
    expect(parseBridgeTransition({ to: "failed", failureKind: "mystery" })).toBeNull();
    expect(parseBridgeTransition({ to: "cancelled", from: "needs-input" })).toEqual({
      to: "cancelled",
      from: "needs-input",
    });
    expect(parseBridgeTransition({ to: "cancelled", from: "running" })).toBeNull();
  });

  it("transition: ship outcomes — failed from review-ready (with PR ref) and shipped (Session B)", () => {
    expect(
      parseBridgeTransition({
        to: "failed",
        failureKind: "conflict",
        from: "review-ready",
        prUrl: "https://github.com/acme/x/pull/9",
        failureDetail: "conflicting files: a.ts",
      }),
    ).toEqual({
      to: "failed",
      failureKind: "conflict",
      from: "review-ready",
      prUrl: "https://github.com/acme/x/pull/9",
      failureDetail: "conflicting files: a.ts",
    });
    expect(
      parseBridgeTransition({ to: "failed", failureKind: "conflict", from: "queued" }),
    ).toBeNull();
    expect(
      parseBridgeTransition({ to: "shipped", mergeSha: "abc", prUrl: "https://x/pull/1" }),
    ).toEqual({ to: "shipped", mergeSha: "abc", prUrl: "https://x/pull/1" });
    expect(parseBridgeTransition({ to: "shipped" })).toEqual({
      to: "shipped",
      prUrl: null,
      mergeSha: null,
    });
    expect(parseBridgeTransition({ to: "shipped", mergeSha: 7 })).toBeNull();
  });

  it("stdout: positive integer seqs only", () => {
    expect(parseBridgeStdout({ chunks: [{ seq: 1, content: "a" }] })).toEqual({
      chunks: [{ seq: 1, content: "a" }],
    });
    expect(parseBridgeStdout({ chunks: [{ seq: 0, content: "a" }] })).toBeNull();
    expect(parseBridgeStdout({ chunks: [{ seq: 1.5, content: "a" }] })).toBeNull();
    expect(parseBridgeStdout({ chunks: "nope" })).toBeNull();
  });

  it("helper-result + heartbeat bodies", () => {
    expect(parseBridgeHelperResult({ kind: "draft-brief", body: "# Brief" })).toEqual({
      kind: "draft-brief",
      body: "# Brief",
    });
    expect(parseBridgeHelperResult({ kind: "draft-brief" })).toBeNull();
    expect(parseBridgeHelperResult({ kind: "make-coffee" })).toBeNull();
    expect(
      parseBridgeHeartbeat({ version: "2.0.0-m9", engine: "fake", busyRunIds: [] }),
    ).toMatchObject({ engine: "fake" });
    expect(
      parseBridgeHeartbeat({ version: "2.0.0-m9", engine: "warp", busyRunIds: [] }),
    ).toBeNull();
  });
});

describe("token hashing", () => {
  it("sha-256 hex, deterministic, never the plaintext", () => {
    const token = "atlas-bridge-fixture";
    const hash = hashBridgeToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashBridgeToken(token));
    expect(hash).not.toContain("fixture");
  });
});

// ── THE CROSS-PACKAGE DELIVERABLE CONTRACT ──────────────────────────
// spawn the daemon's fake-engine binary (never import it — the daemon
// package stays standalone) and validate its RESULT payloads against
// the app modules that will receive them.

const FAKE_SCRIPT = join(
  __dirname,
  "..",
  "packages",
  "bridge",
  "src",
  "engine",
  "fake-engine-script.ts",
);

async function runFakeHelper(
  helperKind: string,
  ticket: Record<string, unknown> | null,
): Promise<{ result: Record<string, unknown> | null; done: Record<string, unknown> | null }> {
  const task = {
    lane: "helper",
    helperKind,
    runRef: "R-999",
    projectName: "drift-check",
    ticket,
    briefBody: null,
  };
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--no-warnings", FAKE_SCRIPT], {
      env: { ...process.env, ATLAS_FAKE_TASK: JSON.stringify(task) },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (b: Buffer) => (out += b.toString("utf8")));
    child.on("error", reject);
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("fake engine timed out"));
    }, 15_000);
    child.on("exit", () => {
      clearTimeout(timer);
      const find = (tag: string) => {
        const line = out.split("\n").find((l) => l.startsWith(`@@ATLAS:${tag} `));
        return line ? (JSON.parse(line.slice(`@@ATLAS:${tag} `.length)) as Record<string, unknown>) : null;
      };
      resolve({ result: find("RESULT"), done: find("DONE") });
    });
  });
}

const DRIFT_TICKET = {
  ref: "T-999",
  title: "Drift-check ticket",
  body: "A plain story.",
  kind: "bug",
  priority: "soon",
};

describe("fake-engine deliverables pass the OWNING modules' parsers", () => {
  it("enrich-ticket → parseEnrichment accepts it (PRD #17 contract)", async () => {
    const { result, done } = await runFakeHelper("enrich-ticket", DRIFT_TICKET);
    expect(done?.outcome).toBe("review-ready");
    expect(result?.kind).toBe("enrich-ticket");
    const parsed = parseEnrichment(result?.enrichment);
    expect(parsed).not.toBeNull();
    expect(parsed!.kind).toBe("bug");
    expect(parsed!.likelyFiles.length).toBeGreaterThan(0);
  });

  it("draft-brief → non-empty markdown quoting the story verbatim", async () => {
    const { result } = await runFakeHelper("draft-brief", DRIFT_TICKET);
    expect(result?.kind).toBe("draft-brief");
    expect(typeof result?.body).toBe("string");
    expect(result?.body as string).toContain("A plain story.");
  });

  it("ingest-project → parseIngestSummary accepts it (HANDOFF-M7 contract)", async () => {
    const { result } = await runFakeHelper("ingest-project", null);
    expect(result?.kind).toBe("ingest-project");
    expect(parseIngestSummary(result?.summary)).not.toBeNull();
    expect(Array.isArray(result?.suggestedTerms)).toBe(true);
  });

  // ADR-0008 — the bridge's strict isValidIngestSummary is a MIRROR of Atlas's
  // parseIngestSummary (bridge rejects in-turn → Gap-3 retry, no post-hoc 422 /
  // R-723). Guard the mirror: the bridge's canonical "valid" fixture must be
  // Atlas-valid, so the two can't silently disagree on the happy path.
  it("the bridge's VALID_SUMMARY fixture passes Atlas's parseIngestSummary (mirror guard)", () => {
    expect(parseIngestSummary(BRIDGE_VALID_SUMMARY)).not.toBeNull();
  });
});

