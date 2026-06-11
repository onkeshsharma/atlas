/**
 * M8 — Ticket lifecycle: table-driven coverage of EVERY from→to pair
 * (9×9 = 81), incl. illegal ones (charter done-criterion 2), Category
 * derivation for every state, enrichment parsing round-trips, and the
 * Owner-move affordance table.
 */
import { describe, expect, it } from "vitest";

import type { TicketState } from "@/src/db/schema";
import {
  CATEGORIES,
  CATEGORY_COLUMNS,
  categoryStates,
  STATE_CATEGORY,
  ticketCategory,
} from "@/src/domain/ticket/categories";
import {
  confidenceSegments,
  parseEnrichment,
  type TicketEnrichment,
} from "@/src/domain/ticket/enrichment";
import {
  isTicketState,
  OPEN_TICKET_STATES,
  TICKET_DOT_TONE,
  TICKET_STATES,
  TICKET_WORD_CLASS,
  ticketStateLabel,
} from "@/src/domain/ticket/states";
import {
  canTicketTransition,
  isTicketTerminal,
  OWNER_MOVES,
  TERMINAL_TICKET_STATES,
  ticketTransition,
} from "@/src/domain/ticket/transitions";

/**
 * The expected table, restated independently of the implementation —
 * if TICKET_TRANSITIONS drifts, this test argues back.
 */
const EXPECTED_LEGAL: ReadonlySet<string> = new Set(
  [
    // triage — the four I-variant decisions
    ["triage", "approved"],
    ["triage", "backlog"],
    ["triage", "needs-info"],
    ["triage", "declined"],
    // needs-info — reporter answered, or the Owner decides late
    ["needs-info", "triage"],
    ["needs-info", "approved"],
    ["needs-info", "backlog"],
    ["needs-info", "declined"],
    // backlog
    ["backlog", "approved"],
    ["backlog", "declined"],
    // approved
    ["approved", "backlog"],
    ["approved", "in-progress"],
    ["approved", "declined"],
    // in-progress — run outcomes (+ cancelled run returns it)
    ["in-progress", "review-ready"],
    ["in-progress", "failed"],
    ["in-progress", "approved"],
    // review-ready
    ["review-ready", "shipped"],
    ["review-ready", "failed"],
    ["review-ready", "in-progress"],
    // failed — retry paths
    ["failed", "approved"],
    ["failed", "backlog"],
    ["failed", "declined"],
  ].map(([f, t]) => `${f}→${t}`),
);

describe("ticket lifecycle — the full 81-pair table", () => {
  for (const from of TICKET_STATES) {
    for (const to of TICKET_STATES) {
      const legal = EXPECTED_LEGAL.has(`${from}→${to}`);
      it(`${from} → ${to} is ${legal ? "LEGAL" : "ILLEGAL"}`, () => {
        expect(canTicketTransition(from, to)).toBe(legal);
        const result = ticketTransition(from, to);
        expect(result.ok).toBe(legal);
        expect(result.from).toBe(from);
        expect(result.to).toBe(to);
        if (!result.ok) expect(result.reason).toBeTruthy();
      });
    }
  }

  it("self-transitions are all illegal (degenerate case)", () => {
    for (const s of TICKET_STATES) expect(canTicketTransition(s, s)).toBe(false);
  });

  it("terminal states have no exits and say so", () => {
    expect(TERMINAL_TICKET_STATES).toEqual(["shipped", "declined"]);
    for (const s of TERMINAL_TICKET_STATES) {
      expect(isTicketTerminal(s)).toBe(true);
      const result = ticketTransition(s, "triage");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("terminal");
    }
    // failed is Closed-category but NOT terminal — retry is a right.
    expect(isTicketTerminal("failed")).toBe(false);
  });

  it("isTicketState guards the vocabulary", () => {
    for (const s of TICKET_STATES) expect(isTicketState(s)).toBe(true);
    expect(isTicketState("ready-for-agent")).toBe(false); // v1 word — retired
    expect(isTicketState("")).toBe(false);
    expect(isTicketState(7)).toBe(false);
  });
});

describe("Category derivation — five groups, exhaustive", () => {
  it("every state maps to exactly one of the five Categories", () => {
    for (const s of TICKET_STATES) {
      expect(CATEGORIES).toContain(ticketCategory(s));
    }
    expect(Object.keys(STATE_CATEGORY).sort()).toEqual([...TICKET_STATES].sort());
  });

  it("the column contents match CONTEXT.md's two-level model", () => {
    expect(categoryStates("triage")).toEqual(["triage", "needs-info"]);
    expect(categoryStates("backlog")).toEqual(["backlog"]);
    expect(categoryStates("active")).toEqual(["approved", "in-progress"]);
    expect(categoryStates("review")).toEqual(["review-ready"]);
    expect(categoryStates("closed")).toEqual(["shipped", "failed", "declined"]);
  });

  it("the board renders the five columns in lifecycle order (G:52–63)", () => {
    expect(CATEGORY_COLUMNS.map((c) => c.key)).toEqual([...CATEGORIES]);
    // G's verbatim header dots
    expect(CATEGORY_COLUMNS[0].dot).toBe("bg-sky-400");
    expect(CATEGORY_COLUMNS[4].dot).toBe("bg-emerald-400");
  });
});

describe("presentation maps stay exhaustive over the 9-state vocabulary", () => {
  it("dot tone + word class cover every state", () => {
    for (const s of TICKET_STATES) {
      expect(TICKET_DOT_TONE[s]).toBeTruthy();
      expect(TICKET_WORD_CLASS[s]).toBeTruthy();
    }
  });

  it("amber stays scarce — only review-ready takes it (§3.3)", () => {
    const amber = TICKET_STATES.filter((s) => TICKET_DOT_TONE[s] === "amber");
    expect(amber).toEqual(["review-ready"]);
  });

  it("labels read dashes as spaces", () => {
    expect(ticketStateLabel("needs-info")).toBe("needs info");
    expect(ticketStateLabel("review-ready")).toBe("review ready");
  });

  it("open states exclude only the closed-and-settled", () => {
    expect(OPEN_TICKET_STATES).not.toContain("shipped" as TicketState);
    expect(OPEN_TICKET_STATES).not.toContain("declined" as TicketState);
    expect(OPEN_TICKET_STATES).toContain("failed" as TicketState);
  });
});

describe("enrichment payload parsing (strict — malformed reads as pending)", () => {
  const valid: TicketEnrichment = {
    kind: "enhancement",
    severity: "low",
    confidence: "high",
    similarTo: "T-249",
    likelyFiles: ["app/tickets/page.tsx", "src/lib/export.ts"],
    question: "Should export include archived tickets?",
    enrichedAt: "2026-06-11T03:00:00.000Z",
  };

  it("round-trips a valid payload", () => {
    expect(parseEnrichment(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
  });

  it("optional fields may be absent", () => {
    const minimal: Partial<TicketEnrichment> = { ...valid };
    delete minimal.similarTo;
    delete minimal.question;
    expect(parseEnrichment(minimal)).toEqual(minimal);
  });

  it.each([
    ["null", null],
    ["array", []],
    ["string", "enriched"],
    ["bad kind", { ...valid, kind: "feature" }],
    ["bad severity", { ...valid, severity: "urgent" }],
    ["bad confidence", { ...valid, confidence: 5 }],
    ["bad files", { ...valid, likelyFiles: [1, 2] }],
    ["bad date", { ...valid, enrichedAt: "yesterday" }],
    ["bad question", { ...valid, question: 42 }],
  ])("rejects %s as pending (null)", (_name, payload) => {
    expect(parseEnrichment(payload)).toBeNull();
  });

  it("confidence meter fills 1/2/3 segments (I:143–153 renders high as 3-of-5)", () => {
    expect(confidenceSegments("low")).toBe(1);
    expect(confidenceSegments("medium")).toBe(2);
    expect(confidenceSegments("high")).toBe(3);
  });
});

describe("OWNER_MOVES — the detail page's move links never bypass M9", () => {
  it("offers only legal transitions", () => {
    for (const [from, moves] of Object.entries(OWNER_MOVES)) {
      for (const move of moves!) {
        expect(canTicketTransition(from as TicketState, move.to)).toBe(true);
      }
    }
  });

  it("never offers dispatch, ship or run outcomes (M9's verbs)", () => {
    for (const moves of Object.values(OWNER_MOVES)) {
      for (const move of moves!) {
        expect(["in-progress", "shipped", "review-ready", "failed"]).not.toContain(move.to);
      }
    }
  });

  it("terminal + triage + in-flight states offer no bare moves", () => {
    expect(OWNER_MOVES.shipped).toBeUndefined();
    expect(OWNER_MOVES.declined).toBeUndefined();
    expect(OWNER_MOVES.triage).toBeUndefined(); // triage decisions happen in /triage
    expect(OWNER_MOVES["in-progress"]).toBeUndefined(); // a Run owns it
    expect(OWNER_MOVES["review-ready"]).toBeUndefined(); // ship/send-back are M9
  });
});
