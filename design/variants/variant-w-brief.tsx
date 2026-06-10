// THROWAWAY — Editorial Brief Editor prototype.
// The Owner's pre-dispatch moment: review/edit the auto-drafted Brief
// before sending it to the Engine.

import { NAV } from "./mock-data";

const TICKET = {
  id: "T-301",
  title: "Add CSV export to the ticket list",
  reporter: "ada@acme.io",
};

const BRIEF = `## Goal

Add a CSV export affordance to the ticket-list page so Owners can download
the visible Tickets for sharing with non-Atlas stakeholders.

## Context

Source page: \`app/(authed)/projects/[id]/tickets/page.tsx\`

The existing toolbar already has filter chips and a density toggle. Add
the export action alongside, as a small dropdown that offers \`CSV\` and
\`JSON\` (a sibling implementation is already shipped via #574e9115).

## Behaviour

- Click "Export ▾" → menu with two options
- Choosing CSV produces a UTF-8 file with: ticket ID, title, current state,
  reporter email, age in days, linked PR URL (if shipped)
- The export respects whatever filter is currently active — if the user
  has narrowed to "Bug" tickets, the CSV contains only Bug tickets
- Archived tickets (state=closed for >90 days) are excluded by default;
  include an "Include archived" checkbox above the dropdown

## Out of scope

- XLSX / Excel formats (CSV is enough for v1)
- Per-column inclusion toggles
- Scheduled / recurring exports`;

export function VariantWBrief() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          {/* SIDEBAR — P active */}
          <aside className="w-[56px] shrink-0 sticky top-0 h-screen self-start flex flex-col items-center justify-between py-8 border-r border-stone-200/60 z-10">
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none">a</div>
            </div>
            <nav className="flex flex-col items-center gap-5">
              {NAV.map((n) => {
                const initial = n.short.charAt(0);
                const isActive = n.key === "projects";
                return (
                  <a
                    key={n.key}
                    className={`relative h-7 w-7 flex items-center justify-center cursor-pointer transition group ${
                      isActive ? "text-stone-900" : "text-stone-400 hover:text-stone-900"
                    }`}
                  >
                    <span className={`text-base ${isActive ? "font-semibold" : "font-medium"}`}>
                      {initial}
                    </span>
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-3 bg-amber-500" />
                    )}
                    {n.badge !== undefined && (
                      <span className="absolute -top-1 -right-1 font-mono text-[9px] leading-none text-stone-600 bg-amber-50 px-0.5">
                        {n.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
            <div className="relative group">
              <div className="relative h-6 w-6 flex items-center justify-center cursor-pointer">
                <div className="text-xl font-bold tracking-tighter leading-none text-stone-900 group-hover:text-amber-600 transition">
                  o
                </div>
                <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </aside>

          {/* MAIN */}
          <main className="flex-1 px-16 pt-8 pb-24">
            {/* Top breadcrumb + draft indicator */}
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Projects · acme-website · {TICKET.id} · Brief
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-50" />
                  <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                </span>
                draft · saved 4s ago
              </div>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
              {/* MAIN COL */}
              <div className="max-w-2xl">
                {/* Hero */}
                <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
                  filed by {TICKET.reporter}
                  <span className="mx-2 text-stone-300">·</span>
                  drafted by Engine
                </div>
                <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
                  {TICKET.title}
                </h1>
                <p className="mt-4 text-lg text-stone-700 leading-relaxed">
                  Edit the Brief before dispatching it. The Engine will read it
                  verbatim — so be specific about acceptance criteria and out-of-scope.
                </p>

                {/* Tabs */}
                <div className="mt-12 inline-flex items-center font-mono text-xs uppercase tracking-widest rounded-full border border-stone-200 overflow-hidden">
                  <button className="px-4 py-2.5 bg-stone-900 text-stone-50 inline-flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Edit
                  </button>
                  <button className="px-4 py-2.5 text-stone-500 hover:bg-stone-100">
                    Preview
                  </button>
                  <button className="px-4 py-2.5 text-stone-500 hover:bg-stone-100">
                    Diff from auto-draft
                  </button>
                </div>

                {/* Editor — the brief itself */}
                <div className="mt-7">
                  <textarea
                    rows={28}
                    defaultValue={BRIEF}
                    className="w-full bg-transparent border-t border-stone-200 pt-6 text-base font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition resize-none leading-relaxed"
                  />
                  <div className="mt-3 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    <span>Markdown · 1,247 chars · ~320 tokens</span>
                    <span>autosave on</span>
                  </div>
                </div>

                {/* Dispatch row */}
                <section className="mt-16 pt-10 border-t border-stone-200">
                  <p className="text-base text-stone-700 leading-relaxed">
                    When you dispatch, Atlas sends this Brief to the Engine running
                    on{" "}
                    <span className="font-mono text-sm text-stone-900">
                      macbook-pro-2024
                    </span>
                    . The Engine reads CONTEXT.md, plans, writes the changes, and
                    opens a PR. Estimated quota: ~5 minutes.
                  </p>
                  <div className="mt-8 flex items-center gap-4 flex-wrap">
                    <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-6 py-3.5 rounded-full shadow-sm inline-flex items-center gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Dispatch to Engine
                      <span className="text-stone-400">→</span>
                    </button>
                    <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                      save draft &amp; close ↗
                    </a>
                    <a className="font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-rose-600 cursor-pointer">
                      discard draft
                    </a>
                  </div>
                </section>
              </div>

              {/* RIGHT RAIL */}
              <aside className="space-y-14">
                {/* AI suggestions on the Brief */}
                <section>
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    AI suggests
                  </div>
                  <ul className="mt-5 space-y-5 text-sm leading-relaxed">
                    <li>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-amber-700">
                        consider adding
                      </div>
                      <p className="mt-1.5 text-stone-700">
                        An &ldquo;Acceptance&rdquo; subsection — list the concrete
                        things you want to verify after the Engine ships.
                      </p>
                      <a className="mt-2 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                        insert template →
                      </a>
                    </li>
                    <li className="pt-3 border-t border-stone-200/80">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                        looks good
                      </div>
                      <p className="mt-1.5 text-stone-700">
                        File paths are concrete · scope is bounded · related
                        ticket linked. The Engine should have no trouble.
                      </p>
                    </li>
                  </ul>
                  <div className="mt-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                    <span>Confidence</span>
                    <span className="flex items-center gap-0.5">
                      <span className="inline-block h-3 w-1.5 bg-amber-500" />
                      <span className="inline-block h-3 w-1.5 bg-amber-500" />
                      <span className="inline-block h-3 w-1.5 bg-amber-500" />
                      <span className="inline-block h-3 w-1.5 bg-amber-500" />
                      <span className="inline-block h-3 w-1.5 bg-stone-200" />
                    </span>
                    <span className="text-stone-700">very high</span>
                  </div>
                </section>

                {/* Dispatch preview card — featured */}
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    If dispatched
                  </div>
                  <div className="mt-3 text-sm text-stone-700 leading-relaxed">
                    <span className="font-mono text-stone-900">~5 min</span> of your
                    Claude Code quota. Engine runs on{" "}
                    <span className="font-mono text-stone-900">macbook-pro-2024</span>.
                  </div>
                  <div className="mt-2 text-xs text-stone-500 leading-relaxed">
                    A PR will land at{" "}
                    <span className="font-mono text-stone-600">
                      acme-website/pulls/<span className="text-stone-400">new</span>
                    </span>
                    .
                  </div>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Tokens estimate</span>
                      <span className="font-mono text-stone-900">~320</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Files likely touched</span>
                      <span className="font-mono text-stone-900">3</span>
                    </li>
                  </ul>
                </section>

                {/* Original Ticket */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Source Ticket
                  </div>
                  <div className="mt-4">
                    <a className="group cursor-pointer">
                      <div className="text-base text-stone-700 group-hover:text-stone-900 leading-snug">
                        {TICKET.title}
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                        {TICKET.id} · view original →
                      </div>
                    </a>
                  </div>
                </section>

                {/* History */}
                <section className="pt-4 border-t border-stone-200/80">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Draft history
                  </div>
                  <ul className="mt-4 space-y-2.5 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">v3 — your edits</span>
                      <span className="font-mono text-[10px] text-stone-400">
                        just now
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">v2 — autosave</span>
                      <span className="font-mono text-[10px] text-stone-400">
                        3 min ago
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">v1 — Engine draft</span>
                      <span className="font-mono text-[10px] text-stone-400">
                        5 min ago
                      </span>
                    </li>
                  </ul>
                </section>
              </aside>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant W · editorial brief editor
        </div>
      </div>
    </>
  );
}
