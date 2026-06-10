// THROWAWAY — Editorial Collaborator Tickets view prototype.
// The audience-aware simplified view: plain-English states, no technical chrome,
// no Kanban grid. Just "what I filed" + "what shipped that affects me".

import { NAV } from "./mock-data";

type CollabState =
  | "triage"
  | "needs-info"
  | "backlog"
  | "in-progress"
  | "review-ready"
  | "shipped"
  | "failed";

type CollabTicket = {
  id: string;
  title: string;
  state: CollabState;
  filedAt: string;
  movedAt: string;
  ownerNote?: string;
  verifyUrl?: string;
};

const TICKETS: CollabTicket[] = [
  {
    id: "T-301",
    title: "Add CSV export to ticket list",
    state: "in-progress",
    filedAt: "2 hours ago",
    movedAt: "1 hour ago",
  },
  {
    id: "T-302",
    title: "Onboarding screenshots are stale",
    state: "review-ready",
    filedAt: "5 hours ago",
    movedAt: "20 minutes ago",
  },
  {
    id: "T-249",
    title: "Add JSON export endpoint",
    state: "shipped",
    filedAt: "3 days ago",
    movedAt: "2 days ago",
    ownerNote: "Try downloading the ticket list and you'll see a new 'JSON' option.",
    verifyUrl: "/projects/acme/tickets",
  },
  {
    id: "T-247",
    title: "Buttons look off on iPad portrait mode",
    state: "needs-info",
    filedAt: "4 days ago",
    movedAt: "2 days ago",
    ownerNote: "Could you share a screenshot? I'm trying to repro on an iPad mini.",
  },
  {
    id: "T-204",
    title: "Fix typo in checkout — 'preocceed'",
    state: "shipped",
    filedAt: "1 month ago",
    movedAt: "1 month ago",
    ownerNote: "Fixed in the checkout flow. Should now read 'proceed'.",
    verifyUrl: "/projects/acme/checkout",
  },
  {
    id: "T-180",
    title: "Slow first paint on slow phones",
    state: "backlog",
    filedAt: "2 months ago",
    movedAt: "1 month ago",
  },
];

function stateLabel(s: CollabState): string {
  if (s === "triage") return "Atlas is reviewing this";
  if (s === "needs-info") return "Owner asked you a question";
  if (s === "backlog") return "On the backlog";
  if (s === "in-progress") return "Engine is working on it";
  if (s === "review-ready") return "Almost done — Owner is checking";
  if (s === "shipped") return "Shipped";
  return "Hit a snag — Owner is figuring it out";
}

function stateDot(s: CollabState): string {
  if (s === "shipped") return "bg-emerald-500";
  if (s === "failed") return "bg-rose-500";
  if (s === "review-ready") return "bg-amber-500";
  if (s === "in-progress") return "bg-amber-400";
  if (s === "needs-info") return "bg-sky-400";
  if (s === "backlog") return "bg-stone-400";
  return "bg-stone-300";
}

function isOpen(s: CollabState): boolean {
  return s !== "shipped";
}

export function VariantTCollab() {
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
            {/* Top breadcrumb + file ticket CTA */}
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Projects · acme-website · My tickets
              </div>
              <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-2 rounded-full shadow-sm inline-flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                File a Ticket
                <span className="text-stone-400">+</span>
              </button>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
              {/* MAIN COL */}
              <div className="max-w-2xl">
                {/* Hero */}
                <div className="flex items-baseline gap-6 flex-wrap">
                  <h1 className="text-5xl font-bold tracking-tighter">
                    What you&rsquo;ve filed.
                  </h1>
                  <p className="text-base text-stone-500">
                    <span className="font-mono text-stone-900">
                      {TICKETS.filter((t) => isOpen(t.state)).length}
                    </span>{" "}
                    open ·{" "}
                    <span className="font-mono text-emerald-600">
                      {TICKETS.filter((t) => t.state === "shipped").length}
                    </span>{" "}
                    shipped ·{" "}
                    <span className="font-mono text-sky-600">
                      {TICKETS.filter((t) => t.state === "needs-info").length}
                    </span>{" "}
                    waiting on you
                  </p>
                </div>

                {/* Filter chips */}
                <div className="mt-8 flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                    Show
                  </span>
                  <FilterChip label="Everything" active />
                  <FilterChip label="Still open" />
                  <FilterChip label="Shipped" />
                  <FilterChip label="Waiting on me" badge="1" sky />
                </div>

                {/* Tickets list */}
                <section className="mt-12">
                  <ol className="divide-y divide-stone-200">
                    {TICKETS.map((t) => (
                      <li
                        key={t.id}
                        className="py-6 group cursor-pointer"
                      >
                        <div className="grid grid-cols-[1fr_auto] items-baseline gap-6">
                          <div>
                            {/* Title */}
                            <div className="flex items-baseline gap-2.5">
                              <span
                                className={`inline-block h-1.5 w-1.5 rounded-full mt-2 shrink-0 ${stateDot(
                                  t.state,
                                )}`}
                              />
                              <span className="text-lg tracking-tight font-medium">
                                {t.title}
                              </span>
                            </div>

                            {/* Plain-English state line */}
                            <div className="mt-1.5 ml-4 text-sm text-stone-600">
                              {stateLabel(t.state)}
                              {t.state !== "shipped" && (
                                <span className="text-stone-400">
                                  {" "}
                                  · since {t.movedAt}
                                </span>
                              )}
                            </div>

                            {/* Owner note / Engine summary if present */}
                            {t.ownerNote && (
                              <div className="mt-3 ml-4 pl-4 border-l-2 border-stone-200">
                                <p className="text-sm italic text-stone-700 leading-relaxed">
                                  &ldquo;{t.ownerNote}&rdquo;
                                </p>
                                <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                                  {t.state === "shipped"
                                    ? "what the Owner says"
                                    : "what the Owner asked"}
                                </div>
                              </div>
                            )}

                            {/* Verify CTA if shipped */}
                            {t.state === "shipped" && t.verifyUrl && (
                              <a className="mt-3 ml-4 inline-block font-mono text-[10px] uppercase tracking-widest text-emerald-700 hover:text-emerald-800 cursor-pointer">
                                see what changed →
                              </a>
                            )}

                            {/* Reply CTA if needs-info */}
                            {t.state === "needs-info" && (
                              <a className="mt-3 ml-4 inline-block font-mono text-[10px] uppercase tracking-widest text-sky-700 hover:text-sky-800 cursor-pointer">
                                reply to the Owner →
                              </a>
                            )}
                          </div>

                          {/* Right column: when filed */}
                          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 text-right whitespace-nowrap">
                            filed
                            <br />
                            <span className="text-stone-500">{t.filedAt}</span>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <a className="mt-6 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    show older →
                  </a>
                </section>
              </div>

              {/* RIGHT RAIL */}
              <aside className="space-y-14">
                {/* You hero */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    You
                  </div>
                  <div className="mt-3">
                    <span className="relative text-2xl font-bold tracking-tight">
                      {TICKETS.length} Tickets filed
                      <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                    <span className="font-mono text-emerald-600">
                      {TICKETS.filter((t) => t.state === "shipped").length}
                    </span>{" "}
                    shipped — that&rsquo;s real change you made.
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Average to ship</span>
                      <span className="font-mono text-stone-900">~2 days</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Filed this month</span>
                      <span className="font-mono text-stone-900">3</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Currently open</span>
                      <span className="font-mono text-stone-900">
                        {TICKETS.filter((t) => isOpen(t.state)).length}
                      </span>
                    </li>
                  </ul>
                </section>

                {/* What's needed from you */}
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
                    Owner asked you something
                  </div>
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                    On{" "}
                    <span className="font-medium text-stone-900">
                      &ldquo;Buttons look off on iPad...&rdquo;
                    </span>{" "}
                    — the Owner asked for a screenshot.
                  </p>
                  <button className="mt-5 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3 rounded-full shadow-sm inline-flex items-center justify-center gap-2">
                    Open the question
                    <span className="text-stone-400">→</span>
                  </button>
                </section>

                {/* What shipped recently */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Recently shipped for you
                  </div>
                  <ul className="mt-5 divide-y divide-stone-200">
                    {TICKETS.filter((t) => t.state === "shipped")
                      .slice(0, 3)
                      .map((t) => (
                        <li
                          key={t.id}
                          className="py-3 group cursor-pointer"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="flex items-baseline gap-2 text-sm text-stone-700 group-hover:text-stone-900">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                              <span className="truncate">{t.title}</span>
                            </span>
                            <span className="font-mono text-[10px] text-stone-400 whitespace-nowrap">
                              {t.movedAt}
                            </span>
                          </div>
                        </li>
                      ))}
                  </ul>
                </section>

                {/* Quiet footer */}
                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    You see your own Tickets and what shipped that affects you. The
                    Owner sees everything across the project.
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant T · editorial collaborator tickets
        </div>
      </div>
    </>
  );
}

function FilterChip({
  label,
  active,
  badge,
  sky,
}: {
  label: string;
  active?: boolean;
  badge?: string;
  sky?: boolean;
}) {
  return (
    <button
      className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition cursor-pointer ${
        active
          ? "bg-stone-900 text-stone-50"
          : "bg-stone-100 hover:bg-stone-200 text-stone-700"
      }`}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest">
        {label}
      </span>
      {badge !== undefined && (
        <span
          className={`font-mono text-[10px] ${
            sky
              ? "text-sky-300"
              : active
              ? "text-stone-300"
              : "text-stone-500"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
