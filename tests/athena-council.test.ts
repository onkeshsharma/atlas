/**
 * The Council (ADR-0007 §5) — lens-diverse delegates vote; majority answers,
 * split escalates. LLM injected (per-lens responses), so deterministic.
 */
import { describe, expect, it, vi } from "vitest";

import { COUNCIL_LENSES, runCouncil } from "@/src/domain/athena/council";
import type { AthenaComplete, AthenaContext } from "@/src/domain/athena/types";

const ctx: AthenaContext = { projectName: "p", runRef: "R-1" };

/** a complete that returns a canned verdict per lens (keyed by a substring of the system). */
function byLens(map: Record<string, unknown>, fallback: unknown): AthenaComplete {
  return async ({ system }) => {
    for (const [needle, verdict] of Object.entries(map)) {
      if (system.toUpperCase().includes(needle.toUpperCase())) return JSON.stringify(verdict);
    }
    return JSON.stringify(fallback);
  };
}

describe("runCouncil", () => {
  it("answers on a majority (2 of 3 pick the same option)", async () => {
    const v = await runCouncil({
      ask: { question: "migrate or drop?", options: ["migrate", "drop"] },
      context: ctx,
      size: 3,
      complete: byLens(
        {
          CAUTIOUS: { choice: "migrate", confidence: 0.9, rationale: "safe" },
          "SHIP-IT": { choice: "migrate", confidence: 0.85, rationale: "unblocks" },
          CORRECTNESS: { choice: "drop", confidence: 0.8, rationale: "cleaner" },
        },
        { choice: "drop", confidence: 0.8, rationale: "x" },
      ),
    });
    expect(v).toMatchObject({ answered: true, choice: "migrate", votes: 2, size: 3 });
  });

  it("escalates on a split (no majority)", async () => {
    const v = await runCouncil({
      ask: { question: "a or b?", options: ["a", "b"] },
      context: ctx,
      size: 3,
      complete: byLens(
        {
          CAUTIOUS: { choice: "a", confidence: 0.9, rationale: "x" },
          "SHIP-IT": { choice: "b", confidence: 0.9, rationale: "y" },
          CORRECTNESS: { confidence: 0.2, rationale: "unsure" }, // abstains (low conf, no choice)
        },
        { confidence: 0.2, rationale: "unsure" },
      ),
    });
    expect(v).toMatchObject({ answered: false, reason: "no-consensus", size: 3 });
  });

  it("escalates when all delegates abstain", async () => {
    const v = await runCouncil({
      ask: { question: "x?", options: ["a", "b"] },
      context: ctx,
      size: 3,
      complete: async () => JSON.stringify({ choice: "a", confidence: 0.1, rationale: "unsure" }),
    });
    expect(v).toMatchObject({ answered: false, reason: "all-abstained" });
  });

  it("answers a free-text Ask when a majority were confident (highest confidence wins)", async () => {
    const v = await runCouncil({
      ask: { question: "which index?" },
      context: ctx,
      size: 3,
      complete: byLens(
        {
          CAUTIOUS: { answer: "unique on email", confidence: 0.7, rationale: "a" },
          "SHIP-IT": { answer: "unique on (email, org)", confidence: 0.9, rationale: "b" },
          CORRECTNESS: { confidence: 0.2, rationale: "unsure" },
        },
        { confidence: 0.2, rationale: "x" },
      ),
    });
    expect(v).toMatchObject({ answered: true, text: "unique on (email, org)", votes: 2 });
  });

  it("gives each delegate a DISTINCT lens", async () => {
    const seen: string[] = [];
    const complete: AthenaComplete = async ({ system }) => {
      seen.push(system);
      return JSON.stringify({ choice: "a", confidence: 0.9, rationale: "x" });
    };
    await runCouncil({ ask: { question: "?", options: ["a"] }, context: ctx, size: 3, complete });
    // three calls, three different lens directives
    expect(seen).toHaveLength(3);
    for (const lens of COUNCIL_LENSES.slice(0, 3)) {
      expect(seen.some((s) => s.includes(lens.directive))).toBe(true);
    }
  });

  it("clamps an even size down to odd", async () => {
    const complete = vi.fn(async () => JSON.stringify({ choice: "a", confidence: 0.9, rationale: "x" }));
    const v = await runCouncil({ ask: { question: "?", options: ["a"] }, context: ctx, size: 4, complete });
    expect(v.size).toBe(3); // 4 → 3
  });
});
