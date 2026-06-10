// THROWAWAY — Editorial Cheatsheet prototype.
// Print-style reference page. Keyboard shortcuts, arrow vocabulary, status
// glyph legend. The page Owners pin while learning Atlas.

import { NAV } from "./mock-data";

const SHORTCUTS = [
  {
    section: "Anywhere",
    items: [
      ["⌘ K", "Open command palette"],
      ["⌘ /", "Toggle this cheatsheet"],
      ["G then D", "Go to Dashboard"],
      ["G then T", "Go to Triage inbox"],
      ["G then P", "Go to Profile"],
      ["G then B", "Go to Bridges"],
      ["G then A", "Go to Audit log"],
      ["G then S", "Go to Settings"],
      ["ESC", "Close any modal / drop focus"],
      ["⌘ ⇧ L", "Sign in to your other account"],
    ],
  },
  {
    section: "Dashboard",
    items: [
      ["T", "File a new Ticket"],
      ["D", "Dispatch next queued Job"],
      ["R", "Refresh feed"],
      ["F", "Focus the filter bar"],
      ["1 … 9", "Jump to pinned Project N"],
    ],
  },
  {
    section: "Inside a Ticket",
    items: [
      ["E", "Edit Brief"],
      ["A", "Approve Brief & dispatch"],
      ["S", "Send back to Engine"],
      ["C", "Add comment"],
      ["⌘ ↵", "Submit any composer"],
      ["[ / ]", "Prev / next Ticket"],
    ],
  },
  {
    section: "Kanban",
    items: [
      ["←/→", "Move card across columns"],
      ["⇧ ←/→", "Move + assign to next reviewer"],
      ["G then K", "Open Kanban"],
      ["X", "Toggle Ship-Group cluster view"],
    ],
  },
];

const ARROWS = [
  { glyph: "→", name: "next", use: "Forward motion within Atlas. Most CTAs use this." },
  { glyph: "↗", name: "external", use: "Leaves Atlas — opens GitHub, Resend, status page, third-party docs." },
  { glyph: "←", name: "back", use: "Returns to a previous page or column." },
  { glyph: "↓", name: "more", use: "Expands a folded section — shipped, archived, older events." },
  { glyph: "↵", name: "submit", use: "On any focused input. Pairs with ⌘ to commit composers." },
  { glyph: "▶", name: "active", use: "Engine or Job is mid-run. Often paired with a pulse dot." },
  { glyph: "●", name: "live state", use: "Pulsing emerald = healthy, amber = degraded, rose = down." },
  { glyph: "✓", name: "passed", use: "Quality gate green, Brief approved, PR merged." },
  { glyph: "·", name: "metadata divider", use: "Between meta tokens in mono uppercase tracking-widest rows." },
];

const STATUS = [
  { color: "emerald", name: "ship / healthy / done", contexts: "Bridge online · Ticket shipped · gate passed · invite accepted" },
  { color: "amber", name: "active / pending / Atlas brand", contexts: "Mid-Job · awaiting approval · enrichment running · all hero accents" },
  { color: "rose", name: "danger / failed / offline", contexts: "Bridge offline · gate failed · destructive action · validation error" },
  { color: "violet", name: "merge / ship event", contexts: "PR merged · Ship Group closed · Notification sent" },
  { color: "sky", name: "social / invite / collaborator", contexts: "Invitation sent · @mention · Collaborator joined" },
  { color: "stone", name: "neutral / chrome", contexts: "Everything else — body text, dividers, mono labels" },
];

function statusDot(c: string): string {
  const map: Record<string, string> = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    violet: "bg-violet-500",
    sky: "bg-sky-500",
    stone: "bg-stone-400",
  };
  return map[c] ?? "bg-stone-400";
}

export function VariantVVCheatsheet() {
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
                Help · Cheatsheet
              </div>
              <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                <a className="hover:text-stone-900 cursor-pointer">print this page ↗</a>
                <a className="hover:text-stone-900 cursor-pointer">docs →</a>
              </div>
            </div>

            <div className="mt-8 max-w-5xl">
              {/* Hero */}
              <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
                One-page reference · last updated yesterday
              </div>
              <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-[1.05]">
                Every shortcut, every glyph,{" "}
                <span className="relative">
                  every colour
                  <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-amber-500" />
                </span>
                .
              </h1>
              <p className="mt-5 text-xl text-stone-700 leading-relaxed max-w-2xl">
                Designed to print on a single A4. Pin it next to your Bridge
                terminal — Atlas&rsquo;s vocabulary is small on purpose.
              </p>

              {/* SHORTCUTS */}
              <section className="mt-16">
                <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Keyboard shortcuts
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    macOS · use Ctrl on Windows
                  </span>
                </div>
                <div className="mt-7 grid grid-cols-2 gap-x-16 gap-y-12">
                  {SHORTCUTS.map((sc) => (
                    <section key={sc.section}>
                      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber-700">
                        {sc.section}
                      </div>
                      <dl className="mt-4 divide-y divide-stone-200">
                        {sc.items.map(([keys, desc]) => (
                          <div
                            key={keys}
                            className="py-2.5 grid grid-cols-[110px_1fr] items-baseline gap-4"
                          >
                            <dt>
                              <KeyChip combo={keys} />
                            </dt>
                            <dd className="text-sm text-stone-700">{desc}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
              </section>

              {/* ARROW VOCABULARY */}
              <section className="mt-20">
                <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Arrow vocabulary
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    9 glyphs · use sparingly
                  </span>
                </div>
                <ul className="mt-7 grid grid-cols-3 gap-x-10 gap-y-7">
                  {ARROWS.map((a) => (
                    <li
                      key={a.name}
                      className="grid grid-cols-[32px_1fr] items-baseline gap-4"
                    >
                      <span className="font-mono text-3xl text-stone-900 leading-none">
                        {a.glyph}
                      </span>
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-amber-700">
                          {a.name}
                        </div>
                        <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                          {a.use}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {/* STATUS PALETTE */}
              <section className="mt-20">
                <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Status palette
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    6 roles · 1 colour each
                  </span>
                </div>
                <ul className="mt-7 divide-y divide-stone-200">
                  {STATUS.map((s) => (
                    <li
                      key={s.color}
                      className="py-4 grid grid-cols-[80px_180px_1fr] items-baseline gap-6"
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${statusDot(
                            s.color,
                          )}`}
                        />
                        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                          {s.color}
                        </span>
                      </span>
                      <span className="font-medium text-stone-900 text-base">
                        {s.name}
                      </span>
                      <span className="text-sm text-stone-600 leading-relaxed">
                        {s.contexts}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm italic text-stone-500 leading-relaxed max-w-2xl">
                  Amber is reserved for Atlas&rsquo;s brand wash and pending
                  states. Don&rsquo;t use it for success — that&rsquo;s
                  emerald&rsquo;s job. The whole register depends on each colour
                  meaning exactly one thing.
                </p>
              </section>

              {/* LAYOUT VOCAB */}
              <section className="mt-20">
                <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Layout vocabulary
                  </h2>
                </div>
                <dl className="mt-7 grid grid-cols-2 gap-x-16 gap-y-5">
                  <Row
                    term="Sidebar"
                    def="56px wide, fixed, sticky. Three letters: brand, nav, you."
                  />
                  <Row
                    term="Body column"
                    def="max-w-2xl prose. Editorial type scale, 1.65 leading."
                  />
                  <Row
                    term="Rail"
                    def="320px right column. Optional. Holds heroes, meta, related."
                  />
                  <Row
                    term="Page wash"
                    def="bg-amber-50/30 always. The unifying ambient signal that this is Atlas."
                  />
                  <Row
                    term="Hero accent"
                    def="amber underline strip on one or two words. One per page, max."
                  />
                  <Row
                    term="Mono label"
                    def="text-xs uppercase tracking-widest in stone-500. Used for kicker copy + meta."
                  />
                </dl>
              </section>

              <p className="mt-20 text-sm italic text-stone-500 leading-relaxed max-w-2xl">
                Anything missing? File an enhancement Ticket in{" "}
                <span className="font-mono text-xs text-stone-700 not-italic">
                  atlas-internal
                </span>{" "}
                with the cheatsheet section that needs to grow. We treat this
                page as a contract.
              </p>
            </div>
          </main>
        </div>

        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant VV · editorial cheatsheet
        </div>
      </div>
    </>
  );
}

function KeyChip({ combo }: { combo: string }) {
  const parts = combo.split(" ");
  return (
    <span className="flex items-center gap-1 flex-wrap">
      {parts.map((p, i) =>
        p === "then" ? (
          <span
            key={i}
            className="font-mono text-[9px] uppercase tracking-widest text-stone-400 px-0.5"
          >
            then
          </span>
        ) : p === "/" ? (
          <span key={i} className="font-mono text-stone-400">
            /
          </span>
        ) : (
          <kbd
            key={i}
            className="px-1.5 py-0.5 rounded bg-white border border-stone-300 font-mono text-[11px] text-stone-700 shadow-sm"
          >
            {p}
          </kbd>
        ),
      )}
    </span>
  );
}

function Row({ term, def }: { term: string; def: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 items-baseline">
      <dt className="font-mono text-xs uppercase tracking-widest text-stone-500">
        {term}
      </dt>
      <dd className="text-sm text-stone-700 leading-relaxed">{def}</dd>
    </div>
  );
}
