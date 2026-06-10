// THROWAWAY — Editorial Documentation index prototype.
// The destination for every `↗ docs` link scattered across the prototype.

import { NAV } from "./mock-data";

type DocsSection = {
  label: string;
  intro?: string;
  articles: Array<{ title: string; sub?: string; popular?: boolean; updated?: string }>;
};

const SECTIONS: DocsSection[] = [
  {
    label: "Getting started",
    intro: "Read these first. About 20 minutes total.",
    articles: [
      { title: "Welcome to Atlas", sub: "What it is, what it isn't", popular: true },
      { title: "Install your Bridge", sub: "Bridge binary + Claude Code auth", popular: true },
      { title: "Ingest your first repo", sub: "Connecting an existing codebase" },
      { title: "File your first Ticket", sub: "What good Tickets look like" },
      { title: "The Triage queue", sub: "How dispatched work flows" },
    ],
  },
  {
    label: "Concepts",
    intro: "The vocabulary the Engine reads from your CONTEXT.md.",
    articles: [
      { title: "Owner", sub: "The sole human reviewer" },
      { title: "Collaborator", sub: "Non-technical Project member" },
      { title: "Atlas Bridge", sub: "The daemon on your machine" },
      { title: "Brief vs. Ticket", sub: "What gets dispatched, what gets filed" },
      { title: "Sequence Hints & Ship Groups", sub: "How parallel work gets coordinated" },
      { title: "Job lifecycle", sub: "Queued → Running → Shipped or Failed", updated: "2 days ago" },
    ],
  },
  {
    label: "For Collaborators",
    intro: "The Collaborator side of Atlas — what you see, what you can do.",
    articles: [
      { title: "What you can see, what you can&rsquo;t", sub: "Code privacy, your own Tickets, shipped summaries", popular: true },
      { title: "How to file a good Ticket", sub: "Tell the story, not the solution" },
      { title: "Replying to the Owner", sub: "When they need more info from you" },
      { title: "When something ships", sub: "Reading the verification note" },
    ],
  },
  {
    label: "Settings",
    articles: [
      { title: "Preferences", sub: "Project sort, Kanban density, pinned projects" },
      { title: "Bridges & token rotation", sub: "Registering, revoking, the doctor" },
      { title: "Account & two-factor", sub: "Email, password, recovery codes" },
      { title: "Notifications & quiet hours", sub: "Tuning what reaches you" },
    ],
  },
  {
    label: "Troubleshooting",
    intro: "When something doesn't behave.",
    articles: [
      { title: "My Bridge is offline", sub: "Most common cause: laptop sleep", popular: true },
      { title: "Conflict on merge", sub: "What 'Send back to Engine' does" },
      { title: "Engine timed out", sub: "Long-running Jobs and what to do" },
      { title: "Recovering a closed Ticket", sub: "Reopening + when you can't" },
    ],
  },
  {
    label: "API & CLI",
    intro: "For people who want to script Atlas. Read-only for now.",
    articles: [
      { title: "atlas-bridge CLI reference", sub: "Every command, flags, examples", updated: "yesterday" },
      { title: "HTTP API (read-only)", sub: "Endpoints, auth, rate limits" },
      { title: "Webhooks", sub: "Ship Notification, Bridge offline, ticket-state-changed" },
    ],
  },
];

export function VariantEEDocs() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          {/* SIDEBAR — nothing active; docs is its own surface */}
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
            {/* Top */}
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Docs
              </div>
              <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                Ask a human ↗
              </a>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
              {/* MAIN COL */}
              <div className="max-w-2xl">
                {/* Hero */}
                <h1 className="text-5xl font-bold tracking-tighter">
                  Atlas, explained.
                </h1>
                <p className="mt-4 text-lg text-stone-700 leading-relaxed">
                  A short pile of pages that cover almost everything. The ones you
                  actually need are probably the first five — start with{" "}
                  <a className="text-amber-600 hover:underline cursor-pointer">
                    Welcome to Atlas
                  </a>
                  .
                </p>

                {/* Sections */}
                <div className="mt-16 space-y-16">
                  {SECTIONS.map((sec) => (
                    <section key={sec.label}>
                      <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                        <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                          {sec.label}
                        </h2>
                        <span className="font-mono text-xs text-stone-400">
                          {sec.articles.length} pages
                        </span>
                      </div>
                      {sec.intro && (
                        <p className="mt-4 text-base italic text-stone-500 leading-relaxed">
                          {sec.intro}
                        </p>
                      )}
                      <ol className="mt-5 divide-y divide-stone-200">
                        {sec.articles.map((article, i) => (
                          <li
                            key={article.title}
                            className="py-4 grid grid-cols-[40px_1fr_auto] items-baseline gap-6 group cursor-pointer"
                          >
                            <span className="font-mono text-xs text-stone-400">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-base font-medium text-stone-900 group-hover:text-stone-700">
                                  {article.title}
                                </span>
                                {article.popular && (
                                  <span className="font-mono text-[9px] uppercase tracking-widest text-amber-700">
                                    popular
                                  </span>
                                )}
                                {article.updated && (
                                  <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-700">
                                    updated {article.updated}
                                  </span>
                                )}
                              </div>
                              {article.sub && (
                                <div className="mt-1 text-sm text-stone-500 leading-relaxed">
                                  {article.sub}
                                </div>
                              )}
                            </div>
                            <span className="font-mono text-xs text-stone-400 group-hover:text-amber-600 transition whitespace-nowrap">
                              →
                            </span>
                          </li>
                        ))}
                      </ol>
                    </section>
                  ))}
                </div>

                {/* Closing line */}
                <p className="mt-20 text-base italic text-stone-500 leading-relaxed">
                  Most of these are short. If a page took longer than 5 minutes to
                  read, we wrote it badly — please{" "}
                  <a className="text-amber-600 hover:underline cursor-pointer">
                    tell us
                  </a>
                  .
                </p>
              </div>

              {/* RIGHT RAIL */}
              <aside className="space-y-14">
                {/* Search */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Search docs
                  </div>
                  <div className="mt-5 flex items-center gap-3 border-b border-stone-300 pb-2 focus-within:border-stone-900 transition">
                    <span className="font-mono text-stone-400">⌕</span>
                    <input
                      type="text"
                      placeholder="bridge offline, conflict, brief..."
                      className="flex-1 bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
                    />
                  </div>
                  <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    or open the command palette ·{" "}
                    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded font-mono text-[10px] uppercase bg-stone-100 text-stone-700 border border-stone-200">
                      Ctrl
                    </kbd>{" "}
                    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded font-mono text-[10px] uppercase bg-stone-100 text-stone-700 border border-stone-200">
                      K
                    </kbd>
                  </div>
                </section>

                {/* Popular this week */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Most read this week
                  </div>
                  <ol className="mt-5 space-y-3">
                    <li className="group cursor-pointer">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-stone-700 group-hover:text-stone-900">
                          My Bridge is offline
                        </span>
                        <span className="font-mono text-[10px] text-stone-400">
                          247 reads
                        </span>
                      </div>
                    </li>
                    <li className="group cursor-pointer">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-stone-700 group-hover:text-stone-900">
                          Install your Bridge
                        </span>
                        <span className="font-mono text-[10px] text-stone-400">
                          189 reads
                        </span>
                      </div>
                    </li>
                    <li className="group cursor-pointer">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-stone-700 group-hover:text-stone-900">
                          How to file a good Ticket
                        </span>
                        <span className="font-mono text-[10px] text-stone-400">
                          112 reads
                        </span>
                      </div>
                    </li>
                    <li className="group cursor-pointer">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-stone-700 group-hover:text-stone-900">
                          What you can see, what you can&rsquo;t
                        </span>
                        <span className="font-mono text-[10px] text-stone-400">
                          88 reads
                        </span>
                      </div>
                    </li>
                  </ol>
                </section>

                {/* Recently updated */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Recently updated
                  </div>
                  <ul className="mt-5 space-y-3 text-sm">
                    <li className="flex items-baseline justify-between group cursor-pointer">
                      <span className="text-stone-700 group-hover:text-stone-900">
                        atlas-bridge CLI reference
                      </span>
                      <span className="font-mono text-[10px] text-stone-400">
                        yesterday
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between group cursor-pointer">
                      <span className="text-stone-700 group-hover:text-stone-900">
                        Job lifecycle
                      </span>
                      <span className="font-mono text-[10px] text-stone-400">
                        2 days ago
                      </span>
                    </li>
                  </ul>
                </section>

                {/* Ask a human card — featured */}
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Can&rsquo;t find it?
                  </div>
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                    Send a question. Atlas is small — Onkesh usually replies within
                    a working day.
                  </p>
                  <button className="mt-5 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3 rounded-full shadow-sm">
                    Ask a human →
                  </button>
                  <a className="mt-3 block text-center font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:underline cursor-pointer">
                    or file a Ticket about the docs ↗
                  </a>
                </section>

                {/* Footer */}
                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    Atlas&rsquo;s docs live in{" "}
                    <a className="text-stone-700 hover:text-amber-600 cursor-pointer font-mono not-italic text-xs">
                      atlas/docs
                    </a>{" "}
                    on GitHub. PRs welcome.
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant EE · editorial docs
        </div>
      </div>
    </>
  );
}
