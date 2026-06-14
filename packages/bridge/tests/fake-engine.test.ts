/**
 * M9 — the fake Engine (scripted binary) drives every state path
 * (charter §4): default story, ask→answer resume, scripted failure,
 * hang→cancel kill, helper deliverables. Real child processes — the
 * supervisor's spawn/stream/kill plumbing is under test too.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fakeEngineAdapter } from "../src/engine/fake.ts";
import type { EngineStartArgs } from "../src/engine/types.ts";
import type { NeedsInputQuestion, WorkOrder } from "../src/protocol.ts";

let sandbox: string;
const adapter = fakeEngineAdapter();

beforeAll(async () => {
  sandbox = await mkdtemp(join(tmpdir(), "m9-fake-"));
});

afterAll(async () => {
  await rm(sandbox, { recursive: true, force: true }).catch(() => {});
});

function order(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    runId: "00000000-0000-0000-0000-000000000001",
    ref: "R-900",
    title: "Fixture run",
    state: "running",
    lane: "owner",
    helperKind: null,
    queuePosition: 1,
    project: { id: "p1", name: "fixture", slug: "fixture", localPath: null, repoUrl: null },
    ticket: {
      id: "t1",
      ref: "T-900",
      title: "Make the fixture pass",
      body: "Plain story.",
      kind: "bug",
      priority: "soon",
    },
    briefBody: null,
    question: null,
    ...overrides,
  };
}

type Collected = {
  stdout: string[];
  questions: NeedsInputQuestion[];
};

function start(workOrder: WorkOrder, opts: Partial<EngineStartArgs> = {}) {
  const collected: Collected = { stdout: [], questions: [] };
  const session = adapter.start({
    order: workOrder,
    worktree: null,
    sandbox,
    timeoutMs: 20_000,
    onStdout: (text) => collected.stdout.push(text),
    onQuestion: (q) => collected.questions.push(q),
    ...opts,
  });
  return { session, collected };
}

describe("fake engine — owner lane", () => {
  it("default story: streams lines and finishes review-ready", async () => {
    const { session, collected } = start(order());
    const outcome = await session.done;
    expect(outcome).toEqual({ result: "review-ready" });
    expect(collected.stdout.join("")).toContain("engine session start — R-900");
    expect(collected.questions).toHaveLength(0);
  });

  it("@fake:ask blocks on needs-input; the answer resumes the session", async () => {
    const brief = [
      "# Brief",
      '@fake:ask {"kind":"question","prompt":"Inline the bootstrap script?"}',
      "@fake:line resumed after the answer",
    ].join("\n");
    const { session, collected } = start(order({ briefBody: brief }));

    // wait for the question to surface
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("no question raised")), 10_000);
      const check = () => {
        if (collected.questions.length) {
          clearTimeout(t);
          resolve();
        } else setTimeout(check, 50);
      };
      check();
    });
    expect(collected.questions[0].prompt).toBe("Inline the bootstrap script?");

    session.answer({ text: "yes, inline it", answeredBy: "you", answeredAt: new Date().toISOString() });
    const outcome = await session.done;
    expect(outcome).toEqual({ result: "review-ready" });
    expect(collected.stdout.join("")).toContain("answered: yes, inline it");
    expect(collected.stdout.join("")).toContain("resumed after the answer");
  });

  it("@fake:fail produces the typed failure kind", async () => {
    const { session } = start(
      order({ briefBody: "@fake:fail engine-timeout took far too long" }),
    );
    const outcome = await session.done;
    expect(outcome).toEqual({
      result: "failed",
      failureKind: "engine-timeout",
      detail: "took far too long",
    });
  });

  it("an unknown failure kind degrades to engine-crash", async () => {
    const { session } = start(order({ briefBody: "@fake:fail not-a-kind" }));
    const outcome = await session.done;
    expect(outcome.result).toBe("failed");
    if (outcome.result === "failed") expect(outcome.failureKind).toBe("engine-crash");
  });

  it("@fake:hang + cancel() kills the child and resolves cancelled", async () => {
    const { session, collected } = start(order({ briefBody: "@fake:hang" }));
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("never started hanging")), 10_000);
      const check = () => {
        if (collected.stdout.join("").includes("hanging")) {
          clearTimeout(t);
          resolve();
        } else setTimeout(check, 50);
      };
      check();
    });
    session.cancel();
    const outcome = await session.done;
    expect(outcome).toEqual({ result: "cancelled" });
  });

  it("a too-tight wall clock resolves engine-timeout", async () => {
    const { session } = start(order({ briefBody: "@fake:hang" }), { timeoutMs: 1_000 });
    const outcome = await session.done;
    expect(outcome.result).toBe("failed");
    if (outcome.result === "failed") expect(outcome.failureKind).toBe("engine-timeout");
  });
});

describe("fake engine — helper lane", () => {
  it("enrich-ticket emits a complete enrichment deliverable", async () => {
    const { session } = start(
      order({ lane: "helper", helperKind: "enrich-ticket", ref: "R-901" }),
    );
    const outcome = await session.done;
    expect(outcome.result).toBe("helper-complete");
    if (outcome.result !== "helper-complete") return;
    expect(outcome.payload.kind).toBe("enrich-ticket");
    if (outcome.payload.kind !== "enrich-ticket") return;
    const enrichment = outcome.payload.enrichment as Record<string, unknown>;
    expect(enrichment.kind).toBe("bug");
    expect(Array.isArray(enrichment.likelyFiles)).toBe(true);
    expect(typeof enrichment.enrichedAt).toBe("string");
  });

  it("draft-brief quotes the ticket story VERBATIM (directives propagate)", async () => {
    const { session } = start(
      order({
        lane: "helper",
        helperKind: "draft-brief",
        ticket: {
          id: "t2",
          ref: "T-901",
          title: "Scripted ticket",
          body: "Do the thing.\n@fake:ask {\"prompt\":\"which thing?\"}",
          kind: null,
          priority: "whenever",
        },
      }),
    );
    const outcome = await session.done;
    expect(outcome.result).toBe("helper-complete");
    if (outcome.result !== "helper-complete") return;
    if (outcome.payload.kind !== "draft-brief") throw new Error("wrong payload kind");
    expect(outcome.payload.body).toContain("Do the thing.");
    expect(outcome.payload.body).toContain('@fake:ask {"prompt":"which thing?"}');
  });

  it("ingest-project emits a schemaVersion-1 summary + suggested terms", async () => {
    const { session } = start(
      order({ lane: "helper", helperKind: "ingest-project", ticket: null }),
    );
    const outcome = await session.done;
    expect(outcome.result).toBe("helper-complete");
    if (outcome.result !== "helper-complete") return;
    if (outcome.payload.kind !== "ingest-project") throw new Error("wrong payload kind");
    const summary = outcome.payload.summary as Record<string, unknown>;
    expect(summary.schemaVersion).toBe(1);
    expect(outcome.payload.suggestedTerms?.length).toBeGreaterThan(0);
  });
});
