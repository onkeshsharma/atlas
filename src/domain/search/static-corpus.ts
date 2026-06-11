/**
 * M12 — the static search corpora: docs (M14's registry — imported,
 * never duplicated, per charter item 1) and the palette's action/page
 * entries. Pure: no IO; vitest-tabled.
 *
 * Honesty notes:
 * - doc BODIES are ReactNode and don't flatten to text — docs match on
 *   title/index-title/sub/slug/TOC labels (the searchable metadata the
 *   registry actually carries).
 * - every action/page row is a route or flow that exists today; nothing
 *   "soon" (UU's mocked "Mark Ticket #142 as shipped" does not port).
 */
import { ARCHITECTURE_META, DOC_ARTICLES, docHref } from "@/src/content/docs";

import { compareRanked, matchTier } from "./rank";
import type { SearchResult } from "./types";

export function docsCorpus(): SearchResult[] {
  const articles: SearchResult[] = DOC_ARTICLES.map((a) => ({
    type: "doc",
    title: a.indexTitle,
    href: docHref(a.slug),
    meta: `Docs · ${a.section} · ${a.readMin} min read`,
    glyph: "·",
    snippet: a.sub,
  }));
  articles.push({
    type: "doc",
    title: ARCHITECTURE_META.indexTitle,
    href: docHref(ARCHITECTURE_META.slug),
    meta: `Docs · ${ARCHITECTURE_META.section} · ${ARCHITECTURE_META.readMin} min read`,
    glyph: "·",
    snippet: ARCHITECTURE_META.sub,
  });
  return articles;
}

/** extra match-only text per doc (slug + TOC labels — not displayed). */
function docTexts(title: string): string[] {
  const article = DOC_ARTICLES.find((a) => a.indexTitle === title);
  if (!article) return [];
  return [article.title, article.slug, article.sub, ...article.toc.map((t) => t.label)];
}

export function matchDocs(query: string): SearchResult[] {
  return rankStatic(docsCorpus(), query, (r) => [r.title, r.snippet ?? "", ...docTexts(r.title)]);
}

/** the go-to pages — every real authed route with a front door (UU "Pages"). */
export const PAGE_ENTRIES: SearchResult[] = [
  { type: "page", title: "Today.", href: "/today", meta: "the cockpit", glyph: "·" },
  { type: "page", title: "Inbox", href: "/inbox", meta: "what's happened", glyph: "·" },
  { type: "page", title: "Board", href: "/board", meta: "tickets · kanban", glyph: "·" },
  { type: "page", title: "Triage", href: "/triage", meta: "keyboard-first queue", glyph: "·" },
  { type: "page", title: "Projects", href: "/projects", meta: "all projects", glyph: "·" },
  { type: "page", title: "Settings", href: "/settings", meta: "preferences · bridges · tokens", glyph: "·" },
  { type: "page", title: "Search", href: "/search", meta: "full-page search", glyph: "⌕" },
];

/** the always-real actions (dispatch suggestions join from the DB in query.ts). */
export const ACTION_ENTRIES: SearchResult[] = [
  { type: "action", title: "File a Ticket…", href: "/tickets/new", meta: "capture work in seconds", glyph: "+" },
  { type: "action", title: "Pair a Bridge…", href: "/settings/bridges", meta: "guided install + show-once token", glyph: "+" },
];

export function matchPages(query: string): SearchResult[] {
  return rankStatic(PAGE_ENTRIES, query, (r) => [r.title, r.href, r.meta]);
}

export function matchActions(query: string): SearchResult[] {
  return rankStatic(ACTION_ENTRIES, query, (r) => [r.title, r.meta]);
}

/** rank a static corpus — no recency; registry order breaks tier ties. */
function rankStatic(
  corpus: SearchResult[],
  query: string,
  texts: (r: SearchResult) => string[],
): SearchResult[] {
  return corpus
    .flatMap((r) => {
      const tier = matchTier(query, { texts: texts(r) });
      return tier === null ? [] : [{ r, tier }];
    })
    .sort((a, b) => compareRanked({ tier: a.tier }, { tier: b.tier }))
    .map(({ r }) => r);
}
