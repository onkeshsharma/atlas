// THROWAWAY — collapsed-state spike for the Editorial register.
// Same Editorial language as variant C, but the sidebar is in its
// COLLAPSED default state (single-letter initials, 56px wide,
// editorial-text-only — no icons sneak in).

import { MOCK_FEED, MOCK_PROJECTS, MOCK_SIGNALS, NAV } from "./mock-data";

export function VariantDEditorialCollapsed() {
  return (
    <div className="absolute inset-0 z-40 overflow-auto bg-amber-50/30 text-stone-900 font-sans">
      <div className="flex min-h-screen">
        {/* COLLAPSED rail — 56px wide, letters only */}
        <aside className="w-[56px] shrink-0 flex flex-col items-center py-8 gap-8 border-r border-stone-200/60">
          {/* Brand mark + bridge dot */}
          <div className="relative">
            <div className="text-xl font-bold tracking-tighter">a</div>
            <span
              className="absolute -right-1 -top-0.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
              title="macbook-pro-2024 online"
            />
          </div>

          {/* Nav initials */}
          <nav className="flex flex-col items-center gap-5">
            {NAV.map((n) => {
              const initial = n.short.charAt(0); // D / T / R / P / S
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
                  {/* Tooltip pops to the right on hover */}
                  <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-stone-50 opacity-0 group-hover:opacity-100 pointer-events-none transition shadow-md">
                    {n.label}
                    {n.badge !== undefined && <span className="text-stone-400"> · {n.badge}</span>}
                  </span>
                </a>
              );
            })}
          </nav>

          {/* Spacer pushes user-initial to bottom */}
          <div className="flex-1" />

          {/* User identity initial */}
          <a
            title="onkesh@example.com · sign out"
            className="h-7 w-7 flex items-center justify-center rounded-full bg-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-300 cursor-pointer"
          >
            o
          </a>
        </aside>

        {/* Main — same editorial content as variant C, gets MORE width */}
        <main className="flex-1 px-16 pt-12 pb-24 max-w-5xl">
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

          {/* Projects */}
          <section className="mt-20">
            <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Projects
              </h2>
              <a className="text-xs text-stone-700 hover:underline cursor-pointer">+ new</a>
            </div>
            <ul className="divide-y divide-stone-200">
              {MOCK_PROJECTS.map((p) => (
                <li
                  key={p.id}
                  className="py-5 grid grid-cols-[1fr_auto] items-baseline gap-6 group cursor-pointer"
                >
                  <div>
                    <div className="text-xl tracking-tight font-medium">
                      {p.pinned && <span className="text-amber-500 mr-2">★</span>}
                      {p.name}
                    </div>
                    <div className="mt-1 text-sm text-stone-500">
                      {p.role} · {p.openCount} open · {p.lastActivity}
                    </div>
                  </div>
                  <span className="font-mono text-xs text-stone-400 group-hover:text-stone-900 transition">
                    →
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Recent updates */}
          <section className="mt-20">
            <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Recent updates
              </h2>
              <span className="text-xs font-mono text-stone-400">{MOCK_FEED.length}</span>
            </div>
            <ol className="divide-y divide-stone-200">
              {MOCK_FEED.map((f, i) => (
                <li
                  key={f.id}
                  className="py-6 grid grid-cols-[40px_1fr_auto] items-baseline gap-6"
                >
                  <span className="font-mono text-xs text-stone-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="text-lg tracking-tight">{f.title}</div>
                    <div className="mt-1 text-sm text-stone-500">
                      {f.project} · {f.reporter} ·{" "}
                      <span className={stateClassD(f.state)}>{f.state.replace("-", " ")}</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-stone-400 whitespace-nowrap">
                    {f.at}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <div className="mt-24 font-mono text-[10px] uppercase tracking-widest text-stone-400">
            atlas · v1.3 design lab · variant D · editorial · collapsed sidebar
          </div>
        </main>
      </div>
    </div>
  );
}

function stateClassD(s: string): string {
  if (s === "shipped") return "text-emerald-600 font-medium";
  if (s === "failed") return "text-rose-600 font-medium";
  if (s === "review-ready") return "text-amber-600 font-medium";
  if (s === "in-progress") return "text-stone-700 font-medium";
  return "text-stone-500";
}
