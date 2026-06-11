/**
 * M12 — /search: full-page search over the real corpora (PRD #51).
 *
 * Ported from design/variants/variant-ll-search.tsx:99–257 (mono kicker,
 * text-3xl borderless query bar LL:105–115, filter row, 60px-kind-column
 * result rows with state dot + highlighted match + italic snippet, 320
 * rail with Tips / Recent searches / provenance footnote). Canon: §3.1
 * dense rail (320 — LL:129 agrees), §2.13 ScopeChips (overruling LL's
 * stone-100 chip fills — see scope-chips.tsx), §2.17 empty states.
 *
 * Canon/honesty over variant (one-liners per §5.4):
 * - row dots come from the domain state maps (§1.1/§3.3; E:539 census) —
 *   LL:65–71's ad-hoc map drew triage sky, but sky = state-social and
 *   triage is stone-soft.
 * - LL:196–199's `is:` prefix tip describes a syntax nobody built — the
 *   tip now names the type chips (the real affordance).
 * - LL:252's "Indexed in <10s per change" overclaims — search is
 *   answered live from the record; the footnote says so.
 * - snippet ellipses render only when the fragment is actually truncated
 *   (LL:156 hardcodes a leading "...").
 * - Tips dots are bg-amber-500 (§2.6 dots are fills) — LL:185's
 *   `text-amber-500` on a backgroundless span renders nothing in the
 *   variant's own render (the E12 class of prototype CSS artifact).
 */
import Link from "next/link";

import { EmptyState, PageHeader } from "@/src/components/kit";
import { DOT_TONE_CLASS, runStateDotTone, type RunState } from "@/src/components/kit/run-state";
import { requireOwner } from "@/src/domain/auth/guard";
import { searchContent, type SearchScope } from "@/src/domain/search/query";
import { TYPE_LABEL, type SearchResult, type SearchResultType } from "@/src/domain/search/types";
import { isTicketState, TICKET_DOT_TONE } from "@/src/domain/ticket/states";
import { RecentSearches } from "@/src/components/search/recent-searches";

import { SearchScopeChips, type ScopeOption } from "./scope-chips";

export const dynamic = "force-dynamic";

const SCOPES: Array<{ scope: SearchScope; label: string }> = [
  { scope: "everything", label: "Everything" },
  { scope: "ticket", label: "Tickets" },
  { scope: "run", label: "Runs" },
  { scope: "project", label: "Projects" },
  { scope: "doc", label: "Docs" },
  { scope: "context-term", label: "Context" },
];

function isScope(v: string | undefined): v is SearchScope {
  return SCOPES.some((s) => s.scope === v);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** LL:293–306 — amber wash on the matched fragment. */
function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const re = new RegExp(`(${escapeRegExp(q)})`, "ig");
  const parts = text.split(re);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <span key={i} className="bg-amber-200/60 text-stone-900 not-italic">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** canon §1.1/§3.3 dots via the domain maps (file-header deviation note). */
function resultDotClass(r: SearchResult): string | null {
  if (r.type === "ticket" && r.state && isTicketState(r.state)) {
    return DOT_TONE_CLASS[TICKET_DOT_TONE[r.state]];
  }
  if (r.type === "run" && r.state) {
    return DOT_TONE_CLASS[runStateDotTone(r.state as RunState)];
  }
  return null;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  await requireOwner();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const scope: SearchScope = isScope(params.type) ? params.type : "everything";

  // one unscoped read answers the chips' counts AND the result list —
  // scope narrows what renders, not what is counted.
  const res = await searchContent(q);
  const groupFor = (t: SearchResultType) => res.groups.find((g) => g.type === t);
  const visibleGroups =
    scope === "everything" ? res.groups : res.groups.filter((g) => g.type === scope);
  const rows = visibleGroups.flatMap((g) => g.items);

  const chipOptions: ScopeOption[] = SCOPES.map(({ scope: s, label }) => ({
    scope: s,
    label,
    count: s === "everything" ? res.total : groupFor(s)?.items.length ?? 0,
  }));

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <PageHeader kind="routed" breadcrumb="Search">
        {/* Search bar (LL:105–115) — borderless text-3xl inside the
            framed border-b-2 row; submits as a real GET. */}
        <form action="/search" method="get">
          <div className="flex items-baseline gap-4 border-b-2 border-stone-300 pb-4 max-w-3xl focus-within:border-stone-900 transition">
            <span className="font-mono text-stone-400 text-2xl">⌕</span>
            <input
              type="text"
              name="q"
              defaultValue={q}
              autoFocus={!q}
              placeholder="Search Tickets, Runs, Projects, docs, Context terms…"
              aria-label="Search Atlas"
              className="flex-1 bg-transparent text-3xl tracking-tight text-stone-900 placeholder:text-stone-400 focus:outline-none"
            />
            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 whitespace-nowrap">
              {q ? `${res.total} match${res.total === 1 ? "" : "es"}` : "⏎ to search"}
            </span>
          </div>
        </form>

        {/* Filter chips (LL:118–127 → §2.13 ScopeChips) */}
        {q && <SearchScopeChips options={chipOptions} active={scope} />}

        <div className="mt-12 grid grid-cols-[1fr_320px] gap-16">
          {/* Results (LL:131–167) */}
          <div className="max-w-2xl">
            {!q ? (
              <EmptyState shape="strip">
                Type a Ticket ref, a Run, a Project, a doc title, or a Context term —
                everything Atlas holds is one query away.
              </EmptyState>
            ) : rows.length === 0 ? (
              <div className="py-6">
                <EmptyState
                  shape="palette"
                  query={q}
                  suggestion={
                    <>
                      Try a Ticket ID (<span className="font-mono">T-247</span>), a Project
                      name, or fewer words.
                      {scope !== "everything" && (
                        <> Or widen the filter back to Everything.</>
                      )}
                    </>
                  }
                />
              </div>
            ) : (
              <ol className="divide-y divide-stone-200">
                {rows.map((r) => {
                  const dot = resultDotClass(r);
                  return (
                    <li key={`${r.type}-${r.href}-${r.title}`}>
                      <Link
                        href={r.href}
                        className="py-6 grid grid-cols-[60px_1fr_auto] items-baseline gap-6 group cursor-pointer"
                      >
                        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          {TYPE_LABEL[r.type]}
                        </span>
                        <span>
                          <span className="flex items-baseline gap-2.5">
                            {dot && (
                              <span
                                className={`inline-block h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${dot}`}
                              />
                            )}
                            <span className="text-lg font-medium tracking-tight text-stone-900">
                              {highlight(r.title, q)}
                            </span>
                          </span>
                          {r.snippet && (
                            <span className={`mt-2 block text-sm text-stone-600 leading-relaxed italic${dot ? " ml-4" : ""}`}>
                              {highlight(r.snippet, q)}
                            </span>
                          )}
                          <span className={`mt-2 block font-mono text-[10px] uppercase tracking-widest text-stone-400${dot ? " ml-4" : ""}`}>
                            {r.meta}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition whitespace-nowrap">
                          open →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* LL:170–174's closing footnote, kept honest. */}
            <p className="mt-16 text-sm italic text-stone-500 leading-relaxed">
              Atlas searches across Tickets, Runs, Projects, your Context terms, and the
              docs — but never inside the code. For that, use grep.
            </p>
          </div>

          {/* RAIL (LL:177–255) — 320 dense per §3.1 */}
          <aside className="space-y-12">
            <section>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Tips
              </div>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed">
                <li className="flex items-baseline gap-2.5">
                  <span className="bg-amber-500 mt-1.5 inline-block h-1.5 w-1.5 rounded-full shrink-0" />
                  <span className="text-stone-700">
                    Use{" "}
                    <span className="font-mono text-xs text-stone-600">T-247</span> to jump
                    to a specific Ticket — exact refs rank first
                  </span>
                </li>
                <li className="flex items-baseline gap-2.5">
                  <span className="bg-amber-500 mt-1.5 inline-block h-1.5 w-1.5 rounded-full shrink-0" />
                  <span className="text-stone-700">
                    {/* honesty: LL drew an `is:` syntax nobody built — the
                        real affordance is the type chips (file header). */}
                    Narrow by type with the filter chips — Tickets, Runs, Docs…
                  </span>
                </li>
                <li className="flex items-baseline gap-2.5">
                  <span className="bg-amber-500 mt-1.5 inline-block h-1.5 w-1.5 rounded-full shrink-0" />
                  <span className="text-stone-700">
                    Open the command palette with{" "}
                    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded font-mono text-[10px] uppercase bg-stone-100 text-stone-700 border border-stone-200">
                      Ctrl
                    </kbd>{" "}
                    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded font-mono text-[10px] uppercase bg-stone-100 text-stone-700 border border-stone-200">
                      K
                    </kbd>{" "}
                    for instant jumps
                  </span>
                </li>
              </ul>
            </section>

            <RecentSearches currentQuery={q} />

            <section className="pt-4 border-t border-stone-200/80">
              <p className="text-sm italic text-stone-500 leading-relaxed">
                Search is full-text over Ticket bodies, Run and Project metadata, Context
                terms, and the docs — answered live from the record, never a stale index.
              </p>
            </section>
          </aside>
        </div>
      </PageHeader>
    </main>
  );
}
