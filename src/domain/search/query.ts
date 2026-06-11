/**
 * M12 — the ONE search query module (PRD #50–#51, charter item 1): the
 * real corpora behind the Cmd-K palette and /search. Postgres ILIKE
 * candidates (no engine, no embeddings — honest v2.0), ranked by the
 * pure rank law (exact ref > prefix > substring, then recency).
 *
 * Read-only — search never writes (recents are localStorage, charter
 * hard wall: zero migrations).
 */
import { and, count, desc, eq, ilike, inArray, notInArray, or } from "drizzle-orm";

import { db } from "@/src/db/client";
import { contextTerms, projects, runs, tickets } from "@/src/db/schema";
import { ticketStateLabel } from "@/src/domain/ticket/states";

import { compareRanked, escapeLike, matchTier, snippetAround, type MatchTier } from "./rank";
import {
  ACTION_ENTRIES,
  PAGE_ENTRIES,
  matchActions,
  matchDocs,
  matchPages,
} from "./static-corpus";
import type { SearchGroup, SearchResponse, SearchResult, SearchResultType } from "./types";

const GROUP_LABEL: Record<SearchResultType, string> = {
  ticket: "Tickets",
  run: "Runs",
  project: "Projects",
  doc: "Docs",
  "context-term": "Context terms",
  action: "Actions",
  page: "Pages",
};

type RankedResult = { result: SearchResult; tier: MatchTier; at?: Date | null };

function toGroups(ranked: RankedResult[], perType: number): SearchGroup[] {
  const byType = new Map<SearchResultType, RankedResult[]>();
  for (const r of ranked) {
    const list = byType.get(r.result.type) ?? [];
    list.push(r);
    byType.set(r.result.type, list);
  }
  const groups: Array<SearchGroup & { best: MatchTier }> = [];
  for (const [type, list] of byType) {
    list.sort(compareRanked);
    groups.push({
      label: GROUP_LABEL[type],
      type,
      items: list.slice(0, perType).map((r) => r.result),
      best: list[0].tier,
    });
  }
  // groups surface by their best hit (an exact T-ref beats every prose
  // match), stable across equal tiers via the corpora's fetch order.
  groups.sort((a, b) => a.best - b.best);
  return groups.map(({ label, type, items }) => ({ label, type, items }));
}

const FETCH_LIMIT = 20;

async function ticketHits(q: string, like: string): Promise<RankedResult[]> {
  const rows = await db
    .select({ ticket: tickets, projectName: projects.name })
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .where(or(ilike(tickets.ref, like), ilike(tickets.title, like), ilike(tickets.body, like)))
    .orderBy(desc(tickets.updatedAt))
    .limit(FETCH_LIMIT);
  return rows.flatMap(({ ticket: t, projectName }) => {
    const tier = matchTier(q, { ref: t.ref, texts: [t.title, t.body] });
    if (tier === null) return [];
    return [
      {
        tier,
        at: t.updatedAt,
        result: {
          type: "ticket" as const,
          title: t.title,
          href: `/tickets/${t.ref}`,
          meta: `${t.ref} · ${projectName} · ${ticketStateLabel(t.state)}`,
          glyph: "#",
          state: t.state,
          snippet: snippetAround(t.body, q),
        },
      },
    ];
  });
}

async function runHits(q: string, like: string): Promise<RankedResult[]> {
  const rows = await db
    .select({
      run: runs,
      projectName: projects.name,
      ticketRef: tickets.ref,
      ticketTitle: tickets.title,
    })
    .from(runs)
    .innerJoin(projects, eq(runs.projectId, projects.id))
    .leftJoin(tickets, eq(runs.ticketId, tickets.id))
    .where(or(ilike(runs.ref, like), ilike(runs.title, like), ilike(tickets.title, like)))
    .orderBy(desc(runs.updatedAt))
    .limit(FETCH_LIMIT);
  return rows.flatMap(({ run: r, projectName, ticketRef, ticketTitle }) => {
    const tier = matchTier(q, { ref: r.ref, texts: [r.title, ticketTitle ?? ""] });
    if (tier === null) return [];
    return [
      {
        tier,
        at: r.updatedAt,
        result: {
          type: "run" as const,
          title: r.title,
          href: `/runs/${r.ref}`,
          meta: `${r.ref} · ${projectName}${ticketRef ? ` · ${ticketRef}` : ""} · ${r.state.replace(/-/g, " ")}`,
          glyph: "▶",
          state: r.state,
        },
      },
    ];
  });
}

async function projectHits(q: string, like: string): Promise<RankedResult[]> {
  const rows = await db
    .select()
    .from(projects)
    .where(
      or(ilike(projects.name, like), ilike(projects.slug, like), ilike(projects.description, like)),
    )
    .limit(FETCH_LIMIT);
  if (!rows.length) return [];
  const counts = await openCounts(rows.map((p) => p.id));
  return rows.flatMap((p) => {
    const tier = matchTier(q, { texts: [p.name, p.slug, p.description ?? ""] });
    if (tier === null) return [];
    const open = counts.get(p.id) ?? 0;
    return [
      {
        tier,
        at: p.createdAt,
        result: {
          type: "project" as const,
          title: p.name,
          href: `/projects/${p.slug}`,
          meta: `${open} open ticket${open === 1 ? "" : "s"}${p.pinned ? " · pinned" : ""}`,
          glyph: "▦",
          snippet: p.description ?? undefined,
        },
      },
    ];
  });
}

async function openCounts(projectIds: string[]): Promise<Map<string, number>> {
  const rows = await db
    .select({ projectId: tickets.projectId, n: count() })
    .from(tickets)
    .where(
      and(inArray(tickets.projectId, projectIds), notInArray(tickets.state, ["shipped", "declined"])),
    )
    .groupBy(tickets.projectId);
  return new Map(rows.map((r) => [r.projectId, Number(r.n)]));
}

async function contextTermHits(q: string, like: string): Promise<RankedResult[]> {
  const rows = await db
    .select({ term: contextTerms, projectName: projects.name, projectSlug: projects.slug })
    .from(contextTerms)
    .innerJoin(projects, eq(contextTerms.projectId, projects.id))
    .where(or(ilike(contextTerms.term, like), ilike(contextTerms.meaning, like)))
    .orderBy(desc(contextTerms.updatedAt))
    .limit(FETCH_LIMIT);
  return rows.flatMap(({ term: t, projectName, projectSlug }) => {
    const tier = matchTier(q, { texts: [t.term, t.meaning] });
    if (tier === null) return [];
    return [
      {
        tier,
        at: t.updatedAt,
        result: {
          type: "context-term" as const,
          title: t.term,
          href: `/projects/${projectSlug}/context`,
          meta: `${projectName} · Context · ${t.status}${t.avoid ? " · avoid" : ""}`,
          glyph: "·",
          snippet: t.meaning ? snippetAround(t.meaning, q) ?? t.meaning : undefined,
        },
      },
    ];
  });
}

/**
 * UU:19's "Dispatch the next queued Job" made honest: dispatch lives on
 * the Brief composer (W), so the palette's dispatch actions are the real
 * approved Tickets, newest first, routed to /tickets/[ref]/brief.
 */
async function dispatchActions(): Promise<SearchResult[]> {
  const rows = await db
    .select({ ref: tickets.ref, title: tickets.title, projectName: projects.name })
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .where(eq(tickets.state, "approved"))
    .orderBy(desc(tickets.updatedAt))
    .limit(3);
  return rows.map((t) => ({
    type: "action" as const,
    title: `Dispatch ${t.ref} — ${t.title}`,
    href: `/tickets/${t.ref}/brief`,
    meta: `${t.projectName} · approved · opens the Brief`,
    glyph: "→",
  }));
}

export type SearchScope = SearchResultType | "everything";

/**
 * The content corpora (tickets · runs · projects · docs · Context
 * terms) — what /search answers ?q= with (LL). `scope` is the §2.13
 * type-filter chip.
 */
export async function searchContent(
  q: string,
  opts: { perType?: number; scope?: SearchScope } = {},
): Promise<SearchResponse> {
  const query = q.trim();
  const perType = opts.perType ?? FETCH_LIMIT;
  const scope = opts.scope ?? "everything";
  if (!query) return { query, groups: [], total: 0 };

  const like = `%${escapeLike(query)}%`;
  const want = (t: SearchResultType) => scope === "everything" || scope === t;

  const [ticketRows, runRows, projectRows, termRows] = await Promise.all([
    want("ticket") ? ticketHits(query, like) : [],
    want("run") ? runHits(query, like) : [],
    want("project") ? projectHits(query, like) : [],
    want("context-term") ? contextTermHits(query, like) : [],
  ]);
  const docRows: RankedResult[] = want("doc")
    ? matchDocs(query).map((result, i) => ({
        result,
        tier: matchTier(query, {
          texts: [result.title, result.snippet ?? ""],
        }) ?? 2,
        // registry order, encoded so compareRanked keeps it within a tier.
        at: new Date(FETCH_LIMIT - i),
      }))
    : [];

  const groups = toGroups(
    [...ticketRows, ...runRows, ...projectRows, ...docRows, ...termRows],
    perType,
  );
  return {
    query,
    groups,
    total: groups.reduce((n, g) => n + g.items.length, 0),
  };
}

/**
 * What the palette renders (charter item 2): empty query = UU's default
 * sections (Projects · Actions · Pages · Recent Tickets); a typed query
 * = the content corpora PLUS matching actions/pages.
 */
export async function searchPalette(q: string): Promise<SearchResponse> {
  const query = q.trim();
  const PALETTE_PER_TYPE = 5;

  if (!query) {
    const [projectRows, dispatch, recent] = await Promise.all([
      db.select().from(projects).orderBy(desc(projects.pinned), projects.name).limit(5),
      dispatchActions(),
      db
        .select({ ticket: tickets, projectName: projects.name })
        .from(tickets)
        .innerJoin(projects, eq(tickets.projectId, projects.id))
        .orderBy(desc(tickets.updatedAt))
        .limit(4),
    ]);
    const counts = await openCounts(projectRows.map((p) => p.id));
    const allGroups: SearchGroup[] = [
      {
        label: GROUP_LABEL.project,
        type: "project",
        items: projectRows.map((p) => {
          const open = counts.get(p.id) ?? 0;
          return {
            type: "project" as const,
            title: p.name,
            href: `/projects/${p.slug}`,
            meta: `${open} open ticket${open === 1 ? "" : "s"}${p.pinned ? " · pinned" : ""}`,
            glyph: "▦",
          };
        }),
      },
      {
        label: GROUP_LABEL.action,
        type: "action",
        items: [...ACTION_ENTRIES, ...dispatch],
      },
      // UU's default Pages list — the full set reads better than a rank cut.
      { label: GROUP_LABEL.page, type: "page", items: PAGE_ENTRIES },
      {
        label: "Recent Tickets",
        type: "ticket",
        items: recent.map(({ ticket: t, projectName }) => ({
          type: "ticket" as const,
          title: t.title,
          href: `/tickets/${t.ref}`,
          meta: `${t.ref} · ${projectName} · ${ticketStateLabel(t.state)}`,
          glyph: "#",
          state: t.state,
        })),
      },
    ];
    const groups = allGroups.filter((g) => g.items.length > 0);
    return { query, groups, total: groups.reduce((n, g) => n + g.items.length, 0) };
  }

  const [content, dispatch] = await Promise.all([
    searchContent(query, { perType: PALETTE_PER_TYPE }),
    dispatchActions(),
  ]);
  const actionItems = [
    ...matchActions(query),
    ...dispatch.filter(
      (a) => matchTier(query, { texts: [a.title, a.meta] }) !== null,
    ),
  ].slice(0, PALETTE_PER_TYPE);
  const pageItems = matchPages(query).slice(0, PALETTE_PER_TYPE);

  const groups = [...content.groups];
  if (actionItems.length) groups.push({ label: GROUP_LABEL.action, type: "action", items: actionItems });
  if (pageItems.length) groups.push({ label: GROUP_LABEL.page, type: "page", items: pageItems });
  return { query, groups, total: groups.reduce((n, g) => n + g.items.length, 0) };
}
