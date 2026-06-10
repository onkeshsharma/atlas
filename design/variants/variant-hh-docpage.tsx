// THROWAWAY — Editorial Doc Article prototype.
// What one of the EE docs index articles looks like when opened.

import { NAV } from "./mock-data";

const TOC = [
  { id: "what-it-is", label: "What it is" },
  { id: "what-it-isnt", label: "What it isn't" },
  { id: "who-runs-it", label: "Who runs it" },
  { id: "where-engine-runs", label: "Where the Engine runs" },
  { id: "what-it-costs", label: "What it costs" },
  { id: "next", label: "Where to go next" },
];

export function VariantHHDocPage() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          {/* SIDEBAR */}
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
                    {n.badge !== undefined && (
                      <span className="absolute -top-1 -right-1 font-mono text-[9px] leading-none text-stone-600 bg-amber-50 px-0.5">
                        {n.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
            <div className="relative group">
              <div className="relative h-6 w-6 flex items-center justify-center cursor-pointer">
                <div className="text-xl font-bold tracking-tighter leading-none text-stone-900 group-hover:text-amber-600 transition">
                  o
                </div>
                <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </aside>

          {/* MAIN */}
          <main className="flex-1 px-16 pt-8 pb-24">
            {/* Top breadcrumb */}
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Docs · Getting started · Welcome to Atlas
              </div>
              <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                edit this page ↗
              </a>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_280px] gap-16">
              {/* MAIN COL — long-form article */}
              <article className="max-w-2xl">
                {/* Article header */}
                <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
                  Getting started · ~3 min read · updated 2 weeks ago
                </div>
                <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
                  Welcome to Atlas.
                </h1>
                <p className="mt-5 text-xl text-stone-700 leading-relaxed">
                  Atlas is a friendly portal that lets non-technical people drive
                  software changes — without ever opening a CLI. This page is
                  five minutes of context before you install anything.
                </p>

                {/* Section: What it is */}
                <section id="what-it-is" className="mt-16">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    What it is
                  </h2>
                  <div className="mt-5 space-y-4 text-base text-stone-700 leading-relaxed">
                    <p>
                      Atlas wraps Claude Code in a familiar Tickets-and-Kanban
                      shape. Anyone you invite can file{" "}
                      <span className="italic">&ldquo;please fix this&rdquo;</span>{" "}
                      in plain language; you (the Owner) review what Atlas&rsquo;s
                      Engine produces; the merged change lands as a Pull
                      Request.
                    </p>
                    <p>
                      The point is to make &ldquo;ask an AI to fix it&rdquo; feel
                      like &ldquo;ask Onkesh to fix it&rdquo; — the friction is
                      the same. No prompts, no Claude Code UI, no JSON, no diff
                      review for people who don&rsquo;t want one.
                    </p>
                  </div>
                </section>

                {/* Section: What it isn't */}
                <section id="what-it-isnt" className="mt-16">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    What it isn&rsquo;t
                  </h2>
                  <div className="mt-5 space-y-4 text-base text-stone-700 leading-relaxed">
                    <p>
                      Atlas isn&rsquo;t a no-code tool. The Engine writes code,
                      using the same patterns you&rsquo;d use in Claude Code
                      directly. A real Owner is still required.
                    </p>
                    <p>
                      It also isn&rsquo;t a project-management tool. Tickets are
                      a means to dispatch work to the Engine — they aren&rsquo;t
                      sprints, story points, burndown charts, or epics.
                    </p>
                  </div>
                </section>

                {/* Pull-quote moment */}
                <div className="relative mt-16 pl-7">
                  <span className="absolute -left-2 -top-3 font-bold text-5xl text-amber-400/80 leading-none select-none">
                    &ldquo;
                  </span>
                  <p className="text-2xl italic text-stone-800 leading-tight tracking-tight">
                    The point is to make &ldquo;ask an AI&rdquo; feel like
                    &ldquo;ask a colleague.&rdquo;
                  </p>
                </div>

                {/* Section: Who runs it */}
                <section id="who-runs-it" className="mt-16">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Who runs it
                  </h2>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    Each Atlas Project has exactly one{" "}
                    <span className="font-semibold text-stone-900">Owner</span>
                    {" "}(you) and any number of{" "}
                    <span className="font-semibold text-stone-900">Collaborators</span>
                    {" "}(the people you invite). The Owner reviews everything the
                    Engine produces and approves what ships. Collaborators file
                    Tickets and see plain-language updates when those Tickets
                    ship.
                  </p>
                </section>

                {/* Section: Where Engine runs */}
                <section id="where-engine-runs" className="mt-16">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Where the Engine runs
                  </h2>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    Not in Atlas&rsquo;s cloud. The Engine runs on{" "}
                    <em>your computer</em>, through a small daemon called the{" "}
                    <span className="font-semibold text-stone-900">Bridge</span>.
                    Atlas dispatches Jobs to your Bridge; the Bridge spawns the
                    Engine; the Engine produces a Pull Request locally; the
                    Bridge sends back the diff URL and a summary. Atlas never
                    holds your code.
                  </p>
                  <div className="mt-7 rounded-2xl border border-stone-200 bg-white p-6">
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-stone-500 mb-4">
                      The path
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <Box label="Collaborator" sub="files a Ticket" />
                      <Arrow />
                      <Box label="Atlas" sub="shapes a Brief" active />
                      <Arrow />
                      <Box label="Bridge" sub="on your laptop" />
                      <Arrow />
                      <Box label="Engine" sub="writes code · opens PR" />
                    </div>
                    <div className="mt-5 text-center font-mono text-[10px] uppercase tracking-widest italic text-stone-400">
                      Fig. 1 — the dispatch path
                    </div>
                  </div>
                </section>

                {/* Section: What it costs */}
                <section id="what-it-costs" className="mt-16">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    What it costs
                  </h2>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    Atlas Free covers solo Owners running up to 3 Projects with
                    5 Collaborators each. Engine compute is on{" "}
                    <span className="font-semibold text-stone-900">
                      your Claude Code account
                    </span>{" "}
                    — Atlas itself doesn&rsquo;t charge per-Ticket. See{" "}
                    <a className="text-amber-600 hover:underline cursor-pointer">
                      Pricing
                    </a>{" "}
                    for the Pro tier.
                  </p>
                </section>

                {/* Next steps */}
                <section id="next" className="mt-16 pt-12 border-t border-stone-200">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Where to go next
                  </h2>
                  <ul className="mt-5 divide-y divide-stone-200">
                    <li className="py-4 grid grid-cols-[40px_1fr_auto] items-baseline gap-6 group cursor-pointer">
                      <span className="font-mono text-xs text-stone-400">→</span>
                      <span>
                        <span className="block text-base font-medium text-stone-900">
                          Install your Bridge
                        </span>
                        <span className="mt-1 block text-sm text-stone-500">
                          The literal first thing you do as a new Owner.
                        </span>
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                        next →
                      </span>
                    </li>
                    <li className="py-4 grid grid-cols-[40px_1fr_auto] items-baseline gap-6 group cursor-pointer">
                      <span className="font-mono text-xs text-stone-400">→</span>
                      <span>
                        <span className="block text-base font-medium text-stone-900">
                          Ingest your first repo
                        </span>
                        <span className="mt-1 block text-sm text-stone-500">
                          Pointing Atlas at a codebase you already have.
                        </span>
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                        →
                      </span>
                    </li>
                  </ul>
                </section>

                {/* Feedback footer */}
                <section className="mt-16 pt-8 border-t border-stone-200/80">
                  <div className="flex items-baseline justify-between gap-6">
                    <p className="text-sm italic text-stone-500 leading-relaxed">
                      Was this page useful? Atlas&rsquo;s docs improve only when
                      you tell us when they don&rsquo;t land.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-emerald-600 cursor-pointer">
                        useful
                      </button>
                      <span className="text-stone-300">·</span>
                      <button className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-rose-600 cursor-pointer">
                        not really
                      </button>
                    </div>
                  </div>
                </section>
              </article>

              {/* RIGHT RAIL — table of contents + meta */}
              <aside className="space-y-12">
                {/* On this page */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    On this page
                  </div>
                  <ol className="mt-5 space-y-2.5">
                    {TOC.map((item, i) => (
                      <li key={item.id}>
                        <a
                          className={`group flex items-baseline gap-3 text-sm cursor-pointer ${
                            i === 0 ? "text-stone-900" : ""
                          }`}
                        >
                          <span className="font-mono text-[10px] text-stone-400 w-5">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={
                              i === 0
                                ? "text-stone-900 font-semibold"
                                : "text-stone-700 hover:text-stone-900"
                            }
                          >
                            {item.label}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </section>

                {/* Meta */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Meta
                  </div>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-500">Section</span>
                      <span className="text-stone-700">Getting started</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-500">Read time</span>
                      <span className="font-mono text-stone-700">~3 min</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-500">Updated</span>
                      <span className="font-mono text-stone-700">2w ago</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-500">Audience</span>
                      <span className="text-stone-700">Owner</span>
                    </li>
                  </ul>
                </section>

                {/* Related */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Related
                  </div>
                  <ul className="mt-5 space-y-3">
                    <li className="group cursor-pointer">
                      <div className="text-sm text-stone-700 group-hover:text-stone-900">
                        Install your Bridge
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-stone-400">
                        getting started · 4 min
                      </div>
                    </li>
                    <li className="group cursor-pointer">
                      <div className="text-sm text-stone-700 group-hover:text-stone-900">
                        Where the Engine runs
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-stone-400">
                        concepts · 2 min
                      </div>
                    </li>
                    <li className="group cursor-pointer">
                      <div className="text-sm text-stone-700 group-hover:text-stone-900">
                        Owner vs Collaborator
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-stone-400">
                        concepts · 3 min
                      </div>
                    </li>
                  </ul>
                </section>

                {/* Source */}
                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    Source:{" "}
                    <a className="font-mono not-italic text-xs text-stone-700 hover:text-amber-600 cursor-pointer">
                      docs/welcome.md
                    </a>
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant HH · editorial doc page
        </div>
      </div>
    </>
  );
}

function Box({ label, sub, active }: { label: string; sub: string; active?: boolean }) {
  return (
    <div
      className={`px-3 py-2 border rounded-md min-w-[110px] text-center ${
        active
          ? "border-amber-400 bg-amber-50"
          : "border-stone-300"
      }`}
    >
      <div className="text-sm font-semibold text-stone-900">{label}</div>
      <div className="mt-0.5 font-mono text-[9px] text-stone-500">{sub}</div>
    </div>
  );
}

function Arrow() {
  return <span className="font-mono text-stone-400">→</span>;
}
