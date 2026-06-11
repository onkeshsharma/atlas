/**
 * M6 — Run state machine: table-driven coverage of EVERY from→to pair
 * (7×7 = 49), incl. illegal ones (charter done-criterion 2), plus the
 * Needs-Input payload round-trip.
 */
import { describe, expect, it } from "vitest";

import {
  parseNeedsInputAnswer,
  parseNeedsInputQuestion,
  type NeedsInputAnswer,
  type NeedsInputQuestion,
} from "@/src/domain/run/needs-input";
import {
  ACTIVE_STATES,
  canTransition,
  isRunState,
  isTerminal,
  RUN_STATES,
  transition,
  type RunState,
} from "@/src/domain/run/states";

/**
 * The expected table, restated independently of the implementation —
 * if LEGAL_TRANSITIONS drifts, this test argues back.
 */
const EXPECTED_LEGAL: ReadonlySet<string> = new Set(
  [
    ["queued", "running"],
    ["queued", "cancelled"],
    ["running", "needs-input"],
    ["running", "review-ready"],
    ["running", "failed"],
    ["running", "cancelled"],
    ["needs-input", "running"],
    ["needs-input", "cancelled"],
    ["review-ready", "shipped"],
    ["review-ready", "failed"],
    ["review-ready", "cancelled"],
  ].map(([f, t]) => `${f}→${t}`),
);

describe("run state machine — the full 49-pair table", () => {
  for (const from of RUN_STATES) {
    for (const to of RUN_STATES) {
      const legal = EXPECTED_LEGAL.has(`${from}→${to}`);
      it(`${from} → ${to} is ${legal ? "LEGAL" : "ILLEGAL"}`, () => {
        expect(canTransition(from as RunState, to as RunState)).toBe(legal);
        const result = transition(from as RunState, to as RunState);
        expect(result.ok).toBe(legal);
        expect(result.from).toBe(from);
        expect(result.to).toBe(to);
        if (!result.ok) {
          expect(result.reason).toBeTruthy();
        }
      });
    }
  }

  it("terminal states are exactly shipped/failed/cancelled", () => {
    for (const s of RUN_STATES) {
      expect(isTerminal(s)).toBe(s === "shipped" || s === "failed" || s === "cancelled");
    }
  });

  it("active states are exactly queued/running/needs-input", () => {
    expect([...ACTIVE_STATES].sort()).toEqual(["needs-input", "queued", "running"]);
  });

  it("isRunState accepts the vocabulary and rejects strangers", () => {
    for (const s of RUN_STATES) expect(isRunState(s)).toBe(true);
    expect(isRunState("job")).toBe(false); // the v1 word is dead (CONTEXT.md)
    expect(isRunState("")).toBe(false);
    expect(isRunState(null)).toBe(false);
    expect(isRunState(42)).toBe(false);
  });
});

describe("needs-input payload round-trip", () => {
  const question: NeedsInputQuestion = {
    kind: "permission",
    prompt: "Include archived (>90d closed) tickets in the export?",
    options: ["Include archived", "Active only"],
    context: "src/export/csv.ts",
    raisedAt: "2026-06-11T04:20:00.000Z",
  };
  const answer: NeedsInputAnswer = {
    choice: "Active only",
    answeredBy: "you",
    answeredAt: "2026-06-11T04:25:00.000Z",
  };

  it("question survives JSON (jsonb) round-trip intact", () => {
    const parsed = parseNeedsInputQuestion(JSON.parse(JSON.stringify(question)));
    expect(parsed).toEqual(question);
  });

  it("answer survives JSON round-trip intact (choice or text)", () => {
    expect(parseNeedsInputAnswer(JSON.parse(JSON.stringify(answer)))).toEqual(answer);
    const textAnswer: NeedsInputAnswer = {
      text: "Inline it, but keep it under 1KB.",
      answeredBy: "you",
      answeredAt: "2026-06-11T05:00:00.000Z",
    };
    expect(parseNeedsInputAnswer(JSON.parse(JSON.stringify(textAnswer)))).toEqual(textAnswer);
  });

  it("malformed questions are rejected, never coerced", () => {
    expect(parseNeedsInputQuestion(null)).toBeNull();
    expect(parseNeedsInputQuestion("ask me")).toBeNull();
    expect(parseNeedsInputQuestion({})).toBeNull();
    expect(parseNeedsInputQuestion({ kind: "shout", prompt: "x", raisedAt: "t" })).toBeNull();
    expect(parseNeedsInputQuestion({ kind: "question", prompt: "", raisedAt: "t" })).toBeNull();
    expect(parseNeedsInputQuestion({ kind: "question", prompt: "x" })).toBeNull();
    expect(
      parseNeedsInputQuestion({ kind: "permission", prompt: "x", raisedAt: "t", options: [1] }),
    ).toBeNull();
  });

  it("malformed answers are rejected — an answer needs text or choice", () => {
    expect(parseNeedsInputAnswer(null)).toBeNull();
    expect(parseNeedsInputAnswer({ answeredBy: "you", answeredAt: "t" })).toBeNull();
    expect(parseNeedsInputAnswer({ text: "ok" })).toBeNull();
    expect(parseNeedsInputAnswer({ text: 7, answeredBy: "you", answeredAt: "t" })).toBeNull();
  });
});
