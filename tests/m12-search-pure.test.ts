/**
 * M12 — search ranking + static corpora (pure; charter item 1's
 * table-driven vitest). The rank law: exact ref > prefix > substring,
 * then recency; static corpora (docs registry + actions/pages) match
 * honestly and rank by the same tiers.
 */
import { describe, expect, it } from "vitest";

import { DOC_ARTICLES } from "@/src/content/docs";
import {
  compareRanked,
  escapeLike,
  matchTier,
  snippetAround,
  TIER_EXACT_REF,
  TIER_PREFIX,
  TIER_SUBSTRING,
} from "@/src/domain/search/rank";
import {
  ACTION_ENTRIES,
  PAGE_ENTRIES,
  docsCorpus,
  matchActions,
  matchDocs,
  matchPages,
} from "@/src/domain/search/static-corpus";
import { TYPE_LABEL } from "@/src/domain/search/types";

describe("matchTier — the rank law, table-driven", () => {
  const candidate = {
    ref: "T-247",
    texts: ["Add export to CSV", "Owner needs to export the full ticket list"],
  };

  it.each([
    ["t-247", TIER_EXACT_REF, "exact ref, case-insensitive"],
    ["T-247", TIER_EXACT_REF, "exact ref, verbatim"],
    ["T-24", TIER_PREFIX, "ref prefix"],
    ["add exp", TIER_PREFIX, "title prefix"],
    ["export", TIER_SUBSTRING, "substring in title + body"],
    ["full ticket list", TIER_SUBSTRING, "body substring"],
    ["zzz-nothing", null, "no match"],
    ["", null, "empty query"],
    ["   ", null, "whitespace query"],
  ] as Array<[string, ReturnType<typeof matchTier>, string]>)(
    "%s → %s (%s)",
    (q, expected) => {
      expect(matchTier(q, candidate)).toBe(expected);
    },
  );

  it("prefix beats substring even when both hit", () => {
    // "add" prefixes the title AND appears later in the body.
    expect(matchTier("add", candidate)).toBe(TIER_PREFIX);
  });

  it("candidates without a ref never reach the exact-ref tier", () => {
    expect(matchTier("storefront", { texts: ["Storefront"] })).toBe(TIER_PREFIX);
    expect(matchTier("storefront", { ref: null, texts: ["Storefront"] })).toBe(TIER_PREFIX);
  });
});

describe("compareRanked — tier first, recency second", () => {
  it("orders by tier ascending", () => {
    const rows = [
      { tier: TIER_SUBSTRING, at: new Date("2026-06-12") },
      { tier: TIER_EXACT_REF, at: new Date("2020-01-01") },
      { tier: TIER_PREFIX, at: new Date("2026-06-12") },
    ] as const;
    const sorted = [...rows].sort(compareRanked);
    expect(sorted.map((r) => r.tier)).toEqual([TIER_EXACT_REF, TIER_PREFIX, TIER_SUBSTRING]);
  });

  it("within a tier, newer beats older; undated sinks to the tail", () => {
    const sorted = [
      { tier: TIER_PREFIX, at: new Date("2026-06-01"), key: "older" },
      { tier: TIER_PREFIX, at: null, key: "undated" },
      { tier: TIER_PREFIX, at: new Date("2026-06-12"), key: "newer" },
    ].sort(compareRanked);
    expect(sorted.map((r) => r.key)).toEqual(["newer", "older", "undated"]);
  });
});

describe("escapeLike — ILIKE wildcards stay literal", () => {
  it.each([
    ["100%", "100\\%"],
    ["a_b", "a\\_b"],
    ["back\\slash", "back\\\\slash"],
    ["plain", "plain"],
  ])("%s → %s", (raw, escaped) => {
    expect(escapeLike(raw)).toBe(escaped);
  });
});

describe("snippetAround — LL's match fragment", () => {
  const body =
    "Owner needs to export the full ticket list from acme-website as a CSV for sharing with non-Atlas stakeholders during the upcoming launch review. The export should include: ticket ID, title, current state.";

  it("centres the first match and caps the span", () => {
    const s = snippetAround(body, "csv", 60);
    expect(s).toBeDefined();
    expect(s!.toLowerCase()).toContain("csv");
    expect(s!.length).toBeLessThanOrEqual(64); // span + ellipses
    expect(s!.startsWith("…")).toBe(true);
  });

  it("returns undefined when the text doesn't contain the query", () => {
    expect(snippetAround(body, "kanban")).toBeUndefined();
    expect(snippetAround(body, "")).toBeUndefined();
  });

  it("flattens whitespace (multi-paragraph bodies read as one line)", () => {
    expect(snippetAround("a\n\nb  c", "b", 20)).toBe("a b c");
  });
});

describe("docs corpus — M14's registry, imported not duplicated", () => {
  it("carries every registry article + the architecture row, all resolving to real hrefs", () => {
    const corpus = docsCorpus();
    expect(corpus).toHaveLength(DOC_ARTICLES.length + 1);
    for (const doc of corpus) {
      expect(doc.type).toBe("doc");
      expect(doc.href).toMatch(/^\/docs(\/|$)/);
      expect(doc.meta).toMatch(/^Docs · /);
    }
  });

  it("matches on TOC labels (the registry's own anchors), not just titles", () => {
    // "the answer panel" is a TOC label in needs-input-and-steering.
    const article = DOC_ARTICLES.find((a) => a.slug === "needs-input-and-steering")!;
    const tocLabel = article.toc[0].label;
    const hits = matchDocs(tocLabel);
    expect(hits.some((h) => h.href === `/docs/${article.slug}`)).toBe(true);
  });

  it("finds the architecture deep-dive at its own route", () => {
    const hits = matchDocs("architecture");
    expect(hits.some((h) => h.href === "/docs/architecture")).toBe(true);
  });
});

describe("actions + pages — every row is a real route (no 'soon' rows)", () => {
  const REAL_ROUTES = [
    "/today",
    "/inbox",
    "/board",
    "/triage",
    "/projects",
    "/settings",
    "/search",
    "/insights", // M16 — /insights shipped; the registry row is real
    "/tickets/new",
    "/settings/bridges",
  ];

  it("static entries point only at routes that exist", () => {
    for (const entry of [...PAGE_ENTRIES, ...ACTION_ENTRIES]) {
      expect(REAL_ROUTES).toContain(entry.href);
    }
  });

  it("ranks a prefix match above a meta substring", () => {
    const hits = matchPages("se");
    // "Settings" + "Search" prefix-match; nothing else should outrank them.
    expect(hits[0].title === "Settings" || hits[0].title === "Search").toBe(true);
  });

  it("matchActions finds filing by verb", () => {
    expect(matchActions("file").some((a) => a.href === "/tickets/new")).toBe(true);
  });

  it("empty queries match nothing (defaults are the caller's job)", () => {
    expect(matchPages("")).toEqual([]);
    expect(matchActions("")).toEqual([]);
  });
});

describe("type vocabulary — every type has a kind label (LL's kind column)", () => {
  it("covers all seven types", () => {
    expect(Object.keys(TYPE_LABEL).sort()).toEqual(
      ["action", "context-term", "doc", "page", "project", "run", "ticket"].sort(),
    );
  });
});
