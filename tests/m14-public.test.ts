// M14 — the public tier's real logic (charter item 8: vitest only where
// logic exists): the status page's pure composition tables, and the docs
// registry's honesty invariants (every listed row resolves — no dead
// rows; every body really carries its TOC anchors).
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ARCHITECTURE_META,
  articleBySlug,
  DOC_ARTICLES,
  DOCS_INDEX,
  docHref,
  docMeta,
} from "../src/content/docs";
import { composeStatus, feedAge } from "../src/domain/status/probes";

const NOW = new Date("2026-06-12T12:00:00Z");

describe("status — feedAge", () => {
  it.each([
    [new Date("2026-06-12T11:59:30Z"), "just now"],
    [new Date("2026-06-12T11:57:00Z"), "3m ago"],
    [new Date("2026-06-12T09:00:00Z"), "3h ago"],
    [new Date("2026-06-11T11:00:00Z"), "1 day ago"],
    [new Date("2026-06-07T12:00:00Z"), "5 days ago"],
  ])("%s → %s", (at, expected) => {
    expect(feedAge(at, NOW)).toBe(expected);
  });
});

describe("status — composeStatus", () => {
  it("all green: word is up, real latency rides the signal and the sentence", () => {
    const s = composeStatus(
      { ok: true, latencyMs: 42 },
      { ok: true, lastEventAt: new Date("2026-06-12T11:57:00Z") },
      NOW,
    );
    expect(s.word).toBe("up");
    expect(s.allGreen).toBe(true);
    expect(s.sentence).toContain("42 ms");
    expect(s.sentence).toContain("3m ago");
    expect(s.signals).toHaveLength(3);
    expect(s.signals[1]).toMatchObject({ state: "operational", value: "42 ms" });
    expect(s.signals[2]).toMatchObject({
      state: "operational",
      value: "last event 3m ago",
    });
  });

  it("db unreachable: partly up, honest signal row, no fake values", () => {
    const s = composeStatus({ ok: false, latencyMs: null }, { ok: false, lastEventAt: null }, NOW);
    expect(s.word).toBe("partly up");
    expect(s.allGreen).toBe(false);
    expect(s.signals[1]).toMatchObject({ state: "unreachable", value: "—" });
    expect(s.signals[2]).toMatchObject({ state: "unreachable", value: "—" });
    expect(s.sentence).toContain("probe failed");
  });

  it("an empty feed is operational, not an outage (quiet is normal)", () => {
    const s = composeStatus({ ok: true, latencyMs: 10 }, { ok: true, lastEventAt: null }, NOW);
    expect(s.word).toBe("up");
    expect(s.signals[2]).toMatchObject({ state: "operational", value: "no events yet" });
  });
});

describe("docs registry — honesty invariants", () => {
  it("slugs are unique", () => {
    const slugs = DOC_ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every index row resolves (no dead rows — charter item 3)", () => {
    for (const section of DOCS_INDEX) {
      for (const slug of section.slugs) {
        const meta = docMeta(slug);
        expect(meta, `index row "${slug}" must resolve`).toBeDefined();
        expect(meta!.href).toBe(docHref(slug));
      }
    }
  });

  it("the index lists every written article exactly once (+ architecture)", () => {
    const listed = DOCS_INDEX.flatMap((s) => s.slugs);
    expect(new Set(listed).size).toBe(listed.length);
    for (const article of DOC_ARTICLES) {
      expect(listed).toContain(article.slug);
    }
    expect(listed).toContain(ARCHITECTURE_META.slug);
    expect(listed).toHaveLength(DOC_ARTICLES.length + 1);
  });

  it("related slugs resolve for every article", () => {
    for (const article of DOC_ARTICLES) {
      for (const rel of article.related) {
        expect(docMeta(rel), `${article.slug} → related "${rel}"`).toBeDefined();
      }
    }
  });

  it("every TOC anchor exists in its rendered body", () => {
    for (const article of DOC_ARTICLES) {
      const html = renderToStaticMarkup(createElement(Fragment, null, article.body));
      for (const item of article.toc) {
        expect(html, `${article.slug} body must anchor #${item.id}`).toContain(
          `id="${item.id}"`,
        );
      }
    }
  });

  it("titles carry the editorial period; index titles do not", () => {
    for (const article of DOC_ARTICLES) {
      expect(article.title.endsWith(".")).toBe(true);
      expect(article.indexTitle.endsWith(".")).toBe(false);
    }
  });

  it("articleBySlug round-trips and misses honestly", () => {
    expect(articleBySlug("welcome-to-atlas")?.title).toBe("Welcome to Atlas.");
    expect(articleBySlug("not-a-page")).toBeUndefined();
    // architecture is its own route, never a [slug] article
    expect(articleBySlug("architecture")).toBeUndefined();
  });
});
