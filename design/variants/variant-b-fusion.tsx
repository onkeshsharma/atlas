// THROWAWAY — design-register prototype, variant B "Soft brutalist".
// Mono for metadata + numerals, sans for prose. Cards float with soft
// shadows + rounded corners. Stone + emerald + rose + violet (v1.2-locked).

import { MOCK_FEED, MOCK_PROJECTS, MOCK_SIGNALS, NAV } from "./mock-data";

export function VariantBFusion() {
  return (
    <div className="absolute inset-0 z-40 overflow-auto bg-stone-100 text-stone-900 font-sans">
      <div className="flex min-h-screen p-3 gap-3">
        {/* Floating sidebar */}
        <aside className="w-[240px] shrink-0 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-stone-100">
            <div className="font-sans text-lg font-bold tracking-tighter">
              atlas<span className="text-emerald-500">.</span>
            </div>
            <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-stone-600">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              macbook-pro-2024
            </div>
          </div>
          <nav className="flex-1 p-2 space-y-0.5">
            {NAV.map((n) => (
              <a
                key={n.key}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
                  n.active ? "bg-stone-900 text-stone-50" : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base leading-none">{n.glyph}</span>
                  <span className="font-medium">{n.label}</span>
                </span>
                {n.badge !== undefined && (
                  <span
                    className={`font-mono text-[10px] rounded-md px-1.5 py-0.5 ${
                      n.active ? "bg-stone-50 text-stone-900" : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {n.badge}
                  </span>
                )}
              </a>
            ))}
          </nav>
          <div className="border-t border-stone-100 p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-stone-200 flex items-center justify-center font-mono text-xs">
              O
            </div>
            <div className="flex-1 text-xs text-stone-600 truncate">onkesh@example.com</div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Thin route-context strip */}
          <header className="rounded-2xl bg-white border border-stone-200 shadow-sm px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-stone-500">
              <span>workspace</span>
              <span>/</span>
              <span className="text-stone-900">dashboard</span>
            </div>
            <button className="rounded-md bg-stone-900 text-stone-50 text-xs font-mono uppercase tracking-widest px-3 py-1.5 hover:bg-stone-700">
              + new project
            </button>
          </header>

          {/* Hero block — large mono numerals */}
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">
              what needs you right now
            </div>
            <div className="mt-4 grid grid-cols-4 gap-6">
              <Signal n={MOCK_SIGNALS.triage} label="needs triage" tone="default" />
              <Signal n={MOCK_SIGNALS.shipReady} label="ready to ship" tone="emerald" />
              <Signal n={MOCK_SIGNALS.failed} label="failed" tone="rose" />
              <Signal n={MOCK_SIGNALS.inFlight} label="in flight" tone="muted" />
            </div>
          </div>

          {/* 2-col: projects + recent updates */}
          <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
            <section className="col-span-1 rounded-2xl bg-white border border-stone-200 shadow-sm p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold tracking-tight">Projects</h2>
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  {MOCK_PROJECTS.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {MOCK_PROJECTS.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-stone-200 p-3 hover:border-stone-300 hover:shadow-sm transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-sm font-medium">
                        {p.pinned && <span className="text-amber-500 mr-1">★</span>}
                        {p.name}
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        {p.role}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-stone-500">
                      <span>{p.openCount} open</span>
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            p.bridgeOnline ? "bg-emerald-500" : "bg-stone-300"
                          }`}
                        />
                        {p.lastActivity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="col-span-2 rounded-2xl bg-white border border-stone-200 shadow-sm p-5 min-w-0">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold tracking-tight">Recent updates</h2>
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  {MOCK_FEED.length}
                </span>
              </div>
              <div className="mt-3 divide-y divide-stone-100">
                {MOCK_FEED.map((f) => (
                  <div
                    key={f.id}
                    className="py-3 grid grid-cols-[110px_1fr_auto] items-baseline gap-4"
                  >
                    <span className={`font-mono text-[10px] uppercase tracking-widest ${stateClassB(f.state)}`}>
                      {f.state.replace("-", " ")}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm truncate">{f.title}</div>
                      <div className="font-mono text-[11px] text-stone-500 mt-0.5 truncate">
                        {f.project} · {f.reporter}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-stone-500 whitespace-nowrap">{f.at}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-1 text-center font-mono text-[10px] uppercase tracking-widest text-stone-400">
            atlas · v1.3 design lab · variant B · soft brutalist
          </div>
        </main>
      </div>
    </div>
  );
}

function Signal({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone: "default" | "emerald" | "rose" | "muted";
}) {
  const colour =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "rose"
      ? "text-rose-600"
      : tone === "muted"
      ? "text-stone-400"
      : "text-stone-900";
  return (
    <div>
      <div className={`font-mono text-5xl font-bold tracking-tighter leading-none ${colour}`}>
        {n}
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
        {label}
      </div>
    </div>
  );
}

function stateClassB(s: string): string {
  if (s === "shipped") return "text-emerald-600";
  if (s === "failed") return "text-rose-600";
  if (s === "review-ready") return "text-violet-600";
  if (s === "backlog") return "text-stone-400";
  if (s === "in-progress") return "text-amber-600";
  return "text-stone-500";
}
