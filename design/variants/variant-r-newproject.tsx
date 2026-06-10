// THROWAWAY — Editorial New Project intake prototype.
// Two-path entry: ingest existing repo OR greenfield from scratch.

import { NAV } from "./mock-data";

const RECENT_INGESTS = [
  { name: "acme-website", when: "2 weeks ago" },
  { name: "atlas-internal", when: "1 month ago" },
  { name: "side-experiment", when: "3 months ago" },
];

export function VariantRNewProject() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          {/* SIDEBAR — P active */}
          <aside className="w-[56px] shrink-0 sticky top-0 h-screen self-start flex flex-col items-center justify-between py-8 border-r border-stone-200/60 z-10">
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none">a</div>
            </div>
            <nav className="flex flex-col items-center gap-5">
              {NAV.map((n) => {
                const initial = n.short.charAt(0);
                const isActive = n.key === "projects";
                return (
                  <a
                    key={n.key}
                    className={`relative h-7 w-7 flex items-center justify-center cursor-pointer transition group ${
                      isActive ? "text-stone-900" : "text-stone-400 hover:text-stone-900"
                    }`}
                  >
                    <span className={`text-base ${isActive ? "font-semibold" : "font-medium"}`}>
                      {initial}
                    </span>
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-3 bg-amber-500" />
                    )}
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
            <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
              Projects · New
            </div>

            <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
              {/* MAIN COL */}
              <div className="max-w-2xl">
                {/* Hero */}
                <h1 className="text-5xl font-bold tracking-tighter">Add a Project.</h1>
                <p className="mt-4 text-lg text-stone-700 leading-relaxed">
                  Atlas can take over an existing codebase, or help you build
                  something new from scratch.
                </p>

                {/* PATH 1 — Ingest existing */}
                <section className="mt-20 pb-16 border-b border-stone-200">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      01
                    </span>
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Ingest an existing repo
                    </h2>
                  </div>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    Already have a codebase? Paste its URL. The Engine reads it,
                    generates a{" "}
                    <span className="font-mono text-sm text-stone-600">CONTEXT.md</span>{" "}
                    document, scans for smells, and is ready to take Tickets in about
                    three minutes.
                  </p>
                  <div className="mt-8 space-y-7">
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        Repository URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://github.com/your-org/your-repo"
                        className="mt-2 w-full bg-transparent border-b border-stone-300 py-2 text-base font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition"
                      />
                    </div>
                  </div>
                  <div className="mt-8 flex items-center gap-4">
                    <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-5 py-3 rounded-full shadow-sm inline-flex items-center gap-2">
                      Connect repository
                      <span className="text-stone-400">→</span>
                    </button>
                    <span className="italic font-sans text-sm text-stone-500">
                      atlas needs read &amp; PR-create access · we&rsquo;ll show the
                      exact scopes
                    </span>
                  </div>
                </section>

                {/* PATH 2 — Greenfield */}
                <section className="mt-16">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      02
                    </span>
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Start from scratch
                    </h2>
                    <span className="ml-3 font-mono text-[10px] uppercase tracking-widest text-amber-700">
                      v1.4
                    </span>
                  </div>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    Have an idea but no code yet? Tell Atlas what you want to build.
                    The Engine will run a{" "}
                    <span className="italic">grill-me session</span> to sharpen the
                    idea into a working brief, then scaffold the initial codebase
                    with you.
                  </p>

                  {/* Pull-quote-style example */}
                  <div className="relative mt-8 pl-6">
                    <span className="absolute -left-1 -top-2 font-bold text-4xl text-amber-400/80 leading-none select-none">
                      &ldquo;
                    </span>
                    <p className="text-base italic text-stone-600 leading-relaxed">
                      Want to build: a quiet weather app that just shows today and
                      tomorrow. No ads. No charts. Stone palette. Geist font.
                      Deployable to Vercel. Should remember my last location.
                    </p>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      what one of these prompts looks like
                    </div>
                  </div>

                  <div className="mt-8 space-y-7">
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        Tell Atlas what you want to build
                      </label>
                      <textarea
                        rows={4}
                        placeholder="One paragraph is enough — be specific about the feel you want, not just the features."
                        className="mt-2 w-full bg-transparent border-b border-stone-300 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition resize-none"
                      />
                    </div>
                  </div>
                  <div className="mt-8 flex items-center gap-4">
                    <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-5 py-3 rounded-full shadow-sm inline-flex items-center gap-2">
                      Begin grill
                      <span className="text-stone-400">→</span>
                    </button>
                    <span className="italic font-sans text-sm text-stone-500">
                      ~15 minutes of back-and-forth · then your codebase exists
                    </span>
                  </div>

                  {/* v1.4 callout */}
                  <p className="mt-10 text-sm italic text-stone-500 leading-relaxed">
                    Greenfield lands in v1.4. For now, ingest something you&rsquo;ve
                    already started.
                  </p>
                </section>
              </div>

              {/* RIGHT RAIL */}
              <aside className="space-y-14">
                {/* What to expect */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    What to expect
                  </div>
                  <ol className="mt-5 space-y-4 text-sm text-stone-700 leading-relaxed">
                    <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                      <span className="font-mono text-xs text-stone-400">01</span>
                      <div>
                        Atlas connects to the repo and reads it. ~2 minutes for
                        small codebases.
                      </div>
                    </li>
                    <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                      <span className="font-mono text-xs text-stone-400">02</span>
                      <div>
                        The Engine writes an{" "}
                        <span className="font-mono text-xs text-stone-600">
                          Ingest summary
                        </span>{" "}
                        with stack, architecture, and smells.
                      </div>
                    </li>
                    <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                      <span className="font-mono text-xs text-stone-400">03</span>
                      <div>
                        You review · edit{" "}
                        <span className="font-mono text-xs text-stone-600">
                          CONTEXT.md
                        </span>{" "}
                        · invite Collaborators · file the first Ticket.
                      </div>
                    </li>
                  </ol>
                </section>

                {/* Recent ingests */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Your projects
                  </div>
                  <ul className="mt-5 divide-y divide-stone-200">
                    {RECENT_INGESTS.map((p) => (
                      <li
                        key={p.name}
                        className="py-3 flex items-baseline justify-between group cursor-pointer"
                      >
                        <span className="font-mono text-sm text-stone-700 group-hover:text-stone-900">
                          {p.name}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          {p.when}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Trust card — featured */}
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    What Atlas can&rsquo;t see
                  </div>
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                    Your code stays on{" "}
                    <span className="font-mono text-stone-900">your Bridge</span>.
                    Atlas only ever holds Brief text, Result summaries, and
                    heartbeats.
                  </p>
                  <a className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    Why your code stays yours ↗
                  </a>
                </section>

                {/* Help footer */}
                <section className="pt-4 border-t border-stone-200/80">
                  <ul className="text-sm space-y-2">
                    <li className="flex items-baseline justify-between group cursor-pointer">
                      <span className="text-stone-700 group-hover:text-stone-900">
                        Docs: getting started
                      </span>
                      <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                        →
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between group cursor-pointer">
                      <span className="text-stone-700 group-hover:text-stone-900">
                        Talk to a human
                      </span>
                      <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                        ↗
                      </span>
                    </li>
                  </ul>
                </section>
              </aside>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant R · editorial new project
        </div>
      </div>
    </>
  );
}
