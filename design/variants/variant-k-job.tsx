// THROWAWAY — Editorial Job Detail prototype (failed-conflict case).
// Where the Owner deals with Engine output, stdout, diff, and conflict recovery.

import { NAV } from "./mock-data";

const JOB = {
  id: "j-501",
  ticketId: "T-247",
  ticketTitle: "Add CSV export to the ticket list",
  state: "failed" as const,
  failureCode: "CONFLICT" as const,
  startedAt: "12 minutes ago",
  failedAt: "8 minutes ago",
  duration: "4m 12s",
  bridge: "macbook-pro-2024",
  prUrl: "github.com/acme/website/pull/892",
  conflictingFiles: ["app/(shop)/[handle]/page.tsx"],
};

const STDOUT_LINES = [
  "[12:04:01] engine starting · ticket T-247 · brief 1.2kb",
  "[12:04:03] reading CONTEXT.md (1,847 lines)",
  "[12:04:05] reading 12 candidate files",
  "[12:04:18] writing app/(shop)/[handle]/page.tsx — extracting CSV export",
  "[12:05:33] writing src/lib/ticket-export.ts — new module",
  "[12:06:11] writing src/components/TicketExport.tsx — new component",
  "[12:07:42] running pnpm typecheck — passed",
  "[12:07:51] running pnpm lint — passed",
  "[12:08:02] running pnpm test — 142 passing, 0 failing",
  "[12:08:09] running pnpm build — passed",
  "[12:08:13] git commit · git push · opening PR #892",
  "[12:08:18] ⨯ failure: PR is not mergeable",
  "[12:08:18]   conflicting files: app/(shop)/[handle]/page.tsx",
  "[12:08:18]   target: main · base: ab05f49",
];

export function VariantKJob() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          {/* SIDEBAR — P active (we're under a Project) */}
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
            {/* Top: breadcrumb + run id */}
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Projects · acme-website · {JOB.ticketId} · Job {JOB.id}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-rose-700">
                ● run failed · {JOB.failedAt}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
              {/* MAIN COL */}
              <div className="max-w-2xl">
                {/* Hero — failure framing */}
                <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
                  <span className="text-rose-700 font-medium">failed</span>
                  <span className="mx-2 text-stone-300">·</span>
                  <span>conflict with main</span>
                  <span className="mx-2 text-stone-300">·</span>
                  <span>ran on {JOB.bridge}</span>
                </div>
                <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
                  Engine couldn&rsquo;t ship {JOB.ticketId}.
                </h1>
                <p className="mt-4 text-lg text-stone-700 leading-relaxed">
                  The work itself completed cleanly — typecheck, lint, tests, build all
                  passed. The PR couldn&rsquo;t auto-merge because{" "}
                  <span className="font-mono text-sm text-stone-900">
                    {JOB.conflictingFiles[0]}
                  </span>{" "}
                  has diverged on main since the Engine started.
                </p>

                {/* CONFLICT card — featured chrome (matches F's IF DISPATCHED) */}
                <section className="mt-12 rounded-2xl bg-white/70 border border-stone-200/80 p-6">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-rose-700">
                      conflict
                    </span>
                    <span className="font-mono text-xs uppercase tracking-widest text-stone-500">
                      what to do
                    </span>
                  </div>
                  <p className="mt-4 text-base text-stone-700 leading-relaxed">
                    Send the Job back to the Engine with the conflict context — it will
                    rebase against the latest{" "}
                    <span className="font-mono text-sm text-stone-900">main</span> and
                    re-apply its changes. This is usually the right call.
                  </p>
                  <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                    Or rebase the branch manually if you want to inspect the conflict
                    yourself.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-5 py-3 rounded-full inline-flex items-center gap-2 shadow-sm">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Send back to Engine
                      <span className="text-stone-400">↻</span>
                    </button>
                    <button className="font-mono text-xs uppercase tracking-widest text-stone-700 bg-white border border-stone-200 hover:border-stone-300 px-5 py-3 rounded-full">
                      Open PR on GitHub ↗
                    </button>
                  </div>
                </section>

                {/* WHAT ENGINE DID — editorial summary */}
                <section className="mt-16">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    What Engine did
                  </div>
                  <div className="mt-5 space-y-4 text-base text-stone-700 leading-relaxed">
                    <p>
                      The Engine extracted CSV export logic from the long{" "}
                      <span className="font-mono text-sm text-stone-600">page.tsx</span>{" "}
                      into a new module and a focused component, then wired the export
                      button into the existing ticket-list toolbar.
                    </p>
                    <p>
                      Three files were added or modified:{" "}
                      <span className="font-mono text-sm text-stone-600">page.tsx</span>{" "}
                      (export button + handler hook),{" "}
                      <span className="font-mono text-sm text-stone-600">
                        ticket-export.ts
                      </span>{" "}
                      (CSV serialization), and{" "}
                      <span className="font-mono text-sm text-stone-600">
                        TicketExport.tsx
                      </span>{" "}
                      (the button component). All quality gates passed locally.
                    </p>
                  </div>
                </section>

                {/* ENGINE OUTPUT — stdout log (mono, scrollable, masked) */}
                <section className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Engine output
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      stdout · last 14 lines
                    </span>
                  </div>
                  <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4 font-mono text-[11px] text-stone-700 leading-relaxed space-y-0.5 max-h-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {STDOUT_LINES.map((line, i) => {
                      const isErr = line.includes("⨯");
                      const isWarn = line.includes("conflicting");
                      return (
                        <div
                          key={i}
                          className={
                            isErr
                              ? "text-rose-700 font-medium"
                              : isWarn
                              ? "text-amber-700"
                              : ""
                          }
                        >
                          {line}
                        </div>
                      );
                    })}
                  </div>
                  <a className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    full log ↗
                  </a>
                </section>
              </div>

              {/* RIGHT RAIL */}
              <aside className="space-y-14">
                {/* STATE — hero matches F/J pattern */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    State
                  </div>
                  <div className="mt-3 flex items-baseline gap-2.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-50" />
                      <span className="relative inline-block h-2 w-2 rounded-full bg-rose-500" />
                    </span>
                    <span className="relative text-2xl font-bold tracking-tight">
                      Failed
                      <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-rose-500" />
                    </span>
                  </div>

                  {/* State-machine track */}
                  <div className="mt-6 flex items-center gap-1.5">
                    {[
                      { label: "Queued", at: "12m ago", done: true },
                      { label: "Running", at: "12m ago", done: true },
                      { label: "Failed", at: "8m ago", here: true, fail: true },
                    ].map((s, i, arr) => (
                      <div key={s.label} className="flex items-center gap-1.5 flex-1">
                        <div className="relative group">
                          {s.here && (
                            <span className="absolute inset-[-4px] rounded-full bg-rose-400/40 animate-ping" />
                          )}
                          <span
                            className={`relative h-1.5 w-1.5 rounded-full block ${
                              s.here
                                ? "bg-rose-500"
                                : s.done
                                ? "bg-stone-900"
                                : "bg-stone-300"
                            }`}
                          >
                            {s.here && (
                              <span className="absolute inset-[-3px] rounded-full border border-rose-500/50" />
                            )}
                          </span>
                          <span className="absolute left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-stone-50 opacity-0 group-hover:opacity-100 pointer-events-none transition shadow-md z-20">
                            {s.label} · {s.at}
                          </span>
                        </div>
                        {i < arr.length - 1 && (
                          <span
                            className={`h-px flex-1 ${
                              s.done ? "bg-stone-900" : "bg-stone-300"
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-widest text-stone-400">
                    <span>queued</span>
                    <span>running</span>
                    <span className="text-rose-600">failed</span>
                  </div>

                  <div className="mt-5 text-sm text-stone-500 leading-relaxed">
                    Engine completed cleanly. Auto-merge failed.
                  </div>
                </section>

                {/* RUN INFO */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Run info
                  </div>
                  <ul className="mt-5 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Started</span>
                      <span className="font-mono text-stone-900">{JOB.startedAt}</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Failed</span>
                      <span className="font-mono text-stone-900">{JOB.failedAt}</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Duration</span>
                      <span className="font-mono text-stone-900">{JOB.duration}</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Ran on</span>
                      <span className="font-mono text-stone-900">{JOB.bridge}</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">PR</span>
                      <a className="font-mono text-stone-700 hover:text-amber-600 cursor-pointer">
                        #892 ↗
                      </a>
                    </li>
                  </ul>
                </section>

                {/* AI suggestion — what to do */}
                <section>
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    AI suggests
                  </div>
                  <p className="mt-4 text-base text-stone-700 leading-relaxed">
                    Send the Job back. The Engine&rsquo;s work was clean — only the
                    base-branch shifted under it. A rebase-and-replay will likely
                    succeed without your involvement.
                  </p>
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

                {/* Related — what else is happening */}
                <section className="pt-4 border-t border-stone-200/80">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Linked
                  </div>
                  <ul className="mt-4 space-y-3">
                    <li className="group cursor-pointer">
                      <div className="text-sm text-stone-700 group-hover:text-stone-900 leading-snug">
                        {JOB.ticketTitle}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                        {JOB.ticketId} · the Ticket this Job is for
                      </div>
                    </li>
                  </ul>
                </section>
              </aside>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant K · editorial job detail
        </div>
      </div>
    </>
  );
}
