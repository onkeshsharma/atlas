/**
 * Athena — AFK decision delegate, pure unit tests (ADR-0006 §4).
 *
 * The LLM is injected (`complete`), so these are deterministic:
 *  1. buildAthenaPrompt folds in question, options, and context.
 *  2. parseAthenaResponse tolerates fences/prose and rejects junk.
 *  3. decideWithAthena answers when confident, ABSTAINS on low confidence,
 *     off-list choices, unparseable output, and call errors.
 */
import { describe, expect, it, vi } from "vitest";

import {
  ATHENA_MIN_CONFIDENCE,
  buildAthenaPrompt,
  decideWithAthena,
  parseAthenaResponse,
} from "@/src/domain/athena/decide";
import type { AthenaContext } from "@/src/domain/athena/types";

const ctx: AthenaContext = {
  projectName: "acme-web",
  runRef: "R-42",
  ticketTitle: "Migrate users table",
  brief: "Add a unique index on email.",
  diffSummary: "2 files, +40/-3",
  recentTranscript: "…considering whether to backfill…",
};

const reply = (obj: unknown) => vi.fn(async () => JSON.stringify(obj));

describe("buildAthenaPrompt", () => {
  it("includes the question, options, and context", () => {
    const { system, user } = buildAthenaPrompt(
      { question: "migrate or drop?", options: ["migrate", "drop"] },
      ctx,
    );
    expect(system).toMatch(/Athena/);
    expect(user).toContain("migrate or drop?");
    expect(user).toContain('"migrate", "drop"');
    expect(user).toContain("acme-web");
    expect(user).toContain("Migrate users table");
  });
});

describe("parseAthenaResponse", () => {
  it("parses a bare JSON object", () => {
    expect(parseAthenaResponse('{"choice":"migrate","confidence":0.9,"rationale":"safe"}')).toEqual({
      choice: "migrate",
      text: undefined,
      confidence: 0.9,
      rationale: "safe",
    });
  });
  it("tolerates code fences and surrounding prose", () => {
    const raw = 'Here is my call:\n```json\n{"answer":"use a unique index","confidence":0.8,"rationale":"x"}\n```';
    expect(parseAthenaResponse(raw)?.text).toBe("use a unique index");
  });
  it("clamps confidence and rejects junk / no answer", () => {
    expect(parseAthenaResponse('{"choice":"a","confidence":2,"rationale":""}')?.confidence).toBe(1);
    expect(parseAthenaResponse("no json here")).toBeNull();
    expect(parseAthenaResponse('{"confidence":0.9,"rationale":"none"}')).toBeNull(); // neither choice nor answer
    expect(parseAthenaResponse('{"choice":"a"}')).toBeNull(); // missing confidence
  });
});

describe("decideWithAthena", () => {
  it("answers with a high-confidence in-list choice", async () => {
    const v = await decideWithAthena({
      ask: { question: "migrate or drop?", options: ["migrate", "drop"] },
      context: ctx,
      complete: reply({ choice: "migrate", confidence: 0.92, rationale: "reversible + safe" }),
    });
    expect(v).toMatchObject({ answered: true, choice: "migrate", confidence: 0.92 });
  });

  it("answers free-text when no options were offered", async () => {
    const v = await decideWithAthena({
      ask: { question: "what index?" },
      context: ctx,
      complete: reply({ answer: "unique on email", confidence: 0.8, rationale: "matches brief" }),
    });
    expect(v).toMatchObject({ answered: true, text: "unique on email" });
  });

  it("abstains below the confidence threshold (escalates to Owner)", async () => {
    const v = await decideWithAthena({
      ask: { question: "drop the column?", options: ["yes", "no"] },
      context: ctx,
      complete: reply({ choice: "yes", confidence: 0.3, rationale: "irreversible — unsure" }),
    });
    expect(v).toEqual({
      answered: false,
      reason: "low-confidence",
      confidence: 0.3,
      rationale: "irreversible — unsure",
    });
  });

  it("abstains when the chosen option is not on the list", async () => {
    const v = await decideWithAthena({
      ask: { question: "a or b?", options: ["a", "b"] },
      context: ctx,
      complete: reply({ choice: "c", confidence: 0.95, rationale: "invented" }),
    });
    expect(v).toMatchObject({ answered: false, reason: "abstained" });
  });

  it("abstains on unparseable model output", async () => {
    const v = await decideWithAthena({
      ask: { question: "?" },
      context: ctx,
      complete: vi.fn(async () => "I cannot help with that."),
    });
    expect(v).toMatchObject({ answered: false, reason: "unparseable" });
  });

  it("abstains (does not throw) when the LLM call fails", async () => {
    const v = await decideWithAthena({
      ask: { question: "?" },
      context: ctx,
      complete: vi.fn(async () => {
        throw new Error("503");
      }),
    });
    expect(v).toMatchObject({ answered: false, reason: "abstained" });
    expect(v.rationale).toMatch(/503/);
  });

  it("honours a custom minConfidence", async () => {
    const args = {
      ask: { question: "?", options: ["a", "b"] },
      context: ctx,
      complete: reply({ choice: "a", confidence: 0.55, rationale: "lean a" }),
    };
    expect((await decideWithAthena(args)).answered).toBe(false); // default 0.6
    expect((await decideWithAthena({ ...args, minConfidence: 0.5 })).answered).toBe(true);
  });

  it("exports a sane default threshold", () => {
    expect(ATHENA_MIN_CONFIDENCE).toBeGreaterThan(0);
    expect(ATHENA_MIN_CONFIDENCE).toBeLessThan(1);
  });
});
