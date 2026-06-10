// THROWAWAY — Editorial Project Landing prototype.
// Project-scoped home page: hero · actions · activity · pinned · rail.

import { NAV } from "./mock-data";

const PROJECT_FEED = [
  { id: "f1", who: "ada", what: "filed T-301", subject: "Add CSV export to ticket list", at: "2h ago", state: "triage" },
  { id: "f2", who: "Engine", what: "completed T-201", subject: "Refactor checkout flow", at: "1h ago", state: "shipped" },
  { id: "f3", who: "you", what: "shipped T-219", subject: "Export buttons UX redesign", at: "3d ago", state: "shipped" },
  { id: "f4", who: "carmen", what: "filed T-302", subject: "Onboarding screenshots are stale", at: "5h ago", state: "triage" },
  { id: "f5", who: "Engine", what: "failed T-149", subject: "Engine timeout on large repos", at: "12m ago", state: "failed" },
];

const PINNED_TICKETS = [
  { id: "T-247", title: "Add CSV export to ticket list", state: "review-ready", reporter: "ada", age: "12h" },
  { id: "T-274", title: "Fix bridge offline race", state: "in-progress", reporter: "you", age: "3h" },
];

const MEMBER_INITIALS = ["o", "a", "c", "m"];

function feedDot(state: string): string {
  if (state === "shipped") return "bg-emerald-500";
  if (state === "failed") return "bg-rose-500";
  if (state === "review-ready") return "bg-amber-500";
  if (state === "in-progress") return "bg-stone-700";
  if (state === "triage") return "bg-sky-400";
  return "bg-stone-400";
}

export function VariantOProject() {
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
            {/* Top breadcrumb + quick action */}
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Projects · acme-website
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
                <h1 className="text-5xl font-bold tracking-tighter">acme-website.</h1>
                <p className="mt-4 text-lg text-stone-700 leading-relaxed">
                  Online ordering for ACME&rsquo;s storefront. Ingested{" "}
                  <span className="font-mono text-stone-900">2 hours ago</span>.
                </p>

                {/* Editorial count sentence — the project's pulse, matching E */}
                <p className="mt-8 text-2xl leading-tight tracking-tight text-stone-700">
                  <span className="font-mono font-bold tracking-tighter text-stone-900">
                    13
                  </span>{" "}
                  open Tickets ·{" "}
                  <span className="font-mono font-bold tracking-tighter text-stone-900">
                    3
                  </span>{" "}
                  waiting on triage ·{" "}
                  <span className="font-mono font-bold tracking-tighter text-amber-600">
                    2
                  </span>{" "}
                  ready to ship.{" "}
                  <span className="font-mono font-bold tracking-tighter text-rose-600">
                    1
                  </span>{" "}
                  failed.
                </p>

                {/* Live presence + stuck insight + health — one mono secondary line */}
                <div className="mt-5 flex items-baseline gap-4 flex-wrap font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                      <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    <span>healthy · build green</span>
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                      <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    <span>2 viewing now</span>
                    <span className="text-stone-400 normal-case tracking-normal font-sans text-xs italic">
                      ada, you
                    </span>
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="normal-case tracking-normal font-sans text-xs italic text-stone-500">
                    <span className="font-mono not-italic text-rose-700">T-149</span>{" "}
                    failed 12m ago — worth a look
                  </span>
                </div>

                {/* Engine suggests — editorial Engine voice on what to do next */}
                <section className="mt-12">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Engine suggests
                  </div>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    Clear the{" "}
                    <span className="font-semibold text-stone-900">Triage queue</span>{" "}
                    (3 items, ~5 minutes of reading) before the next dispatch so{" "}
                    <span className="italic">ada</span> and{" "}
                    <span className="italic">carmen</span> know what&rsquo;s coming.
                    After that,{" "}
                    <span className="font-mono text-emerald-700">T-247</span> and{" "}
                    <span className="font-mono text-emerald-700">T-249</span> are
                    parallel-safe and can land as one Ship Group.
                  </p>
                  <div className="mt-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                      open triage →
                    </a>
                    <span className="text-stone-300">·</span>
                    <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                      regenerate ↻
                    </a>
                    <span className="text-stone-300">·</span>
                    <span>refreshed 4m ago</span>
                  </div>
                </section>

                {/* JUMP TO action chips */}
                <section className="mt-16">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Jump to
                  </div>
                  <div className="mt-5 flex items-center gap-2 flex-wrap">
                    <JumpChip label="Kanban" badge="13" />
                    <JumpChip label="Triage" badge="3" amber />
                    <JumpChip label="Review" badge="2" amber />
                    <JumpChip label="Failed" badge="1" rose />
                    <JumpChip label="Ingest summary" arrow />
                    <JumpChip label="CONTEXT.md" arrow />
                  </div>
                </section>

                {/* PINNED TICKETS — focused work */}
                <section className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Pinned
                    </h2>
                    <span className="font-mono text-xs text-stone-400">
                      {PINNED_TICKETS.length}
                    </span>
                  </div>
                  <ul className="divide-y divide-stone-200">
                    {PINNED_TICKETS.map((t) => (
                      <li
                        key={t.id}
                        className="py-5 grid grid-cols-[auto_1fr_auto] items-baseline gap-4 group cursor-pointer"
                      >
                        <span className="text-amber-500">★</span>
                        <div>
                          <div className="flex items-baseline gap-2.5 text-lg tracking-tight">
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full mt-2 shrink-0 ${feedDot(
                                t.state,
                              )}`}
                            />
                            <span>{t.title}</span>
                          </div>
                          <div className="mt-1 ml-4 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                            {t.id} · {t.state.replace("-", " ")} · filed by {t.reporter}
                          </div>
                        </div>
                        <span className="font-mono text-xs text-stone-400 group-hover:text-stone-900 transition whitespace-nowrap">
                          {t.age}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* ACTIVITY — what's been happening */}
                <section className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      What&rsquo;s happening
                    </h2>
                    <span className="font-mono text-xs text-stone-400">last 7 days</span>
                  </div>
                  <ol className="divide-y divide-stone-200">
                    {PROJECT_FEED.map((f, i) => (
                      <li
                        key={f.id}
                        className="py-5 grid grid-cols-[40px_1fr_auto] items-baseline gap-6 group cursor-pointer"
                      >
                        <span className="font-mono text-xs text-stone-400">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <div className="flex items-baseline gap-2.5 text-base">
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${feedDot(
                                f.state,
                              )}`}
                            />
                            <span className="text-stone-700 leading-snug">
                              <span className="font-medium text-stone-900">{f.who}</span>{" "}
                              {f.what} · <span className="italic">{f.subject}</span>
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 whitespace-nowrap">
                          {f.at}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <a className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    all activity →
                  </a>
                </section>
              </div>

              {/* RIGHT RAIL */}
              <aside className="space-y-14">
                {/* Project stats hero */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Project
                  </div>
                  <div className="mt-3">
                    <span className="relative text-2xl font-bold tracking-tight">
                      13 open Tickets
                      <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                    2 are ready to ship.{" "}
                    <span className="text-rose-600">1 failed</span> needs your attention.
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Triage</span>
                      <span className="font-mono text-stone-900">3</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">In progress</span>
                      <span className="font-mono text-stone-900">2</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Review ready</span>
                      <span className="font-mono text-amber-600">2</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Shipped this week</span>
                      <span className="font-mono text-stone-900">5</span>
                    </li>
                  </ul>

                  {/* Weekly throughput sparkline */}
                  <div className="mt-6">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-2">
                      7-day ticket flow
                    </div>
                    <div className="flex items-end gap-1 h-12">
                      {[2, 4, 1, 3, 5, 3, 6].map((h, i) => {
                        const day = ["M", "T", "W", "T", "F", "S", "S"][i];
                        const isToday = i === 6;
                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-1.5"
                          >
                            <div
                              className={`w-full rounded-t-sm ${
                                isToday ? "bg-amber-500" : "bg-amber-400/60"
                              }`}
                              style={{ height: `${Math.max((h / 6) * 100, 8)}%` }}
                            />
                            <span
                              className={`font-mono text-[9px] ${
                                isToday
                                  ? "text-amber-600 font-bold"
                                  : "text-stone-400"
                              }`}
                            >
                              {day}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* SHIP READY — featured action card (project-scoped, mirrors E/F pattern) */}
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Ready to ship
                  </div>
                  <div className="mt-3 text-sm text-stone-700 leading-relaxed">
                    <span className="font-mono text-stone-900">2 tickets</span> are
                    parallel-safe. A single Ship Group can land them together.
                  </div>
                  <div className="mt-2 font-mono text-xs text-stone-500">
                    T-247 · T-249 · file-sets disjoint
                  </div>
                  <button className="mt-5 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-emerald-600 hover:bg-emerald-700 px-4 py-3 rounded-full inline-flex items-center justify-center gap-2 shadow-sm transition">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    Ship 2 now
                    <span className="text-emerald-100">→</span>
                  </button>
                  <a className="mt-3 block text-center font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:underline cursor-pointer">
                    Review first ↗
                  </a>
                </section>

                {/* Bridge mini */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Bridge
                  </div>
                  <div className="mt-3 flex items-baseline gap-2.5">
                    <span className="relative flex h-1.5 w-1.5 mt-1.5">
                      <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                      <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    <div>
                      <div className="text-base font-medium font-mono text-stone-900">
                        macbook-pro-2024
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                        online · healthy · 0 queued
                      </div>
                    </div>
                  </div>
                  <a className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    bridge settings →
                  </a>
                </section>

                {/* Members preview */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Members
                  </div>
                  <div className="mt-5 flex items-center gap-4">
                    {MEMBER_INITIALS.map((m, i) => (
                      <div
                        key={i}
                        className="relative h-7 w-7 flex items-center justify-center"
                      >
                        <span className="text-xl font-bold tracking-tighter leading-none text-stone-900">
                          {m}
                        </span>
                        {i < 2 && (
                          <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    1 owner · 3 collaborators · 2 active now
                  </div>
                  <a className="mt-3 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    manage members →
                  </a>
                </section>

                {/* Quick links footer */}
                <section className="pt-4 border-t border-stone-200/80">
                  <ul className="text-sm space-y-2">
                    <li className="flex items-baseline justify-between group cursor-pointer">
                      <span className="text-stone-700 group-hover:text-stone-900">
                        Ingest summary
                      </span>
                      <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                        →
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between group cursor-pointer">
                      <span className="text-stone-700 group-hover:text-stone-900">
                        Project CONTEXT.md
                      </span>
                      <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                        →
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between group cursor-pointer">
                      <span className="text-stone-700 group-hover:text-stone-900">
                        Repository
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
          atlas · v1.3 design lab · variant O · editorial project landing
        </div>
      </div>
    </>
  );
}

function JumpChip({
  label,
  badge,
  amber,
  rose,
  arrow,
}: {
  label: string;
  badge?: string;
  amber?: boolean;
  rose?: boolean;
  arrow?: boolean;
}) {
  return (
    <button className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 transition cursor-pointer">
      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-700">
        {label}
      </span>
      {badge !== undefined && (
        <span
          className={`font-mono text-[10px] ${
            amber ? "text-amber-600" : rose ? "text-rose-600" : "text-stone-500"
          }`}
        >
          {badge}
        </span>
      )}
      {arrow && (
        <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
          →
        </span>
      )}
    </button>
  );
}
