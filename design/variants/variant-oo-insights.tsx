// THROWAWAY — Editorial Owner Insights prototype.
// The Owner's "how I'm shipping" analytics. Distinctive: bar charts,
// throughput trends, time-to-ship percentiles, per-project breakdown.

import { NAV } from "./mock-data";

const WEEKLY_SHIPS = [3, 5, 2, 4, 7, 5, 8, 6, 9, 4, 8, 12]; // 12 weeks
const WEEKLY_FAILED = [0, 1, 0, 0, 2, 0, 1, 0, 1, 0, 0, 1];

const PROJECTS = [
  { name: "acme-website", shipped: 28, failed: 3, avgHours: 4.2, share: 60 },
  { name: "atlas-internal", shipped: 12, failed: 1, avgHours: 6.8, share: 28 },
  { name: "side-experiment", shipped: 5, failed: 0, avgHours: 3.1, share: 12 },
];

const SLOW_TICKETS = [
  { id: "T-274", title: "Fix bridge offline race", project: "atlas-internal", inState: "active", forWhat: "3 hours" },
  { id: "T-280", title: "Mermaid renders blank on iOS", project: "atlas-internal", inState: "blocked-by T-279", forWhat: "3 days" },
  { id: "T-247", title: "Add CSV export to ticket list", project: "acme-website", inState: "needs-info", forWhat: "2 days" },
];

export function VariantOOInsights() {
  const totalShipped = WEEKLY_SHIPS.reduce((a, b) => a + b, 0);
  const totalFailed = WEEKLY_FAILED.reduce((a, b) => a + b, 0);
  const maxShipped = Math.max(...WEEKLY_SHIPS);

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
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Insights · last 12 weeks
              </div>
              <div className="inline-flex items-center font-mono text-xs uppercase tracking-widest rounded-full border border-stone-200 overflow-hidden">
                <button className="px-3 py-1.5 text-stone-500 hover:bg-stone-100">30d</button>
                <button className="px-3 py-1.5 bg-stone-900 text-stone-50">12w</button>
                <button className="px-3 py-1.5 text-stone-500 hover:bg-stone-100">All</button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
              <div className="max-w-2xl">
                {/* Hero */}
                <h1 className="text-5xl font-bold tracking-tighter">
                  How you&rsquo;re shipping.
                </h1>
                <p className="mt-4 text-2xl leading-tight tracking-tight text-stone-700">
                  <span className="font-mono font-bold tracking-tighter text-stone-900">
                    {totalShipped}
                  </span>{" "}
                  Tickets shipped over 12 weeks ·{" "}
                  <span className="font-mono font-bold tracking-tighter text-rose-600">
                    {totalFailed}
                  </span>{" "}
                  failed ·{" "}
                  <span className="font-mono font-bold tracking-tighter text-amber-600">
                    ~5 hrs
                  </span>{" "}
                  median time-to-ship.
                </p>
                <div className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                    <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <span>ship velocity up</span>
                  <span className="text-stone-400 normal-case tracking-normal font-sans text-xs italic">
                    +24% vs the 12 weeks before
                  </span>
                </div>

                {/* Engine read */}
                <section className="mt-16">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Engine read
                  </div>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    You&rsquo;ve gotten faster over the last three weeks —
                    median time-to-ship dropped from{" "}
                    <span className="font-mono text-stone-900">7.4 hrs</span> to{" "}
                    <span className="font-mono text-stone-900">5.1 hrs</span>.
                    Most of that win is in{" "}
                    <span className="font-mono text-stone-700">acme-website</span>{" "}
                    — the CONTEXT.md you updated three weeks ago made the
                    Engine&rsquo;s drafts more accurate.
                  </p>
                </section>

                {/* THROUGHPUT chart */}
                <section className="mt-20">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Weekly throughput
                    </h2>
                    <span className="font-mono text-xs text-stone-400">
                      12 weeks
                    </span>
                  </div>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    Ships per week. This week (
                    <span className="font-mono text-amber-600 font-semibold">
                      W12
                    </span>
                    ) is your best yet.
                  </p>

                  <div className="mt-8 flex items-end gap-1.5 h-32">
                    {WEEKLY_SHIPS.map((h, i) => {
                      const failed = WEEKLY_FAILED[i] ?? 0;
                      const isThis = i === WEEKLY_SHIPS.length - 1;
                      const total = h + failed;
                      const totalPct = (total / maxShipped) * 100;
                      const failedPct = (failed / total) * 100;
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-2"
                        >
                          <div
                            className="w-full relative rounded-t-sm overflow-hidden"
                            style={{ height: `${Math.max(totalPct, 5)}%` }}
                          >
                            <div
                              className={`absolute inset-0 ${
                                isThis ? "bg-amber-500" : "bg-amber-400/60"
                              }`}
                            />
                            {failed > 0 && (
                              <div
                                className="absolute bottom-0 left-0 right-0 bg-rose-400/80"
                                style={{ height: `${failedPct}%` }}
                              />
                            )}
                          </div>
                          <span
                            className={`font-mono text-[9px] uppercase tracking-widest ${
                              isThis
                                ? "text-amber-600 font-bold"
                                : "text-stone-400"
                            }`}
                          >
                            w{i + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-baseline gap-5 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                    <span className="flex items-baseline gap-2">
                      <span className="inline-block h-2 w-2 rounded-sm bg-amber-500" />
                      shipped
                    </span>
                    <span className="flex items-baseline gap-2">
                      <span className="inline-block h-2 w-2 rounded-sm bg-rose-400/80" />
                      failed
                    </span>
                  </div>
                  <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest italic text-stone-400">
                    Fig. 1 — weekly throughput, stacked
                  </div>
                </section>

                {/* TIME TO SHIP — percentiles */}
                <section className="mt-20">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Time to ship
                    </h2>
                    <span className="font-mono text-xs text-stone-400">
                      from triage to merge
                    </span>
                  </div>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    How long Tickets sit between a Collaborator filing and your
                    PR merging.
                  </p>

                  <div className="mt-8 space-y-5">
                    {[
                      { label: "Fastest 10%", pct: 8, value: "< 30 min" },
                      { label: "Median (P50)", pct: 35, value: "5 hrs" },
                      { label: "Slow tail (P90)", pct: 70, value: "2 days" },
                      { label: "The stragglers (P99)", pct: 95, value: "1 week" },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="text-stone-700">{row.label}</span>
                          <span className="font-mono text-stone-900">
                            {row.value}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1 w-full bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400/70"
                            style={{ width: `${row.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* PER PROJECT */}
                <section className="mt-20">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Per Project
                    </h2>
                    <span className="font-mono text-xs text-stone-400">
                      {PROJECTS.length} active
                    </span>
                  </div>
                  <ol className="divide-y divide-stone-200">
                    {PROJECTS.map((p, i) => (
                      <li
                        key={p.name}
                        className="py-5 grid grid-cols-[40px_1fr_auto] items-baseline gap-6 group cursor-pointer"
                      >
                        <span className="font-mono text-xs text-stone-400">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <div className="flex items-baseline gap-3 text-base">
                            <span className="font-mono font-medium text-stone-900">
                              {p.name}
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                              {p.share}% of all ships
                            </span>
                          </div>
                          <div className="mt-1 font-mono text-xs text-stone-500">
                            <span className="text-emerald-700">
                              {p.shipped} shipped
                            </span>
                            <span className="mx-1.5 text-stone-300">·</span>
                            <span className="text-rose-700">
                              {p.failed} failed
                            </span>
                            <span className="mx-1.5 text-stone-300">·</span>
                            <span className="text-stone-700">
                              avg ~{p.avgHours} hrs
                            </span>
                          </div>
                          <div className="mt-3 h-1 w-full bg-stone-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-500"
                              style={{ width: `${p.share}%` }}
                            />
                          </div>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                          open →
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>

                {/* STRAGGLERS */}
                <section className="mt-20">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Stragglers
                    </h2>
                    <span className="font-mono text-xs text-stone-400">
                      sitting longer than typical
                    </span>
                  </div>
                  <ol className="divide-y divide-stone-200">
                    {SLOW_TICKETS.map((t, i) => (
                      <li
                        key={t.id}
                        className="py-5 grid grid-cols-[40px_1fr_auto] items-baseline gap-6 group cursor-pointer"
                      >
                        <span className="font-mono text-xs text-stone-400">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <div className="text-base font-medium text-stone-900">
                            {t.title}
                          </div>
                          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                            {t.id} · {t.project} · in{" "}
                            <span className="text-amber-700">{t.inState}</span>{" "}
                            for{" "}
                            <span className="text-rose-700">{t.forWhat}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                          open →
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>

              {/* RAIL */}
              <aside className="space-y-14">
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Velocity
                  </div>
                  <div className="mt-3">
                    <span className="relative text-2xl font-bold tracking-tight">
                      +24%
                      <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                    Faster than the 12 weeks before. Most of that is{" "}
                    <span className="font-mono text-stone-700">
                      acme-website
                    </span>
                    .
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Median ship time</span>
                      <span className="font-mono text-stone-900">5 hrs</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Engine quota used</span>
                      <span className="font-mono text-stone-900">42 / 100 hrs</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Failure rate</span>
                      <span className="font-mono text-emerald-700">8.5%</span>
                    </li>
                  </ul>
                </section>

                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Engine suggests
                  </div>
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                    Your slowest Project is{" "}
                    <span className="font-mono text-stone-900">
                      atlas-internal
                    </span>{" "}
                    — its CONTEXT.md hasn&rsquo;t been touched in 2 months. A
                    refresh would probably help.
                  </p>
                  <button className="mt-5 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3 rounded-full shadow-sm">
                    Open atlas-internal CONTEXT →
                  </button>
                </section>

                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Export
                  </div>
                  <ul className="mt-5 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between group cursor-pointer">
                      <span className="text-stone-700 group-hover:text-stone-900">
                        Insights as CSV
                      </span>
                      <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                        ↗
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between group cursor-pointer">
                      <span className="text-stone-700 group-hover:text-stone-900">
                        Charts as PNG
                      </span>
                      <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                        ↗
                      </span>
                    </li>
                  </ul>
                </section>

                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    These are Owner-only — Collaborators don&rsquo;t see velocity
                    or per-project stats.
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant OO · editorial insights
        </div>
      </div>
    </>
  );
}
