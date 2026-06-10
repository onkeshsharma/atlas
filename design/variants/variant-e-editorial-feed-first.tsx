// THROWAWAY — feed-first dashboard spike in the Editorial register.
// Same sidebar as variant D (collapsed initials). Dashboard content drops
// the project list — projects move to a hypothetical /projects route.
// Only PINNED projects surface here, as a single divided-row strip below
// the hero sentence. If Owner has 0 pinned, the strip vanishes entirely.

import { MOCK_FEED, MOCK_PROJECTS, MOCK_SIGNALS, NAV } from "./mock-data";

const PINNED = MOCK_PROJECTS.filter((p) => p.pinned);

// Bridge status — toggle to preview the other dot states.
type BridgeStatus = "healthy" | "unhealthy" | "offline";
const BRIDGE_STATUS: BridgeStatus = "healthy";

function bridgeDotColour(s: BridgeStatus): string {
  if (s === "healthy") return "bg-emerald-500";
  if (s === "unhealthy") return "bg-amber-500";
  return "bg-rose-500";
}
function bridgeStatusLabel(s: BridgeStatus): string {
  if (s === "healthy") return "Bridge · online · healthy";
  if (s === "unhealthy") return "Bridge · online · unhealthy";
  return "Bridge · offline";
}

export function VariantEEditorialFeedFirst() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
      <div className="flex min-h-screen">
        {/* COLLAPSED rail — three zones: brand top · nav middle · user bottom.
            Sticky + h-screen so it stays visible during any outer page scroll. */}
        <aside className="w-[56px] shrink-0 sticky top-0 h-screen self-start flex flex-col items-center justify-between py-8 border-r border-stone-200/60 z-10">
          {/* Brand mark — pure typographic letter (Bridge status lives on `o` below). */}
          <div className="relative h-6 w-6 flex items-center justify-center">
            <div className="text-xl font-bold tracking-tighter leading-none">a</div>
          </div>

          <nav className="flex flex-col items-center gap-5">
            {NAV.map((n) => {
              const initial = n.short.charAt(0);
              return (
                <a
                  key={n.key}
                  title={`${n.label}${n.badge !== undefined ? ` · ${n.badge}` : ""}`}
                  className={`relative h-7 w-7 flex items-center justify-center cursor-pointer transition group ${
                    n.active ? "text-stone-900" : "text-stone-400 hover:text-stone-900"
                  }`}
                >
                  <span className={`text-base ${n.active ? "font-semibold" : "font-medium"}`}>
                    {initial}
                  </span>
                  {n.active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-3 bg-amber-500" />
                  )}
                  {n.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 font-mono text-[9px] leading-none text-stone-600 bg-amber-50 px-0.5">
                      {n.badge}
                    </span>
                  )}
                  <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-stone-50 opacity-0 group-hover:opacity-100 pointer-events-none transition shadow-md">
                    {n.label}
                    {n.badge !== undefined && <span className="text-stone-400"> · {n.badge}</span>}
                  </span>
                </a>
              );
            })}
          </nav>

          {/* User mark — mirrors brand `a` typographically; status dot
              carries Bridge health (green=healthy, amber=unhealthy,
              rose=offline). Hover for email + Bridge details + sign-out. */}
          <div className="relative group">
            <div className="relative h-6 w-6 flex items-center justify-center cursor-pointer">
              <div className="text-xl font-bold tracking-tighter leading-none text-stone-900 group-hover:text-amber-600 transition">
                o
              </div>
              <span
                className={`absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full ${bridgeDotColour(
                  BRIDGE_STATUS,
                )}`}
              />
            </div>
            <div className="absolute left-full bottom-0 ml-3 w-60 bg-white rounded-2xl shadow-lg border border-stone-200 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none group-hover:pointer-events-auto transition z-30">
              <div className="text-sm text-stone-900 break-all leading-tight">
                onkesh19@yahoo.co.in
              </div>
              <hr className="my-4 border-stone-200" />
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${bridgeDotColour(
                    BRIDGE_STATUS,
                  )}`}
                />
                {bridgeStatusLabel(BRIDGE_STATUS)}
              </div>
              <div className="mt-1 font-mono text-[10px] text-stone-400">
                macbook-pro-2024
              </div>
              <hr className="my-4 border-stone-200" />
              <a className="block font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                Sign out →
              </a>
            </div>
          </div>
        </aside>

        {/* Main — two-column grid from the top.
            THIS WEEK's hero sits inline with the day-stamp, mirroring F's
            State-at-top layout. */}
        <main className="flex-1 px-16 pt-12 pb-24">
          <div className="grid grid-cols-[1fr_360px] gap-16">
          {/* MAIN COL */}
          <div className="max-w-2xl">
          <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
            Tuesday · May 13
          </div>
          <h1 className="mt-2 text-5xl font-bold tracking-tighter">Today.</h1>

          {/* HERO sentence */}
          <p className="mt-12 text-3xl leading-tight tracking-tight text-stone-700">
            <span className="font-mono font-bold tracking-tighter text-stone-900">
              {MOCK_SIGNALS.triage}
            </span>{" "}
            tickets need your triage.{" "}
            <span className="font-mono font-bold tracking-tighter text-amber-600">
              {MOCK_SIGNALS.shipReady}
            </span>{" "}
            are ready to ship.
            {MOCK_SIGNALS.failed > 0 && (
              <>
                {" "}
                <span className="font-mono font-bold tracking-tighter text-rose-600">
                  {MOCK_SIGNALS.failed}
                </span>{" "}
                failed.
              </>
            )}
          </p>

          {/* Live presence — collaborators active today */}
          <div className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
              <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span>3 collaborators active today</span>
            <span className="text-stone-400 normal-case tracking-normal font-sans text-xs italic">
              ada, carmen, you
            </span>
          </div>

          {/* AI Digest — editorial summary paragraph from the Engine */}
          <section className="mt-16">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              AI digest
            </div>
            <p className="mt-4 text-lg leading-relaxed text-stone-700">
              You shipped{" "}
              <span className="font-semibold text-stone-900">2 enhancements</span> this
              week.{" "}
              <span className="text-amber-600 font-medium">T-247</span>{" "}
              <span className="text-stone-500">(CSV export)</span> is ready for your
              review.{" "}
              <span className="text-rose-600 font-medium">T-149</span> needs more info
              from <span className="italic">ada</span>. Your Bridge stayed online{" "}
              <span className="font-mono text-stone-900">99%</span> of working hours.
            </p>
            <div className="mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
              <span>refreshed 2 min ago</span>
              <span>·</span>
              <a className="hover:text-amber-600 cursor-pointer">regenerate ↻</a>
            </div>
          </section>

          {/* PINNED strip — renders only if any project is pinned.
              Each row gets: title + activity sparkline + live Bridge dot. */}
          {PINNED.length > 0 && (
            <section className="mt-16">
              <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  Pinned
                </h2>
              </div>
              <ul className="divide-y divide-stone-200">
                {PINNED.map((p) => {
                  // Mock 7-day activity sparkline data
                  const spark = [2, 5, 1, 3, 7, 4, 6];
                  const max = Math.max(...spark);
                  return (
                    <li key={p.id} className="py-5 group cursor-pointer">
                      <div className="flex items-baseline justify-between gap-6">
                        <div className="flex items-baseline gap-2">
                          <span className="text-amber-500">★</span>
                          <span className="text-lg tracking-tight font-medium">
                            {p.name}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-stone-400 group-hover:text-stone-900 transition">
                          →
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-6">
                        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                          <span>
                            <span className="text-stone-900">{p.openCount}</span> open
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`h-1 w-1 rounded-full ${
                                p.bridgeOnline ? "bg-emerald-500" : "bg-stone-300"
                              }`}
                            />
                            {p.bridgeOnline ? "bridge live" : "bridge offline"}
                          </span>
                          <span>·</span>
                          <span>last activity {p.lastActivity}</span>
                        </div>
                        {/* Activity sparkline — tiny 7-day bar chart */}
                        <div
                          className="flex items-end gap-0.5 h-5"
                          title="Last 7 days of activity"
                        >
                          {spark.map((h, i) => (
                            <div
                              key={i}
                              className="w-1 bg-amber-400/70 group-hover:bg-amber-500 transition-colors rounded-sm"
                              style={{ height: `${(h / max) * 100}%` }}
                            />
                          ))}
                          <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-stone-400 self-center">
                            7d
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Recent updates — capped height with hidden scrollbar + fade mask.
              List scrolls internally; outer page stays still. */}
          <section className="mt-16">
            <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Recent
              </h2>
              <span className="text-xs font-mono text-stone-400">{MOCK_FEED.length}</span>
            </div>
            <ol className="divide-y divide-stone-200 max-h-[440px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,black_calc(100%-80px),transparent_100%)]">
              {MOCK_FEED.map((f, i) => (
                <li
                  key={f.id}
                  className="py-6 grid grid-cols-[40px_1fr_auto] items-baseline gap-6 group cursor-pointer"
                >
                  <span className="font-mono text-xs text-stone-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="flex items-baseline gap-2.5 text-lg tracking-tight">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full mt-2 shrink-0 ${stateDotE(
                          f.state,
                        )}`}
                      />
                      <span>{f.title}</span>
                    </div>
                    <div className="mt-1 ml-4 text-sm text-stone-500">
                      {f.project} · {f.reporter} ·{" "}
                      <span className={stateClassE(f.state)}>
                        {f.state.replace("-", " ")}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-stone-400 group-hover:text-stone-900 transition whitespace-nowrap">
                    {f.at}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* (all-projects link removed — covered by the sidebar `P` letter
              and the Other projects section in the aside column) */}

          </div>

          {/* ASIDE COL — editorial "in brief" sidebar */}
          <aside className="space-y-14">
            {/* This week — hero number (mirrors F's State) + smaller metrics + bar chart */}
            <section>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                This week
              </div>

              {/* Hero number — same typographic treatment as F's "Backlog" state */}
              <div className="mt-3">
                <span className="relative text-2xl font-bold tracking-tight">
                  5 shipped
                  <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                Best week this month. Up from{" "}
                <span className="font-mono">3</span> last week.
              </p>

              {/* Secondary metrics */}
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Engine time</span>
                  <span className="font-mono text-stone-900">~14 hrs</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">PRs merged</span>
                  <span className="font-mono text-stone-900">3</span>
                </li>
              </ul>
              {/* Weekly bar chart */}
              <div className="mt-6 flex items-end gap-1 h-14">
                {[1, 3, 0, 2, 4, 5, 0].map((h, i) => {
                  const day = ["M", "T", "W", "T", "F", "S", "S"][i];
                  const isToday = i === 1;
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1.5"
                    >
                      <div
                        className={`w-full rounded-t-sm ${
                          isToday ? "bg-amber-500" : "bg-amber-400/60"
                        }`}
                        style={{ height: `${Math.max((h / 5) * 100, 4)}%` }}
                      />
                      <span
                        className={`font-mono text-[9px] ${
                          isToday ? "text-amber-600 font-bold" : "text-stone-400"
                        }`}
                      >
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* READY TO SHIP — feature card, mirrors F's IF DISPATCHED card */}
            {MOCK_SIGNALS.shipReady > 0 && (
              <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  Ready to ship
                </div>
                <div className="mt-3 text-sm text-stone-700 leading-relaxed">
                  <span className="font-mono text-stone-900">
                    {MOCK_SIGNALS.shipReady} tickets
                  </span>{" "}
                  are parallel-safe. A single Ship Group can land them together.
                </div>
                <div className="mt-2 font-mono text-xs text-stone-500">
                  T-247 · T-301 · file-sets disjoint
                </div>
                <button className="mt-5 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3 rounded-full inline-flex items-center justify-center gap-2 shadow-sm transition">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Ship {MOCK_SIGNALS.shipReady} now
                  <span className="text-stone-400">→</span>
                </button>
                <a className="mt-3 block text-center font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:underline cursor-pointer">
                  Review first ↗
                </a>
              </section>
            )}

            {/* Activity — timeline rail with live pulse on the most recent event */}
            <section>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                  <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Activity
              </div>

              <div className="mt-4 relative">
                {/* Vertical timeline line behind the dots */}
                <div className="absolute left-[3px] top-3 bottom-3 w-px bg-stone-200" />
                <ul className="relative space-y-4 text-sm">
                  {[
                    {
                      who: "ada",
                      what: "is editing T-247",
                      at: "2m ago",
                      dot: "bg-amber-500",
                    },
                    {
                      who: "Engine",
                      what: "completed T-201",
                      at: "1h ago",
                      dot: "bg-emerald-500",
                    },
                    {
                      who: "Engine",
                      what: "failed T-149",
                      at: "12m ago",
                      dot: "bg-rose-500",
                    },
                    {
                      who: "carmen",
                      what: "dispatched T-149",
                      at: "15m ago",
                      dot: "bg-stone-400",
                    },
                  ].map((a, i) => (
                    <li key={i} className="flex items-baseline gap-2.5">
                      <span className="relative mt-1.5 shrink-0 inline-block h-1.5 w-1.5">
                        {i === 0 && (
                          <span
                            className={`absolute -inset-1 rounded-full ${a.dot} opacity-40 animate-ping`}
                          />
                        )}
                        <span
                          className={`relative inline-block h-1.5 w-1.5 rounded-full ${a.dot}`}
                        />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-stone-700 leading-snug">
                          <span className="font-medium text-stone-900">{a.who}</span>{" "}
                          {a.what}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          {a.at}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <a className="mt-5 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                all activity →
              </a>
            </section>

            {/* Other projects — non-pinned, quiet */}
            <section>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Other projects
              </div>
              <ul className="mt-4 space-y-3">
                {MOCK_PROJECTS.filter((p) => !p.pinned).map((p) => (
                  <li key={p.id} className="group cursor-pointer">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm tracking-tight text-stone-700 group-hover:text-stone-900">
                        {p.name}
                      </span>
                      <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                        →
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      <span>{p.openCount} open</span>
                      <span>·</span>
                      <span>{p.lastActivity}</span>
                      {!p.bridgeOnline && (
                        <>
                          <span>·</span>
                          <span className="text-stone-500">bridge offline</span>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Bridge — Engine + Bridge health detail, fills the bottom */}
            <section>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Bridge
              </div>
              <div className="mt-3 flex items-baseline gap-2.5">
                <span className="relative flex h-1.5 w-1.5 mt-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                  <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <div>
                  <div className="text-base text-stone-900 font-medium">
                    macbook-pro-2024
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    online · healthy
                  </div>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Uptime</span>
                  <span className="font-mono text-stone-900">99%</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Last preflight</span>
                  <span className="font-mono text-stone-900">2h ago</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Avg response</span>
                  <span className="font-mono text-stone-900">~5 min</span>
                </li>
              </ul>
              <a className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                Bridge settings →
              </a>
            </section>
          </aside>
          </div>
        </main>
      </div>

      {/* Editorial colophon — anchored bottom-left, aligns with the `o` baseline */}
      <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
        atlas · v1.3 design lab · variant E · editorial · feed-first
      </div>
      </div>
    </>
  );
}

function stateClassE(s: string): string {
  if (s === "shipped") return "text-emerald-600 font-medium";
  if (s === "failed") return "text-rose-600 font-medium";
  if (s === "review-ready") return "text-amber-600 font-medium";
  if (s === "in-progress") return "text-stone-700 font-medium";
  return "text-stone-500";
}

function stateDotE(s: string): string {
  if (s === "shipped") return "bg-emerald-500";
  if (s === "failed") return "bg-rose-500";
  if (s === "review-ready") return "bg-amber-500";
  if (s === "in-progress") return "bg-stone-700";
  if (s === "backlog") return "bg-stone-400";
  return "bg-stone-300";
}
