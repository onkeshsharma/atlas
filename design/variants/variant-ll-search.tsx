// THROWAWAY — Editorial Full-page Search Results.
// Distinct from Y (modal command palette) — this is the full page after
// pressing ⏎ on a query.

import { NAV } from "./mock-data";

const QUERY = "export";

type Result = {
  kind: "ticket" | "project" | "doc" | "context-term";
  title: string;
  snippet?: string;
  meta: string;
  state?: string;
};

const RESULTS: Result[] = [
  {
    kind: "ticket",
    title: "Add JSON export endpoint",
    snippet: "...the export should include: ticket ID, title, current state, reporter, age in days, linked PR URL...",
    meta: "T-249 · acme-website · shipped 2h ago",
    state: "shipped",
  },
  {
    kind: "ticket",
    title: "Add CSV export to the ticket list",
    snippet: "...make export buttons more discoverable; export the current filtered view, not just everything...",
    meta: "T-301 · acme-website · in triage",
    state: "triage",
  },
  {
    kind: "ticket",
    title: "Export buttons UX redesign",
    snippet: "...buttons feel buried — they're in the overflow menu and the icon doesn't read as 'download'...",
    meta: "T-219 · acme-website · shipped 3d ago",
    state: "shipped",
  },
  {
    kind: "context-term",
    title: "Storefront",
    snippet: "The marketing + product-listing pages. Server-rendered with Next.js 15. Sources export-able catalogs.",
    meta: "acme-website · CONTEXT.md · Language section",
  },
  {
    kind: "doc",
    title: "How exporting works",
    snippet: "Every ticket list view supports CSV and JSON export. The export respects whatever filter is currently active...",
    meta: "Docs · API & CLI · 2 min read",
  },
  {
    kind: "project",
    title: "acme-website",
    snippet: "Online ordering for ACME's storefront. Has 2 export-related Tickets and 1 shipped export feature.",
    meta: "13 open Tickets · 4 Collaborators",
  },
];

function kindLabel(k: Result["kind"]): string {
  if (k === "ticket") return "Ticket";
  if (k === "project") return "Project";
  if (k === "doc") return "Doc";
  return "Context term";
}
function stateDot(state?: string): string {
  if (state === "shipped") return "bg-emerald-500";
  if (state === "failed") return "bg-rose-500";
  if (state === "review-ready") return "bg-amber-500";
  if (state === "triage") return "bg-sky-400";
  return "bg-stone-400";
}

export function VariantLLSearch() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          <aside className="w-[56px] shrink-0 sticky top-0 h-screen self-start flex flex-col items-center justify-between py-8 border-r border-stone-200/60 z-10">
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none">a</div>
            </div>
            <nav className="flex flex-col items-center gap-5">
              {NAV.map((n) => (
                <a
                  key={n.key}
                  className="relative h-7 w-7 flex items-center justify-center cursor-pointer transition text-stone-400 hover:text-stone-900"
                >
                  <span className="text-base font-medium">{n.short.charAt(0)}</span>
                </a>
              ))}
            </nav>
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none text-stone-900">o</div>
              <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
          </aside>

          <main className="flex-1 px-16 pt-8 pb-24">
            <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
              Search
            </div>

            {/* Search bar */}
            <div className="mt-8 flex items-baseline gap-4 border-b-2 border-stone-300 pb-4 max-w-3xl focus-within:border-stone-900 transition">
              <span className="font-mono text-stone-400 text-2xl">⌕</span>
              <input
                type="text"
                defaultValue={QUERY}
                className="flex-1 bg-transparent text-3xl tracking-tight text-stone-900 placeholder:text-stone-400 focus:outline-none"
              />
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 whitespace-nowrap">
                {RESULTS.length} matches
              </span>
            </div>

            {/* Filter chips */}
            <div className="mt-6 flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                Filter
              </span>
              <FilterChip label="Everything" active count={RESULTS.length} />
              <FilterChip label="Tickets" count={3} />
              <FilterChip label="Docs" count={1} />
              <FilterChip label="Projects" count={1} />
              <FilterChip label="Context" count={1} />
            </div>

            <div className="mt-12 grid grid-cols-[1fr_320px] gap-16">
              {/* Results list */}
              <div className="max-w-2xl">
                <ol className="divide-y divide-stone-200">
                  {RESULTS.map((r, i) => (
                    <li
                      key={i}
                      className="py-6 grid grid-cols-[60px_1fr_auto] items-baseline gap-6 group cursor-pointer"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                        {kindLabel(r.kind)}
                      </span>
                      <div>
                        <div className="flex items-baseline gap-2.5">
                          {r.state && (
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${stateDot(
                                r.state,
                              )}`}
                            />
                          )}
                          <span className="text-lg font-medium tracking-tight text-stone-900">
                            {highlight(r.title, QUERY)}
                          </span>
                        </div>
                        {r.snippet && (
                          <p className="mt-2 ml-4 text-sm text-stone-600 leading-relaxed italic">
                            ...{highlight(r.snippet, QUERY)}
                          </p>
                        )}
                        <div className="mt-2 ml-4 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          {r.meta}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition whitespace-nowrap">
                        open →
                      </span>
                    </li>
                  ))}
                </ol>

                <p className="mt-16 text-sm italic text-stone-500 leading-relaxed">
                  Atlas searches across Tickets, Projects, your CONTEXT.md
                  glossaries, and the docs — but never inside the code. For
                  that, use grep.
                </p>
              </div>

              {/* RAIL */}
              <aside className="space-y-12">
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Tips
                  </div>
                  <ul className="mt-5 space-y-3 text-sm leading-relaxed">
                    <li className="flex items-baseline gap-2.5">
                      <span className="text-amber-500 mt-1.5 inline-block h-1.5 w-1.5 rounded-full" />
                      <span className="text-stone-700">
                        Use{" "}
                        <span className="font-mono text-xs text-stone-600">T-247</span>{" "}
                        to jump to a specific Ticket
                      </span>
                    </li>
                    <li className="flex items-baseline gap-2.5">
                      <span className="text-amber-500 mt-1.5 inline-block h-1.5 w-1.5 rounded-full" />
                      <span className="text-stone-700">
                        Prefix with{" "}
                        <span className="font-mono text-xs text-stone-600">is:</span>{" "}
                        to filter — e.g.{" "}
                        <span className="font-mono text-xs text-stone-600">is:failed</span>
                      </span>
                    </li>
                    <li className="flex items-baseline gap-2.5">
                      <span className="text-amber-500 mt-1.5 inline-block h-1.5 w-1.5 rounded-full" />
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

                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Recent searches
                  </div>
                  <ul className="mt-5 space-y-3 text-sm">
                    <li className="flex items-baseline justify-between group cursor-pointer">
                      <span className="font-mono text-stone-700 group-hover:text-stone-900">
                        bridge offline
                      </span>
                      <span className="font-mono text-[10px] text-stone-400">
                        yesterday
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between group cursor-pointer">
                      <span className="font-mono text-stone-700 group-hover:text-stone-900">
                        carmen
                      </span>
                      <span className="font-mono text-[10px] text-stone-400">
                        2d ago
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between group cursor-pointer">
                      <span className="font-mono text-stone-700 group-hover:text-stone-900">
                        is:failed
                      </span>
                      <span className="font-mono text-[10px] text-stone-400">
                        1w ago
                      </span>
                    </li>
                  </ul>
                </section>

                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    Search is full-text on Ticket bodies, project metadata,
                    CONTEXT.md, and docs. Indexed in &lt; 10s per change.
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant LL · editorial search
        </div>
      </div>
    </>
  );
}

function FilterChip({ label, active, count }: { label: string; active?: boolean; count?: number }) {
  return (
    <button
      className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition cursor-pointer ${
        active
          ? "bg-stone-900 text-stone-50"
          : "bg-stone-100 hover:bg-stone-200 text-stone-700"
      }`}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest">
        {label}
      </span>
      {count !== undefined && (
        <span
          className={`font-mono text-[10px] ${
            active ? "text-stone-300" : "text-stone-500"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const re = new RegExp(`(${q})`, "ig");
  const parts = text.split(re);
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
