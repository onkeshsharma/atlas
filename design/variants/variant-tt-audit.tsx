// THROWAWAY — Editorial Audit Log prototype.
// Full filterable event timeline. The page Owners open when something seems
// off, when a Collaborator asks "did Atlas really email me?", or when prepping
// for a security review.

import { NAV } from "./mock-data";

type EventKind =
  | "sign-in"
  | "ticket"
  | "brief"
  | "dispatch"
  | "result"
  | "merge"
  | "invite"
  | "settings"
  | "auth"
  | "bridge"
  | "danger";

type Event = {
  t: string;
  date: string;
  group?: string;
  kind: EventKind;
  actor: string;
  title: string;
  detail?: string;
  meta?: string;
};

const EVENTS: Event[] = [
  // TODAY
  {
    t: "10:42",
    date: "today",
    group: "Today · Tue May 13",
    kind: "sign-in",
    actor: "Onkesh",
    title: "Signed in from Chrome · macOS",
    meta: "Bristol, UK · 86.0.215.42",
  },
  {
    t: "10:14",
    date: "today",
    kind: "merge",
    actor: "Atlas",
    title: "Merged PR #142 to atlas-internal:main",
    detail: "Fix the timezone fallback in lib/time/zoneFromHeader.ts.",
    meta: "Job #142 · 1m 47s end-to-end",
  },
  {
    t: "10:12",
    date: "today",
    kind: "result",
    actor: "Engine",
    title: "Job #142 finished green",
    detail: "All 7 quality gates passed. PR auto-opened.",
    meta: "atlas-internal · Bridge this-machine",
  },
  {
    t: "10:09",
    date: "today",
    kind: "dispatch",
    actor: "Onkesh",
    title: "Dispatched Job #142",
    detail: 'From Ticket "Timezone crash on signup" (Priya, May 12)',
  },
  {
    t: "09:51",
    date: "today",
    kind: "brief",
    actor: "Onkesh",
    title: "Approved Brief for Ticket #142",
    detail: "1 edit before approval (added explicit UTC fallback line).",
  },
  // YESTERDAY
  {
    t: "18:14",
    date: "yesterday",
    group: "Yesterday · Mon May 12",
    kind: "merge",
    actor: "Atlas",
    title: "Merged PR #141 to marketing-site:main",
    meta: "Job #141 · 2m 12s",
  },
  {
    t: "14:22",
    date: "yesterday",
    kind: "ticket",
    actor: "Priya",
    title: "Filed Ticket #142 — Timezone crash on signup",
    meta: "atlas-internal · enhancement",
  },
  {
    t: "11:30",
    date: "yesterday",
    kind: "invite",
    actor: "Onkesh",
    title: "Invited Marcus to atlas-internal as Collaborator",
    meta: "invite ID inv-872xa",
  },
  {
    t: "09:02",
    date: "yesterday",
    kind: "auth",
    actor: "Onkesh",
    title: "Updated 2FA backup codes",
    detail: "Regenerated 10 codes; previous codes invalidated.",
  },
  // MAY 8
  {
    t: "11:30",
    date: "may 8",
    group: "Fri May 8",
    kind: "settings",
    actor: "Onkesh",
    title: 'Changed display name to "Onkesh"',
    detail: "Was: onkesh-19",
  },
  {
    t: "10:01",
    date: "may 8",
    kind: "bridge",
    actor: "Bridge",
    title: "Bridge token rotated (atlas-internal)",
    meta: "ttl 90 days · expires Aug 6",
  },
  {
    t: "09:14",
    date: "may 8",
    kind: "result",
    actor: "Engine",
    title: "Job #137 failed — typecheck",
    detail: "TS error in components/MagicLink.tsx — sent back to Engine.",
    meta: "atlas-internal · 0m 42s before failure",
  },
  // MAY 5
  {
    t: "15:18",
    date: "may 5",
    group: "Mon May 5",
    kind: "danger",
    actor: "Onkesh",
    title: "Removed Sam from marketing-site",
    detail: "Sam can no longer file Tickets or receive Ship Notifications.",
    meta: "irreversible · audit retention 7 years",
  },
];

function kindLabel(k: EventKind): string {
  return k.replace("-", " ").toUpperCase();
}

function kindStyle(k: EventKind): { dot: string; text: string } {
  switch (k) {
    case "sign-in":
      return { dot: "bg-stone-400", text: "text-stone-600" };
    case "ticket":
      return { dot: "bg-emerald-500", text: "text-emerald-700" };
    case "brief":
      return { dot: "bg-amber-500", text: "text-amber-700" };
    case "dispatch":
      return { dot: "bg-amber-500", text: "text-amber-700" };
    case "result":
      return { dot: "bg-stone-700", text: "text-stone-800" };
    case "merge":
      return { dot: "bg-violet-500", text: "text-violet-700" };
    case "invite":
      return { dot: "bg-sky-500", text: "text-sky-700" };
    case "settings":
      return { dot: "bg-stone-400", text: "text-stone-600" };
    case "auth":
      return { dot: "bg-stone-700", text: "text-stone-800" };
    case "bridge":
      return { dot: "bg-stone-400", text: "text-stone-600" };
    case "danger":
      return { dot: "bg-rose-500", text: "text-rose-700" };
  }
}

const FILTERS = [
  { label: "Everything", count: 142, active: true },
  { label: "Just security", count: 18 },
  { label: "Just Tickets & PRs", count: 87 },
  { label: "Just settings", count: 11 },
  { label: "Just danger", count: 3 },
];

const ACTORS = [
  { name: "Onkesh", count: 96 },
  { name: "Priya", count: 14 },
  { name: "Atlas", count: 22 },
  { name: "Engine", count: 8 },
  { name: "Bridge", count: 2 },
];

export function VariantTTAudit() {
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
                Settings · Security · Audit log
              </div>
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                <span>retained 7 years</span>
                <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                  export csv ↗
                </a>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_300px] gap-16">
              <div className="max-w-[760px]">
                {/* Hero */}
                <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
                  Every event, every actor, every Project
                </div>
                <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-[1.05]">
                  The{" "}
                  <span className="relative">
                    paper trail
                    <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-amber-500" />
                  </span>
                  .
                </h1>
                <p className="mt-5 text-xl text-stone-700 leading-relaxed">
                  Atlas keeps a structured record of everything that touches
                  your Projects — sign-ins, Tickets, Briefs, Jobs, merges,
                  invitations, settings changes. Reverse-chronological. Read
                  freely, search lazily.
                </p>

                {/* Filter chips */}
                <div className="mt-8 flex items-center gap-2 flex-wrap">
                  {FILTERS.map((f) => (
                    <a
                      key={f.label}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition ${
                        f.active
                          ? "bg-stone-900 text-stone-50 border-stone-900"
                          : "bg-white/50 text-stone-700 border-stone-200 hover:border-stone-400"
                      }`}
                    >
                      {f.label}
                      <span
                        className={`ml-2 font-mono text-[10px] ${
                          f.active ? "text-stone-300" : "text-stone-400"
                        }`}
                      >
                        {f.count}
                      </span>
                    </a>
                  ))}
                </div>

                {/* Search */}
                <div className="mt-5 flex items-center gap-3 border-b border-stone-300 pb-2">
                  <span className="font-mono text-stone-400 text-sm">⌕</span>
                  <input
                    type="text"
                    placeholder="search this log — actor, kind, free-text… (e.g. 'Priya dispatch may 12')"
                    className="flex-1 bg-transparent text-base text-stone-900 placeholder:text-stone-400 focus:outline-none"
                  />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    142 events
                  </span>
                </div>

                {/* TIMELINE */}
                <section className="mt-12">
                  <ol className="relative">
                    {/* The thin vertical rule */}
                    <div className="absolute top-0 bottom-0 left-[78px] w-px bg-stone-200" />

                    {EVENTS.map((e, i) => {
                      const style = kindStyle(e.kind);
                      return (
                        <li key={i}>
                          {e.group && (
                            <div className="pt-8 pb-3 pl-[110px] font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">
                              {e.group}
                            </div>
                          )}
                          <div className="grid grid-cols-[70px_24px_1fr_auto] items-baseline gap-3 py-3.5">
                            <span className="font-mono text-xs text-stone-400 text-right">
                              {e.t}
                            </span>
                            <span className="flex justify-center pt-1.5">
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${style.dot} ring-4 ring-amber-50/30`}
                              />
                            </span>
                            <div className="pl-3">
                              <div className="flex items-baseline gap-3 flex-wrap">
                                <span
                                  className={`font-mono text-[9px] uppercase tracking-widest ${style.text}`}
                                >
                                  {kindLabel(e.kind)}
                                </span>
                                <span className="font-mono text-[10px] text-stone-400">
                                  {e.actor}
                                </span>
                              </div>
                              <div className="mt-1 text-base text-stone-900 leading-snug">
                                {e.title}
                              </div>
                              {e.detail && (
                                <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                                  {e.detail}
                                </p>
                              )}
                              {e.meta && (
                                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                                  {e.meta}
                                </div>
                              )}
                            </div>
                            <a className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-600 cursor-pointer whitespace-nowrap">
                              permalink ↗
                            </a>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>

                <div className="mt-10 flex items-center gap-3 font-mono text-xs uppercase tracking-widest">
                  <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                    load 20 older events →
                  </a>
                  <span className="text-stone-300">·</span>
                  <span className="text-stone-400">
                    showing 13 of 142 in the last 30 days
                  </span>
                </div>

                <p className="mt-16 text-sm italic text-stone-500 leading-relaxed">
                  Atlas keeps audit events for 7 years; this is non-negotiable
                  even if you delete the underlying Project, so trust-circle
                  forensics never lose ground.{" "}
                  <a className="not-italic font-mono text-xs text-stone-700 hover:text-amber-600 cursor-pointer">
                    retention policy →
                  </a>
                </p>
              </div>

              {/* RAIL */}
              <aside className="space-y-12">
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Date range
                  </div>
                  <div className="mt-5 space-y-1 text-sm">
                    <RangeRow label="Today" count={5} active />
                    <RangeRow label="Last 7 days" count={28} />
                    <RangeRow label="Last 30 days" count={142} />
                    <RangeRow label="Last 90 days" count={412} />
                    <RangeRow label="All time" count="1,847" />
                  </div>
                  <a className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    pick a custom range ↗
                  </a>
                </section>

                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    By actor
                  </div>
                  <ul className="mt-5 space-y-3 text-sm">
                    {ACTORS.map((a) => (
                      <li
                        key={a.name}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <a className="text-stone-700 hover:text-stone-900 cursor-pointer">
                          {a.name}
                        </a>
                        <span className="font-mono text-[10px] text-stone-400">
                          {a.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Legend
                  </div>
                  <ul className="mt-5 grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                    {(
                      [
                        "sign-in",
                        "ticket",
                        "brief",
                        "dispatch",
                        "result",
                        "merge",
                        "invite",
                        "settings",
                        "auth",
                        "bridge",
                        "danger",
                      ] as EventKind[]
                    ).map((k) => {
                      const s = kindStyle(k);
                      return (
                        <li key={k} className="flex items-center gap-2">
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`}
                          />
                          <span className="text-stone-600">{k}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    Audit events are immutable. We can&rsquo;t edit them and
                    neither can you — that&rsquo;s the point. If something
                    looks wrong, file it through{" "}
                    <a className="not-italic font-mono text-xs text-stone-700 hover:text-amber-600 cursor-pointer">
                      support@atlas.com
                    </a>{" "}
                    so the correction is itself an audit event.
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant TT · editorial audit log
        </div>
      </div>
    </>
  );
}

function RangeRow({
  label,
  count,
  active,
}: {
  label: string;
  count: number | string;
  active?: boolean;
}) {
  return (
    <a
      className={`flex items-baseline justify-between gap-3 cursor-pointer py-1 ${
        active ? "" : ""
      }`}
    >
      <span
        className={
          active
            ? "text-stone-900 font-medium border-b border-amber-500 pb-0.5"
            : "text-stone-600 hover:text-stone-900"
        }
      >
        {label}
      </span>
      <span className="font-mono text-[10px] text-stone-400">{count}</span>
    </a>
  );
}
