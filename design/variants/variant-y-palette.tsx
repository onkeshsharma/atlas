// THROWAWAY — Editorial Command Palette prototype.
// Cmd+K overlay: fuzzy search across navigation, tickets, projects, actions.
// Modal centered on a ghosted background.

import { NAV } from "./mock-data";

type ResultGroup = {
  label: string;
  items: ResultItem[];
};
type ResultItem = {
  glyph?: string;
  label: string;
  meta?: string;
  shortcut?: string[];
  active?: boolean;
};

const GROUPS: ResultGroup[] = [
  {
    label: "Jump to",
    items: [
      { glyph: "T", label: "Triage", meta: "3 waiting", shortcut: ["G", "T"], active: true },
      { glyph: "R", label: "Review", meta: "2 ready to ship", shortcut: ["G", "R"] },
      { glyph: "D", label: "Dashboard", shortcut: ["G", "D"] },
      { glyph: "S", label: "Settings", shortcut: ["G", "S"] },
    ],
  },
  {
    label: "Tickets",
    items: [
      { glyph: "·", label: "Add CSV export to the ticket list", meta: "T-301 · triage" },
      { glyph: "·", label: "Mermaid renders blank on iOS", meta: "T-280 · backlog" },
      { glyph: "·", label: "Add JSON export endpoint", meta: "T-249 · shipped" },
    ],
  },
  {
    label: "Projects",
    items: [
      { glyph: "★", label: "acme-website", meta: "pinned · 7 open" },
      { glyph: "·", label: "atlas-internal", meta: "2 open" },
      { glyph: "·", label: "side-experiment", meta: "0 open" },
    ],
  },
  {
    label: "Actions",
    items: [
      { glyph: "+", label: "File a Ticket", shortcut: ["F"] },
      { glyph: "+", label: "Invite a Collaborator", shortcut: ["I"] },
      { glyph: "+", label: "Refresh Ingest summary", shortcut: ["R", "I"] },
    ],
  },
];

export function VariantYPalette() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-hidden bg-amber-50/30 text-stone-900 font-sans">
        {/* GHOSTED BACKGROUND — sidebar + faint hint of the dashboard underneath */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="flex min-h-screen">
            <aside className="w-[56px] shrink-0 flex flex-col items-center justify-between py-8 border-r border-stone-200/60">
              <div className="relative h-6 w-6 flex items-center justify-center">
                <div className="text-xl font-bold tracking-tighter leading-none">a</div>
              </div>
              <nav className="flex flex-col items-center gap-5">
                {NAV.map((n) => (
                  <a key={n.key} className="relative h-7 w-7 flex items-center justify-center text-stone-400">
                    <span className="text-base font-medium">{n.short.charAt(0)}</span>
                  </a>
                ))}
              </nav>
              <div className="relative h-6 w-6 flex items-center justify-center">
                <div className="text-xl font-bold tracking-tighter leading-none text-stone-900">o</div>
              </div>
            </aside>
            <main className="flex-1 px-16 pt-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Tuesday · May 13
              </div>
              <h1 className="mt-3 text-5xl font-bold tracking-tighter">Today.</h1>
              <p className="mt-8 text-3xl leading-tight tracking-tight text-stone-700">
                <span className="font-mono">3</span> tickets need your triage.
              </p>
            </main>
          </div>
        </div>

        {/* MODAL — centered command palette */}
        <div className="absolute inset-0 backdrop-blur-md bg-amber-50/40 flex items-start justify-center pt-[15vh] px-8">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-stone-200 shadow-2xl overflow-hidden">
            {/* Search bar */}
            <div className="flex items-center gap-4 px-6 py-5 border-b border-stone-200">
              <span className="font-mono text-stone-400 text-lg">⌕</span>
              <input
                type="text"
                placeholder="Search Tickets, Projects, actions…"
                className="flex-1 bg-transparent text-lg text-stone-900 placeholder:text-stone-400 focus:outline-none"
                autoFocus
                defaultValue=""
              />
              <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded font-mono text-[10px] uppercase bg-stone-100 text-stone-500 border border-stone-200">
                esc
              </kbd>
            </div>

            {/* Results — divided sections */}
            <div className="max-h-[60vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,black_calc(100%-30px),transparent_100%)]">
              {GROUPS.map((group) => (
                <div key={group.label} className="px-3 py-3 border-b border-stone-100 last:border-b-0">
                  <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-[0.25em] text-stone-500">
                    {group.label}
                  </div>
                  <ul>
                    {group.items.map((item, i) => (
                      <li key={i}>
                        <a
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer ${
                            item.active
                              ? "bg-stone-100"
                              : "hover:bg-stone-50"
                          }`}
                        >
                          {item.glyph && (
                            <span
                              className={`font-mono text-sm w-5 text-center ${
                                item.glyph === "★"
                                  ? "text-amber-500"
                                  : "text-stone-400"
                              }`}
                            >
                              {item.glyph}
                            </span>
                          )}
                          <span className="flex-1 text-base text-stone-900 truncate">
                            {item.label}
                          </span>
                          {item.meta && (
                            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 whitespace-nowrap">
                              {item.meta}
                            </span>
                          )}
                          {item.shortcut && (
                            <span className="flex items-center gap-1 ml-2">
                              {item.shortcut.map((k, j) => (
                                <kbd
                                  key={j}
                                  className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded font-mono text-[10px] uppercase bg-stone-100 text-stone-700 border border-stone-200"
                                >
                                  {k}
                                </kbd>
                              ))}
                            </span>
                          )}
                          {item.active && (
                            <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-amber-600">
                              ↵
                            </span>
                          )}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Engine suggestion footer — a "did you mean?" moment */}
              <div className="px-6 py-4 bg-stone-50/60 border-t border-stone-200">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-stone-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  AI suggests
                </div>
                <p className="mt-2 text-sm italic text-stone-700 leading-relaxed">
                  Looking for the failed Ticket? You can also type{" "}
                  <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded font-mono text-[10px] uppercase bg-white text-stone-700 border border-stone-200">
                    failed
                  </kbd>{" "}
                  to filter just those.
                </p>
              </div>
            </div>

            {/* Footer — keyboard hints */}
            <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-stone-200 bg-stone-50/40">
              <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                <span className="flex items-center gap-1.5">
                  <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded font-mono text-[10px] uppercase bg-stone-100 text-stone-700 border border-stone-200">
                    ↑↓
                  </kbd>{" "}
                  navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded font-mono text-[10px] uppercase bg-stone-100 text-stone-700 border border-stone-200">
                    ↵
                  </kbd>{" "}
                  open
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded font-mono text-[10px] uppercase bg-stone-100 text-stone-700 border border-stone-200">
                    tab
                  </kbd>{" "}
                  next group
                </span>
              </div>
              <a className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-600 cursor-pointer">
                Show all shortcuts ?
              </a>
            </div>
          </div>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-8 font-mono text-[10px] uppercase tracking-widest text-stone-400 z-10">
          atlas · v1.3 design lab · variant Y · editorial command palette
        </div>
      </div>
    </>
  );
}
