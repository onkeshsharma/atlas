/**
 * AFK routing orchestrator (ADR-0006 §4) — deps injected, no DB/LLM.
 * Proves: answers as Athena, escalates on abstain, one-shot mark-attempted,
 * and the run-moved / no-pending edge cases.
 */
import { describe, expect, it, vi } from "vitest";

import { resolveRunWithAthena, type AthenaResolveDeps } from "@/src/domain/athena/resolve";
import type { AthenaContext } from "@/src/domain/athena/types";

const ctx: AthenaContext = { projectName: "p", runRef: "R-1" };

function deps(over: Partial<AthenaResolveDeps> = {}): AthenaResolveDeps {
  return {
    loadAsk: vi.fn(async () => ({ ask: { question: "migrate or drop?", options: ["migrate", "drop"] }, context: ctx })),
    complete: vi.fn(async () => JSON.stringify({ choice: "migrate", confidence: 0.9, rationale: "safe" })),
    answer: vi.fn(async () => true),
    markAttempted: vi.fn(async () => {}),
    now: () => "2026-06-15T00:00:00.000Z",
    ...over,
  };
}

describe("resolveRunWithAthena", () => {
  it("answers as Athena when confident, via answerRun, and marks attempted", async () => {
    const d = deps();
    const out = await resolveRunWithAthena("run-1", d);

    expect(d.markAttempted).toHaveBeenCalledWith("run-1");
    expect(d.answer).toHaveBeenCalledWith("run-1", {
      choice: "migrate",
      answeredBy: "Athena",
      answeredAt: "2026-06-15T00:00:00.000Z",
    });
    expect(out).toEqual({ status: "answered", confidence: 0.9 });
  });

  it("escalates (leaves needs-input) when Athena abstains — but still marks attempted", async () => {
    const d = deps({
      complete: vi.fn(async () => JSON.stringify({ choice: "drop", confidence: 0.2, rationale: "irreversible" })),
    });
    const out = await resolveRunWithAthena("run-2", d);

    expect(d.markAttempted).toHaveBeenCalledWith("run-2"); // one-shot, even on abstain
    expect(d.answer).not.toHaveBeenCalled();
    expect(out).toMatchObject({ status: "escalated", reason: "low-confidence" });
  });

  it("skips when there is no pending Ask (run already answered/cancelled)", async () => {
    const d = deps({ loadAsk: vi.fn(async () => null) });
    const out = await resolveRunWithAthena("run-3", d);

    expect(d.markAttempted).not.toHaveBeenCalled();
    expect(out).toEqual({ status: "skipped", reason: "no-pending-ask" });
  });

  it("reports run-moved when answerRun loses the claim", async () => {
    const d = deps({ answer: vi.fn(async () => false) });
    const out = await resolveRunWithAthena("run-4", d);
    expect(out).toEqual({ status: "skipped", reason: "run-moved" });
  });

  it("passes a free-text answer through when there were no options", async () => {
    const d = deps({
      loadAsk: vi.fn(async () => ({ ask: { question: "which index?" }, context: ctx })),
      complete: vi.fn(async () => JSON.stringify({ answer: "unique on email", confidence: 0.85, rationale: "x" })),
    });
    await resolveRunWithAthena("run-5", d);
    expect(d.answer).toHaveBeenCalledWith("run-5", {
      text: "unique on email",
      answeredBy: "Athena",
      answeredAt: "2026-06-15T00:00:00.000Z",
    });
  });
});
