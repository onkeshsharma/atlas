// THROWAWAY — Editorial Command Palette prototype.
// The ⌘K overlay. Project switching, navigation, quick actions, recent items —
// all on one focused surface. Modal-style: blurred backdrop + centered card.

const RESULTS = [
  {
    section: "Projects",
    items: [
      { icon: "▦", label: "atlas-internal", hint: "5 active · 3 in review", recent: true },
      { icon: "▦", label: "marketing-site", hint: "2 active" },
      { icon: "▦", label: "trinetr-mes", hint: "12 active · 1 stuck" },
      { icon: "▦", label: "abyss", hint: "no active work" },
    ],
  },
  {
    section: "Actions",
    items: [
      { icon: "+", label: "File a new Ticket…", hint: "in atlas-internal", kbd: "T" },
      { icon: "→", label: "Dispatch the next queued Job", hint: "Job #138 — Refactor brief drafter", kbd: "D" },
      { icon: "✎", label: "Edit CONTEXT.md for atlas-internal", hint: "" },
      { icon: "✓", label: "Mark Ticket #142 as shipped", hint: "" },
    ],
  },
  {
    section: "Pages",
    items: [
      { icon: "·", label: "Dashboard", kbd: "G D" },
      { icon: "·", label: "Triage inbox", hint: "3 pending", kbd: "G T" },
      { icon: "·", label: "Profile", kbd: "G P" },
      { icon: "·", label: "Bridges", hint: "1 healthy", kbd: "G B" },
      { icon: "·", label: "Audit log", kbd: "G A" },
    ],
  },
  {
    section: "Recent Tickets",
    items: [
      { icon: "#", label: "Timezone crash on signup", hint: "#142 · atlas-internal · in review" },
      { icon: "#", label: "Add OG image for landing", hint: "#141 · marketing-site · queued" },
      { icon: "#", label: "Refactor brief drafter", hint: "#138 · atlas-internal · queued" },
    ],
  },
];

const RECENTS = ["atlas-internal", "Triage inbox", "Ticket #142", "Dispatch"];

export function VariantUUCmdK() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        {/* The "behind" page — a faded dashboard-ish ghost so the modal has context */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-8 left-20 font-mono text-xs uppercase tracking-widest text-stone-300">
            atlas · dashboard · onkesh
          </div>
          <div className="absolute top-32 left-20 right-20 grid grid-cols-3 gap-6 opacity-30 select-none">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-white/40 border border-stone-200 h-28"
              />
            ))}
          </div>
          <div className="absolute top-[460px] left-20 right-20 opacity-30 select-none">
            <div className="h-px bg-stone-300 mb-6" />
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-10 border-b border-stone-200/60" />
            ))}
          </div>
        </div>

        {/* Backdrop scrim + blur */}
        <div className="absolute inset-0 bg-amber-50/60 backdrop-blur-sm" />

        {/* MODAL */}
        <div className="relative min-h-screen flex items-start justify-center pt-28 pb-24 px-6">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl shadow-amber-900/10 ring-1 ring-stone-200/80 overflow-hidden">
            {/* Top — hero input row */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-stone-400">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-1 w-1 rounded-full bg-amber-500" />
                  Command palette
                </span>
                <span>esc to close</span>
              </div>
              <div className="mt-3 flex items-baseline gap-4">
                <span className="font-mono text-stone-400 text-2xl">⌕</span>
                <input
                  type="text"
                  autoFocus
                  placeholder="Jump to anything — type a project, a Ticket #, or just say what you want…"
                  className="flex-1 bg-transparent text-2xl tracking-tight text-stone-900 placeholder:text-stone-300 focus:outline-none"
                />
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  74 results
                </span>
              </div>

              {/* Recent chips */}
              <div className="mt-5 flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  recent
                </span>
                {RECENTS.map((r) => (
                  <a
                    key={r}
                    className="px-2.5 py-1 rounded-full bg-stone-100 text-xs text-stone-700 hover:bg-stone-200 cursor-pointer transition"
                  >
                    {r}
                  </a>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[480px] overflow-y-auto border-t border-stone-200/60">
              {RESULTS.map((group, gi) => (
                <section key={group.section} className="py-3">
                  <div className="px-6 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500 flex items-baseline justify-between">
                    <span>{group.section}</span>
                    <span className="text-stone-300">{group.items.length}</span>
                  </div>
                  <ul>
                    {group.items.map((item, ii) => {
                      const isFirst = gi === 0 && ii === 0;
                      return (
                        <li key={ii}>
                          <a
                            className={`px-6 py-2.5 grid grid-cols-[24px_1fr_auto] items-baseline gap-4 cursor-pointer transition ${
                              isFirst
                                ? "bg-amber-50 border-l-2 border-amber-500"
                                : "hover:bg-stone-50 border-l-2 border-transparent"
                            }`}
                          >
                            <span
                              className={`font-mono text-base ${
                                isFirst ? "text-amber-700" : "text-stone-400"
                              }`}
                            >
                              {item.icon}
                            </span>
                            <div>
                              <div className="flex items-baseline gap-2">
                                <span
                                  className={`text-base ${
                                    isFirst
                                      ? "text-stone-900 font-medium"
                                      : "text-stone-900"
                                  }`}
                                >
                                  {item.label}
                                </span>
                                {"recent" in item && item.recent && (
                                  <span className="font-mono text-[9px] uppercase tracking-widest text-amber-700">
                                    recent
                                  </span>
                                )}
                              </div>
                              {item.hint && (
                                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                                  {item.hint}
                                </div>
                              )}
                            </div>
                            <span>
                              {"kbd" in item && item.kbd ? (
                                <kbd className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-[10px] text-stone-600">
                                  {item.kbd}
                                </kbd>
                              ) : isFirst ? (
                                <span className="font-mono text-[10px] uppercase tracking-widest text-amber-700">
                                  ↵ to open
                                </span>
                              ) : null}
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-stone-200/60 bg-stone-50/60 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-stone-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-600">
                    ↑↓
                  </kbd>
                  navigate
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-600">
                    ↵
                  </kbd>
                  open
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-600">
                    ⌘K
                  </kbd>
                  toggle
                </span>
              </div>
              <span className="italic font-sans tracking-normal text-stone-400 text-xs normal-case">
                tip — start with a slash for actions, # for Tickets
              </span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-8 font-mono text-[10px] uppercase tracking-widest text-stone-400 z-10">
          atlas · v1.3 design lab · variant UU · editorial command palette
        </div>
      </div>
    </>
  );
}
