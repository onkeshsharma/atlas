/**
 * M8 — Hints engine: table-driven derivation cases (PRD testing
 * decisions) incl. degenerate inputs and the stubbed-empty file-overlap
 * parameter shape (charter done-criterion 2).
 */
import { describe, expect, it } from "vitest";

import {
  deriveHints,
  type FileSets,
  type HintTicket,
  type HintsInput,
} from "@/src/domain/hints/derive";
import { fileSetsFromEnrichment, toHintTickets } from "@/src/domain/hints/inputs";

const t = (id: string, ref: string, state: HintTicket["state"]): HintTicket => ({
  id,
  ref,
  state,
});

const files = (entries: Array<[string, string[]]>): FileSets => new Map(entries);

const empty: FileSets = new Map();

function derive(partial: Partial<HintsInput>) {
  return deriveHints({ tickets: [], edges: [], fileSets: empty, ...partial });
}

describe("degenerate inputs", () => {
  it("no tickets → no hints, no groups", () => {
    const out = derive({});
    expect(out.hints.size).toBe(0);
    expect(out.shipGroups).toEqual([]);
  });

  it("edges referencing unknown tickets are ignored", () => {
    const out = derive({
      tickets: [t("a", "T-1", "backlog")],
      edges: [
        { blockerId: "ghost", blockedId: "a" },
        { blockerId: "a", blockedId: "ghost" },
      ],
    });
    expect(out.hints.size).toBe(0);
  });

  it("a single review-ready ticket never clusters (a group of one is not a group)", () => {
    const out = derive({
      tickets: [t("a", "T-1", "review-ready")],
      fileSets: files([["a", ["x.ts"]]]),
    });
    expect(out.shipGroups).toEqual([]);
  });

  it("THE STUB SHAPE — empty fileSets makes no soft claims at all", () => {
    const out = derive({
      tickets: [
        t("a", "T-1", "review-ready"),
        t("b", "T-2", "review-ready"),
        t("c", "T-3", "in-progress"),
      ],
      fileSets: empty, // M9 not here yet — the typed parameter, stubbed empty
    });
    expect(out.hints.size).toBe(0);
    expect(out.shipGroups).toEqual([]); // unknown file sets ⇒ no parallel-safe bluffing
  });
});

describe("blocked-by — the hard signal (declared edges, PRD #16)", () => {
  it("an open blocker yields a blocked-by hint on the blocked card", () => {
    const out = derive({
      tickets: [t("blocker", "T-279", "backlog"), t("blocked", "T-280", "backlog")],
      edges: [{ blockerId: "blocker", blockedId: "blocked" }],
    });
    expect(out.hints.get("blocked")).toEqual({ kind: "blocked-by", otherRef: "T-279" });
    expect(out.hints.get("blocker")).toBeUndefined();
  });

  it.each([
    ["shipped", false],
    ["declined", false],
    ["failed", true], // failed didn't land — it still blocks
    ["in-progress", true],
    ["triage", true],
  ] as const)("blocker in %s ⇒ still blocking: %s", (state, blocking) => {
    const out = derive({
      tickets: [t("blocker", "T-1", state), t("blocked", "T-2", "backlog")],
      edges: [{ blockerId: "blocker", blockedId: "blocked" }],
    });
    expect(out.hints.has("blocked")).toBe(blocking);
  });

  it("blocked-by outranks every soft hint on the same card", () => {
    const out = derive({
      tickets: [
        t("blocker", "T-1", "backlog"),
        t("x", "T-2", "approved"),
        t("y", "T-3", "approved"),
      ],
      edges: [{ blockerId: "blocker", blockedId: "y" }],
      // y also overlaps x (soft recommended-after) — hard wins.
      fileSets: files([
        ["x", ["a.ts"]],
        ["y", ["a.ts", "b.ts"]],
      ]),
    });
    expect(out.hints.get("y")).toEqual({ kind: "blocked-by", otherRef: "T-1" });
    // x still gets its own soft hint (it overlaps y).
    expect(out.hints.get("x")).toBeUndefined(); // x is the EARLIER ref — overlap hints point backward only
  });
});

describe("soft hints — file-set knowledge (both sides required)", () => {
  it("known disjoint sets ⇒ parallel-safe-with, both directions", () => {
    const out = derive({
      tickets: [t("a", "T-275", "in-progress"), t("b", "T-247", "review-ready")],
      fileSets: files([
        ["a", ["sidebar.tsx"]],
        ["b", ["export.ts"]],
      ]),
    });
    expect(out.hints.get("a")).toEqual({ kind: "parallel-safe-with", otherRef: "T-247" });
    expect(out.hints.get("b")).toEqual({ kind: "parallel-safe-with", otherRef: "T-275" });
  });

  it("known overlapping sets ⇒ recommended-after on the LATER ref only", () => {
    const out = derive({
      tickets: [t("a", "T-247", "review-ready"), t("b", "T-250", "review-ready")],
      fileSets: files([
        ["a", ["export.ts", "page.tsx"]],
        ["b", ["page.tsx"]],
      ]),
    });
    expect(out.hints.get("b")).toEqual({ kind: "recommended-after", otherRef: "T-247" });
    expect(out.hints.get("a")).toBeUndefined();
  });

  it("one side unknown ⇒ no claim about the pair", () => {
    const out = derive({
      tickets: [t("a", "T-1", "approved"), t("b", "T-2", "approved")],
      fileSets: files([["a", ["x.ts"]]]), // b unknown
    });
    expect(out.hints.size).toBe(0);
  });

  it("soft hints never reach triage/needs-info/closed states", () => {
    const out = derive({
      tickets: [t("a", "T-1", "triage"), t("b", "T-2", "shipped")],
      fileSets: files([
        ["a", ["x.ts"]],
        ["b", ["y.ts"]],
      ]),
    });
    expect(out.hints.size).toBe(0);
  });
});

describe("Ship Groups over the Review column (PRD #26)", () => {
  it("independent: all pairwise known-disjoint ⇒ one parallel-safe cluster", () => {
    const out = derive({
      tickets: [
        t("a", "T-247", "review-ready"),
        t("b", "T-249", "review-ready"),
        t("c", "T-310", "in-progress"), // not review — never clustered
      ],
      fileSets: files([
        ["a", ["export-csv.ts"]],
        ["b", ["export-json.ts"]],
        ["c", ["header.tsx"]],
      ]),
    });
    expect(out.shipGroups).toEqual([{ kind: "independent", ticketIds: ["a", "b"] }]);
  });

  it("sequenced: overlapping review tickets cluster as sequenced, not independent", () => {
    const out = derive({
      tickets: [
        t("a", "T-1", "review-ready"),
        t("b", "T-2", "review-ready"),
        t("d", "T-4", "review-ready"),
      ],
      fileSets: files([
        ["a", ["shared.ts"]],
        ["b", ["shared.ts", "b.ts"]],
        ["d", ["solo.ts"]],
      ]),
    });
    expect(out.shipGroups).toContainEqual({ kind: "sequenced", ticketIds: ["a", "b"] });
    // d alone can't form an independent group of one
    expect(out.shipGroups.find((g) => g.kind === "independent")).toBeUndefined();
  });

  it("blocked: a review ticket with an open blocker is its own group kind", () => {
    const out = derive({
      tickets: [
        t("blocker", "T-1", "in-progress"),
        t("a", "T-2", "review-ready"),
        t("b", "T-3", "review-ready"),
        t("c", "T-4", "review-ready"),
      ],
      edges: [{ blockerId: "blocker", blockedId: "a" }],
      fileSets: files([
        ["b", ["x.ts"]],
        ["c", ["y.ts"]],
      ]),
    });
    expect(out.shipGroups).toContainEqual({ kind: "blocked", ticketIds: ["a"] });
    expect(out.shipGroups).toContainEqual({ kind: "independent", ticketIds: ["b", "c"] });
  });

  it("review tickets with unknown file sets stay ungrouped (no bluffing)", () => {
    const out = derive({
      tickets: [
        t("a", "T-1", "review-ready"),
        t("b", "T-2", "review-ready"),
        t("u", "T-3", "review-ready"), // unknown files
      ],
      fileSets: files([
        ["a", ["x.ts"]],
        ["b", ["y.ts"]],
      ]),
    });
    const independent = out.shipGroups.find((g) => g.kind === "independent");
    expect(independent?.ticketIds).toEqual(["a", "b"]);
  });
});

describe("input adapters", () => {
  it("fileSetsFromEnrichment keeps only parseable enrichment with files", () => {
    const sets = fileSetsFromEnrichment([
      {
        id: "a",
        enrichment: {
          kind: "bug",
          severity: "low",
          confidence: "high",
          likelyFiles: ["x.ts"],
          enrichedAt: "2026-06-11T00:00:00Z",
        },
      },
      { id: "b", enrichment: null }, // pending
      { id: "c", enrichment: { malformed: true } },
      {
        id: "d",
        enrichment: {
          kind: "bug",
          severity: "low",
          confidence: "low",
          likelyFiles: [],
          enrichedAt: "2026-06-11T00:00:00Z",
        },
      }, // empty files = no knowledge
    ]);
    expect([...sets.keys()]).toEqual(["a"]);
  });

  it("toHintTickets projects the minimal shape", () => {
    expect(toHintTickets([{ id: "a", ref: "T-1", state: "triage", extra: 1 } as never])).toEqual([
      { id: "a", ref: "T-1", state: "triage" },
    ]);
  });
});
