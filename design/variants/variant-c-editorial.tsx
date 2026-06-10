// THROWAWAY — design-register prototype, variant C "Editorial".
// Display sans for headings, mono only for accent numerals + state.
// Generous whitespace, asymmetric layout, amber as the brand colour.

import { MOCK_FEED, MOCK_PROJECTS, MOCK_SIGNALS, NAV } from "./mock-data";

export function VariantCEditorial() {
  return (
    <div className="absolute inset-0 z-40 overflow-auto bg-amber-50/30 text-stone-900 font-sans">
      <div className="flex min-h-screen">
        {/* Floating asymmetric sidebar — generous, soft */}
        <aside className="w-[260px] shrink-0 px-8 pt-8 pb-6 flex flex-col gap-12">
          <div>
            <div className="text-2xl font-bold tracking-tighter">atlas</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="font-mono">macbook-pro-2024</span>
            </div>
          </div>
          <nav className="space-y-5">
            {NAV.map((n) => (
              <a
                key={n.key}
                className={`flex items-baseline justify-between text-sm cursor-pointer ${
                  n.active ? "text-stone-900 font-semibold" : "text-stone-500 hover:text-stone-900"
                }`}
              >
                <span>{n.label}</span>
                {n.badge !== undefined && (
                  <span className="font-mono text-xs text-stone-400">{n.badge}</span>
                )}
              </a>
            ))}
          </nav>
          <div className="mt-auto text-xs text-stone-500">
            <div>onkesh@example.com</div>
            <a className="mt-2 inline-block text-stone-700 hover:underline cursor-pointer">sign out</a>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 px-16 pt-12 pb-24 max-w-4xl">
          <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
            Tuesday · May 13
          </div>
          <h1 className="mt-2 text-5xl font-bold tracking-tighter">Today.</h1>

          {/* HERO — display numerals as a single sentence */}
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

          {/* Project list, asymmetric, body-typography */}
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

          {/* Recent updates as editorial reading list */}
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
                      <span className={stateClassC(f.state)}>
                        {f.state.replace("-", " ")}
                      </span>
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
            atlas · v1.3 design lab · variant C · editorial
          </div>
        </main>
      </div>
    </div>
  );
}

function stateClassC(s: string): string {
  if (s === "shipped") return "text-emerald-600 font-medium";
  if (s === "failed") return "text-rose-600 font-medium";
  if (s === "review-ready") return "text-amber-600 font-medium";
  if (s === "in-progress") return "text-stone-700 font-medium";
  return "text-stone-500";
}
