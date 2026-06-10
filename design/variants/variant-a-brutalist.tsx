// THROWAWAY — design-register prototype, variant A "Brutalist".
// Sharp edges, mono-everything, no shadows, 1px borders, stone + lime accent.

import { MOCK_FEED, MOCK_PROJECTS, MOCK_SIGNALS, NAV } from "./mock-data";

export function VariantABrutalist() {
  return (
    <div className="absolute inset-0 z-40 overflow-auto bg-stone-50 text-stone-900 font-sans">
      <div className="flex min-h-screen">
        {/* Sidebar — text-only mono, sharp edges, 1px border */}
        <aside className="w-[200px] shrink-0 border-r border-stone-300 bg-stone-100">
          <div className="px-4 py-5 border-b border-stone-300">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-stone-500">atlas</div>
            <div className="mt-2 flex items-center gap-2 font-mono text-xs">
              <span className="inline-block h-1.5 w-1.5 bg-lime-500" />
              <span className="text-stone-600">macbook-pro-2024</span>
            </div>
          </div>
          <nav className="px-2 py-2 space-y-px">
            {NAV.map((n) => (
              <a
                key={n.key}
                className={`flex items-center justify-between px-2 py-1.5 font-mono text-xs uppercase tracking-widest cursor-pointer ${
                  n.active ? "bg-stone-900 text-stone-50" : "text-stone-700 hover:bg-stone-200"
                }`}
              >
                <span>{n.short}</span>
                {n.badge !== undefined && <span>{n.badge}</span>}
              </a>
            ))}
          </nav>
          <div className="mt-6 border-t border-stone-300 px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
            <div>onkesh@</div>
            <div>example.com</div>
            <a className="mt-2 block text-stone-700 hover:underline cursor-pointer">sign out →</a>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-stone-500">/dashboard</div>

          {/* HERO — oversized mono numerals */}
          <div className="mt-10 flex items-baseline gap-12 flex-wrap">
            <HeroSignal n={MOCK_SIGNALS.triage} label="needs triage" tone="default" />
            <HeroSignal n={MOCK_SIGNALS.shipReady} label="ship ready" tone="default" />
            <HeroSignal n={MOCK_SIGNALS.failed} label="failed" tone="rose" />
            <HeroSignal n={MOCK_SIGNALS.inFlight} label="in flight" tone="muted" />
          </div>

          {/* Projects */}
          <div className="mt-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500 border-b border-stone-300 pb-2">
              projects · {MOCK_PROJECTS.length}
            </div>
            <div className="mt-3 divide-y divide-stone-200 border-x border-b border-stone-300 bg-white">
              {MOCK_PROJECTS.map((p) => (
                <div key={p.id} className="grid grid-cols-[24px_1fr_auto_auto_auto] items-center gap-6 px-4 py-3 hover:bg-stone-50 cursor-pointer">
                  <span className="font-mono text-xs text-amber-500">{p.pinned ? "★" : " "}</span>
                  <span className="font-mono text-sm font-medium">{p.name}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">{p.role}</span>
                  <span className="font-mono text-xs text-stone-600">{p.openCount} open</span>
                  <span className="font-mono text-xs text-stone-500">{p.lastActivity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feed */}
          <div className="mt-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500 border-b border-stone-300 pb-2">
              recent · {MOCK_FEED.length}
            </div>
            <div className="mt-3 divide-y divide-stone-200 border-x border-b border-stone-300 bg-white">
              {MOCK_FEED.map((f) => (
                <div key={f.id} className="grid grid-cols-[100px_1fr_auto] items-baseline gap-4 px-4 py-3">
                  <span className={`font-mono text-[10px] uppercase tracking-widest ${stateClassA(f.state)}`}>
                    [{f.state.replace("-", " ")}]
                  </span>
                  <div>
                    <div className="text-sm">{f.title}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      {f.project} · {f.reporter}
                    </div>
                  </div>
                  <span className="font-mono text-xs text-stone-500">{f.at}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-16 font-mono text-[10px] uppercase tracking-widest text-stone-400">
            atlas · v1.3 design lab · variant A · brutalist
          </div>
        </main>
      </div>
    </div>
  );
}

function HeroSignal({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone: "default" | "rose" | "muted";
}) {
  const colour =
    tone === "rose" ? "text-rose-600" : tone === "muted" ? "text-stone-400" : "text-stone-900";
  return (
    <div>
      <div className={`font-mono text-7xl font-bold tracking-tighter leading-none ${colour}`}>
        {n}
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">
        {label}
      </div>
    </div>
  );
}

function stateClassA(s: string): string {
  if (s === "shipped") return "text-lime-700";
  if (s === "failed") return "text-rose-600";
  if (s === "review-ready") return "text-stone-900";
  if (s === "backlog") return "text-stone-400";
  if (s === "in-progress") return "text-amber-600";
  return "text-stone-500";
}
