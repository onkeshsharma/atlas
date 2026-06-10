// THROWAWAY — Editorial Changelog prototype.
// Public release-notes page (atlas.com/changelog). Editorial reading flow.

type Release = {
  version: string;
  date: string;
  title: string;
  intro?: string;
  shipped?: string[];
  fixed?: string[];
  deprecated?: string[];
  current?: boolean;
};

const RELEASES: Release[] = [
  {
    version: "v1.3.0",
    date: "shipped May 13, 2026",
    title: "The Design Pass.",
    current: true,
    intro:
      "Forty design slices that took Atlas from functionally-A-minus visually-C-plus to a coherent editorial register across every surface. Nothing new under the hood — but everything looks different.",
    shipped: [
      "Persistent left-rail sidebar (T70)",
      "Feed-first dashboard with pinned-projects strip (T71)",
      "Editorial Kanban with Ship Group clusters (T56b · T73 · T74 · T75)",
      "Ticket detail asymmetric layout with metadata rail (T76)",
      "Settings 2-pane sub-nav (T78)",
      "Triage inbox redesign (T60)",
      "Editorial register applied across every surface",
    ],
    fixed: [
      "Kanban 5th column no longer clipped at 1280px",
      "Filter chips now have a clear active state",
    ],
  },
  {
    version: "v1.2.0",
    date: "shipped May 12, 2026",
    title: "Kanban + Sequence Hints.",
    intro:
      "Forty functional slices: a proper Kanban with 5 categories, AI-derived Sequence Hints (parallel-safe / blocked-by) on Tickets, two-phase Brief drafting, live UI via SSE on five surfaces, and more.",
    shipped: [
      "Kanban board with Triage / Backlog / Active / Review / Closed",
      "Sequence Hints + Ship Groups (T39 · T40 · T59)",
      "Two-phase Brief drafting (T48)",
      "Per-Project CONTEXT.md viewer + editor (T49)",
      "Live SSE updates across 5 surfaces (T41–T45)",
      "System-following dark mode — then disabled in the final hotfix",
    ],
    fixed: [
      "Bridge offline banner no longer flashes during initial load",
      "Ticket reporter visible on list view",
    ],
    deprecated: ["Dark mode dropped permanently (Onkesh's call · 2026-05-13)"],
  },
  {
    version: "v1.1.0",
    date: "shipped May 11, 2026",
    title: "Conflict handling Tier 0.",
    intro:
      "Pre-Ship-it mergeable probe and 'send back to Engine with conflict context' affordance. Bridge `doctor` preflight on every Job.",
    shipped: [
      "Pre-Ship-it mergeable probe (T37)",
      "Send back to Engine with conflict context (T38)",
      "Bridge doctor + single-instance lock (T30)",
      "Bridge refresh-master per Job (T31)",
    ],
  },
  {
    version: "v1.0.0",
    date: "shipped April 28, 2026",
    title: "Atlas v1.",
    intro:
      "The first version we'd let strangers touch. Ingest existing repos, file Tickets in plain language, dispatch the Engine on your Bridge, ship a PR. Solo-Owner workflow only — Collaborators came in v1.1.",
    shipped: [
      "Ingest existing GitHub repos",
      "Tickets + Brief drafting + Engine dispatch",
      "Bridge daemon + Claude Code authorization",
      "Owner-only review flow",
      "Ship Notification emails via Resend",
    ],
  },
];

export function VariantNNChangelog() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          Atlas · changelog
        </div>
        <div className="absolute top-8 right-8 flex items-center gap-5 font-mono text-xs uppercase tracking-widest text-stone-500">
          <a className="hover:text-stone-900 cursor-pointer">Docs</a>
          <a className="hover:text-stone-900 cursor-pointer">Status ↗</a>
          <a className="hover:text-stone-900 cursor-pointer">Atlas →</a>
        </div>

        <main className="min-h-screen pt-28 pb-24 px-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
              Atlas · what shipped, when
            </div>
            <h1 className="mt-4 text-6xl font-bold tracking-tighter leading-[0.95]">
              What we shipped.
            </h1>
            <p className="mt-7 text-2xl tracking-tight text-stone-700 leading-tight max-w-2xl">
              Atlas ships in versioned drops. Each one is small enough to read
              in a coffee. No marketing-speak — just what changed and why.
            </p>

            {/* Subscribe quiet */}
            <div className="mt-7 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
              <span className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                {RELEASES.length} releases
              </span>
              <span className="text-stone-300">·</span>
              <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                RSS ↗
              </a>
              <span className="text-stone-300">·</span>
              <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                email me when something ships ↗
              </a>
            </div>

            {/* Releases */}
            <div className="mt-20 space-y-20">
              {RELEASES.map((rel) => (
                <article
                  key={rel.version}
                  className="grid grid-cols-[120px_1fr] gap-10 items-baseline"
                >
                  {/* Left column — version anchor */}
                  <div>
                    <div className="font-mono text-sm font-medium text-stone-900">
                      {rel.version}
                    </div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      {rel.date}
                    </div>
                    {rel.current && (
                      <div className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </span>
                        current
                      </div>
                    )}
                  </div>

                  {/* Right column — release content */}
                  <div>
                    <h2 className="text-3xl font-bold tracking-tighter leading-tight">
                      {rel.title}
                    </h2>
                    {rel.intro && (
                      <p className="mt-4 text-base text-stone-700 leading-relaxed">
                        {rel.intro}
                      </p>
                    )}

                    {rel.shipped && (
                      <div className="mt-8">
                        <div className="text-xs font-mono uppercase tracking-[0.25em] text-emerald-700">
                          Shipped
                        </div>
                        <ul className="mt-3 space-y-2">
                          {rel.shipped.map((item, i) => (
                            <li
                              key={i}
                              className="grid grid-cols-[16px_1fr] gap-3 items-baseline text-base text-stone-700 leading-relaxed"
                            >
                              <span className="text-emerald-500 mt-1.5">●</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rel.fixed && (
                      <div className="mt-7">
                        <div className="text-xs font-mono uppercase tracking-[0.25em] text-amber-700">
                          Fixed
                        </div>
                        <ul className="mt-3 space-y-2">
                          {rel.fixed.map((item, i) => (
                            <li
                              key={i}
                              className="grid grid-cols-[16px_1fr] gap-3 items-baseline text-base text-stone-700 leading-relaxed"
                            >
                              <span className="text-amber-500 mt-1.5">●</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rel.deprecated && (
                      <div className="mt-7">
                        <div className="text-xs font-mono uppercase tracking-[0.25em] text-rose-700">
                          Deprecated
                        </div>
                        <ul className="mt-3 space-y-2">
                          {rel.deprecated.map((item, i) => (
                            <li
                              key={i}
                              className="grid grid-cols-[16px_1fr] gap-3 items-baseline text-base text-stone-700 leading-relaxed"
                            >
                              <span className="text-rose-500 mt-1.5">●</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-7 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                        diff from previous ↗
                      </a>
                      <span className="text-stone-300">·</span>
                      <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                        permalink
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Footer */}
            <p className="mt-20 text-sm italic text-stone-500 leading-relaxed">
              Older releases (v0.x) and pre-launch beta drops are archived at{" "}
              <a className="font-mono text-stone-700 hover:text-amber-600 cursor-pointer not-italic text-xs">
                atlas.com/changelog/archive
              </a>
              .
            </p>
          </div>
        </main>

        <div className="absolute bottom-8 left-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant NN · editorial changelog
        </div>
      </div>
    </>
  );
}
