/**
 * Athena decision memory (ADR-0007 §7) — the pure retrieval ranker and the
 * prompt injection. DB-free: rankSimilar takes candidates directly.
 */
import { describe, expect, it } from "vitest";

import { buildAthenaPrompt } from "@/src/domain/athena/decide";
import { jaccard, normalizeTokens, rankSimilar } from "@/src/domain/athena/memory";

describe("normalizeTokens", () => {
  it("lowercases, splits on non-alphanumerics, drops stopwords + 1-char tokens", () => {
    const t = normalizeTokens("Should we migrate the DB or drop it?");
    expect(t.has("migrate")).toBe(true);
    expect(t.has("db")).toBe(true);
    expect(t.has("drop")).toBe(true);
    expect(t.has("the")).toBe(false); // stopword
    expect(t.has("we")).toBe(false); // stopword
  });
});

describe("jaccard", () => {
  it("is 1 for identical token sets and 0 for disjoint", () => {
    expect(jaccard(normalizeTokens("migrate the database"), normalizeTokens("migrate database"))).toBe(1);
    expect(jaccard(normalizeTokens("migrate database"), normalizeTokens("rename button"))).toBe(0);
  });
  it("is 0 when both sets are empty (all stopwords)", () => {
    expect(jaccard(normalizeTokens("the a to"), normalizeTokens("of and or"))).toBe(0);
  });
});

describe("rankSimilar", () => {
  const candidates = [
    { question: "Should we migrate the database or drop it?", answer: "migrate", source: "owner" as const },
    { question: "Rename the submit button?", answer: "yes", source: "owner" as const },
    { question: "Migrate the database now?", answer: "drop", source: "athena" as const },
  ];

  it("returns the most lexically similar precedent first", () => {
    const out = rankSimilar("migrate database or drop?", candidates, 3);
    expect(out[0].question).toMatch(/migrate the database or drop/i);
  });

  it("drops zero-overlap candidates", () => {
    const out = rankSimilar("rename the submit button", candidates, 3);
    // only the button precedent overlaps
    expect(out).toHaveLength(1);
    expect(out[0].answer).toBe("yes");
  });

  it("weights an Owner precedent above an equally-similar Athena one", () => {
    // both precedents share the same tokens with the query; Owner must win.
    const tie = [
      { question: "migrate database now", answer: "athena-says", source: "athena" as const },
      { question: "migrate database now", answer: "owner-says", source: "owner" as const },
    ];
    const out = rankSimilar("migrate database now", tie, 2);
    expect(out[0].answer).toBe("owner-says");
  });

  it("respects k", () => {
    const out = rankSimilar("migrate the database or drop it now", candidates, 1);
    expect(out).toHaveLength(1);
  });
});

describe("buildAthenaPrompt — precedent injection", () => {
  it("renders the prior decisions as labelled precedent", () => {
    const { user } = buildAthenaPrompt(
      { question: "Migrate or drop?", options: ["migrate", "drop"] },
      {
        projectName: "p",
        runRef: "R-1",
        priorDecisions: [
          { question: "Drop the table?", answer: "migrate", source: "owner", rationale: "data is precious" },
          { question: "Reset the cache?", answer: "yes", source: "athena" },
        ],
      },
    );
    expect(user).toContain("Similar past decisions");
    expect(user).toContain("[Owner]");
    expect(user).toContain('answered "migrate"');
    expect(user).toContain("data is precious");
    expect(user).toContain("[Athena]");
  });

  it("omits the precedent section when there are none", () => {
    const { user } = buildAthenaPrompt(
      { question: "Migrate or drop?" },
      { projectName: "p", runRef: "R-1" },
    );
    expect(user).not.toContain("Similar past decisions");
  });
});
