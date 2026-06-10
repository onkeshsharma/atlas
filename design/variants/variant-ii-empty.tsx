// THROWAWAY — Editorial Empty States doc page.
// Reframed as a proper design-system article (matching HH's shape).

import { NAV } from "./mock-data";

const TOC = [
  { id: "rule", label: "The rule" },
  { id: "dashboard", label: "Dashboard · no Projects" },
  { id: "kanban-column", label: "Kanban · empty column" },
  { id: "triage", label: "Triage · caught up" },
  { id: "inbox", label: "Inbox · nothing new" },
  { id: "pinned", label: "Pinned · none" },
  { id: "palette", label: "Command palette · no match" },
  { id: "anti", label: "Anti-patterns" },
];

export function VariantIIEmpty() {
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
              {NAV.map((n) => {
                const initial = n.short.charAt(0);
                return (
                  <a
                    key={n.key}
                    className="relative h-7 w-7 flex items-center justify-center cursor-pointer transition text-stone-400 hover:text-stone-900"
                  >
                    <span className="text-base font-medium">{initial}</span>
                  </a>
                );
              })}
            </nav>
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none text-stone-900">o</div>
              <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
          </aside>

          <main className="flex-1 px-16 pt-8 pb-24">
            {/* Top breadcrumb */}
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Docs · Design system · Empty states
              </div>
              <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                edit this page ↗
              </a>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_280px] gap-16">
              {/* MAIN COL — long-form article */}
              <article className="max-w-2xl">
                <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
                  Design system · ~3 min read · 6 cases
                </div>
                <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
                  When there&rsquo;s nothing to show.
                </h1>
                <p className="mt-5 text-xl text-stone-700 leading-relaxed">
                  Every Atlas surface has an empty state. They all follow the same
                  shape: <span className="italic">one quiet sentence + one clear
                  action</span>. No illustrations, no exclamation marks, no
                  marketing copy.
                </p>

                {/* THE RULE */}
                <section id="rule" className="mt-16">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    The rule
                  </h2>
                  <ol className="mt-5 space-y-3 text-base text-stone-700 leading-relaxed">
                    <li className="flex items-baseline gap-3">
                      <span className="text-emerald-600 mt-1.5">●</span>
                      <span>One sentence stating what&rsquo;s absent.</span>
                    </li>
                    <li className="flex items-baseline gap-3">
                      <span className="text-emerald-600 mt-1.5">●</span>
                      <span>One affordance to fix it, if applicable.</span>
                    </li>
                    <li className="flex items-baseline gap-3">
                      <span className="text-emerald-600 mt-1.5">●</span>
                      <span>
                        Italic stone-500 secondary line if the absence is good
                        news.
                      </span>
                    </li>
                    <li className="flex items-baseline gap-3">
                      <span className="text-stone-400 mt-1.5">○</span>
                      <span className="text-stone-500">
                        Never an illustration. Never an exclamation mark. Never
                        marketing copy.
                      </span>
                    </li>
                  </ol>
                </section>

                {/* 01 — Dashboard */}
                <Case
                  id="dashboard"
                  fig="Fig. 1"
                  where="Dashboard"
                  when="A brand-new Owner with no Projects yet"
                >
                  <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
                    Tuesday · May 13
                  </div>
                  <h3 className="mt-2 text-3xl font-bold tracking-tighter">Today.</h3>
                  <p className="mt-5 text-lg text-stone-700 leading-relaxed">
                    No Projects yet.
                  </p>
                  <p className="mt-2 text-sm text-stone-500 leading-relaxed">
                    Ingest an existing repo, or start something new. Atlas takes
                    about three minutes to read a codebase.
                  </p>
                  <button className="mt-5 font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-2.5 rounded-full inline-flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Add your first Project
                    <span className="text-stone-400">→</span>
                  </button>
                </Case>

                {/* 02 — Kanban column */}
                <Case
                  id="kanban-column"
                  fig="Fig. 2"
                  where="Kanban · empty column"
                  when="A column has no Tickets in it"
                >
                  <div className="flex items-baseline justify-between pb-3 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
                      <span className="font-mono text-xs uppercase tracking-[0.25em] text-stone-700">
                        Failed
                      </span>
                    </div>
                    <span className="font-mono text-xs text-stone-400">0</span>
                  </div>
                  <div className="mt-6 text-center">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      Nothing here.
                    </div>
                    <p className="mt-2 text-sm text-stone-500 italic">
                      That&rsquo;s a good thing.
                    </p>
                  </div>
                </Case>

                {/* 03 — Triage caught up */}
                <Case
                  id="triage"
                  fig="Fig. 3"
                  where="Triage inbox"
                  when="The Owner has triaged everything in the queue"
                >
                  <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
                    Projects · acme-website · Triage
                  </div>
                  <h3 className="mt-3 text-3xl font-bold tracking-tighter">
                    All caught up.
                  </h3>
                  <p className="mt-3 text-base text-stone-700 leading-relaxed">
                    Zero Tickets waiting for triage. Last one cleared{" "}
                    <span className="font-mono text-stone-900">8 minutes ago</span>.
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                      back to Dashboard ↗
                    </a>
                    <span className="text-stone-300">·</span>
                    <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                      open the Kanban
                    </a>
                  </div>
                </Case>

                {/* 04 — Inbox nothing new */}
                <Case
                  id="inbox"
                  fig="Fig. 4"
                  where="Notifications · Inbox"
                  when="A Collaborator has no new notifications"
                >
                  <h3 className="text-2xl tracking-tight text-stone-700">
                    Atlas is quiet — that&rsquo;s the goal.
                  </h3>
                  <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                    Nothing new since you last checked. We&rsquo;ll only ping
                    you when something shipped or someone asked you a question.
                  </p>
                  <a className="mt-5 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    tune what you hear about →
                  </a>
                </Case>

                {/* 05 — Pinned none */}
                <Case
                  id="pinned"
                  fig="Fig. 5"
                  where="Dashboard · Pinned strip"
                  when="Owner hasn&rsquo;t pinned any Project yet"
                  small
                >
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    No pinned Projects. Star a Project from the{" "}
                    <a className="text-amber-600 hover:underline cursor-pointer not-italic font-medium">
                      Projects
                    </a>{" "}
                    list to surface it here.
                  </p>
                </Case>

                {/* 06 — Palette no match */}
                <Case
                  id="palette"
                  fig="Fig. 6"
                  where="Command palette · no results"
                  when="Search query that matches nothing"
                  small
                >
                  <div className="font-mono text-xs uppercase tracking-widest text-stone-400">
                    Nothing matches{" "}
                    <span className="text-stone-700 normal-case tracking-normal font-mono bg-stone-100 px-1.5 py-0.5 rounded">
                      foobar
                    </span>
                    .
                  </div>
                  <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                    Try a Ticket ID (
                    <span className="font-mono">T-247</span>), a Project name,
                    or a verb like <span className="font-mono">file</span>.
                  </p>
                </Case>

                {/* ANTI-PATTERNS */}
                <section id="anti" className="mt-20 pt-12 border-t border-stone-200">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Anti-patterns
                  </h2>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    Things an Atlas empty state{" "}
                    <span className="italic">never</span> does:
                  </p>
                  <ul className="mt-5 space-y-3 text-base text-stone-700 leading-relaxed">
                    <li className="flex items-baseline gap-3">
                      <span className="text-rose-500 mt-1.5">✕</span>
                      <span>
                        Hand-drawn illustrations of empty boxes / sad clouds /
                        magnifying glasses.
                      </span>
                    </li>
                    <li className="flex items-baseline gap-3">
                      <span className="text-rose-500 mt-1.5">✕</span>
                      <span>
                        &ldquo;Oops!&rdquo; / &ldquo;Nothing here yet!&rdquo; /{" "}
                        any exclamation mark.
                      </span>
                    </li>
                    <li className="flex items-baseline gap-3">
                      <span className="text-rose-500 mt-1.5">✕</span>
                      <span>
                        Marketing pitches (&ldquo;Atlas is great for...&rdquo;
                        is for the landing page).
                      </span>
                    </li>
                    <li className="flex items-baseline gap-3">
                      <span className="text-rose-500 mt-1.5">✕</span>
                      <span>
                        Multiple CTAs. One affordance per empty state — pick
                        the most likely next step.
                      </span>
                    </li>
                  </ul>
                </section>

                {/* Closing */}
                <p className="mt-16 text-base italic text-stone-500 leading-relaxed">
                  Empty states are the calmest moment in any product. Atlas
                  tries to make them feel intentional — not like
                  something&rsquo;s broken or you missed a step.
                </p>
              </article>

              {/* RIGHT RAIL */}
              <aside className="space-y-12">
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    On this page
                  </div>
                  <ol className="mt-5 space-y-2.5">
                    {TOC.map((item, i) => (
                      <li key={item.id}>
                        <a className="group flex items-baseline gap-3 text-sm cursor-pointer">
                          <span className="font-mono text-[10px] text-stone-400 w-5">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="text-stone-700 group-hover:text-stone-900">
                            {item.label}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </section>

                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Meta
                  </div>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-500">Section</span>
                      <span className="text-stone-700">Design system</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-500">Read time</span>
                      <span className="font-mono text-stone-700">~3 min</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-500">Audience</span>
                      <span className="text-stone-700">Designers · Engineers</span>
                    </li>
                  </ul>
                </section>

                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Related design-system pages
                  </div>
                  <ul className="mt-5 space-y-3">
                    <li className="group cursor-pointer">
                      <div className="text-sm text-stone-700 group-hover:text-stone-900">
                        Editorial register
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-stone-400">
                        design system · 8 min
                      </div>
                    </li>
                    <li className="group cursor-pointer">
                      <div className="text-sm text-stone-700 group-hover:text-stone-900">
                        Featured cards
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-stone-400">
                        design system · 4 min
                      </div>
                    </li>
                    <li className="group cursor-pointer">
                      <div className="text-sm text-stone-700 group-hover:text-stone-900">
                        Loading skeletons
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-stone-400">
                        design system · soon
                      </div>
                    </li>
                  </ul>
                </section>

                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    Source:{" "}
                    <a className="font-mono not-italic text-xs text-stone-700 hover:text-amber-600 cursor-pointer">
                      docs/design-system/empty-states.md
                    </a>
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant II · editorial empty states
        </div>
      </div>
    </>
  );
}

function Case({
  id,
  fig,
  where,
  when,
  small,
  children,
}: {
  id: string;
  fig: string;
  where: string;
  when: string;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-16">
      <div className="flex items-baseline gap-3">
        <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
          {where}
        </h2>
        <span className="font-mono text-[10px] text-stone-400 italic">
          {when}
        </span>
      </div>
      <figure className="mt-5">
        <div
          className={`rounded-2xl border border-stone-200 bg-white p-8 ${
            small ? "" : "min-h-[200px]"
          } flex flex-col justify-center`}
        >
          {children}
        </div>
        <figcaption className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest italic text-stone-400">
          {fig} — what users actually see
        </figcaption>
      </figure>
    </section>
  );
}
