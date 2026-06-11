/**
 * M6 — Today. The cockpit (CONTEXT.md: the dashboard AND the live view).
 *
 * Ported from design/variants/variant-e-editorial-feed-first.tsx:109–518
 * (THE Today spec — M1 lock), composed from the kit. Canon: §2.2 cockpit
 * header (pt-12), §3.1 grid `[1fr_360px] gap-16` + max-w-2xl main,
 * §3.3 live-state law (active-Runs strip + ONE Needs-Input AmberPanel —
 * v2 additions over E), §3.5 capped Recent feed, §4-M6.
 *
 * Every number on this page is a domain query over real rows — the seed
 * script provides demo provenance (`seeded=true`), never the JSX.
 * Liveness: LiveRefresh re-renders the tree on any LiveEvent
 * (docs/adr/0001-live-transport.md).
 */
import Link from "next/link";

import {
  AmberPanel,
  DividedList,
  EmptyState,
  FeaturedCard,
  ListRow,
  LivePulse,
  MonoSectionLabel,
  PageHeader,
  PillButton,
  Sparkline,
  TimelineRail,
  WeekBars,
  runStateLabelClass,
  runStateLabelText,
} from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireOwner } from "@/src/domain/auth/guard";
import {
  heroCounts,
  projectRows,
  readyToShipTickets,
  recentTickets,
  weekStats,
} from "@/src/domain/cockpit/queries";
import { KIND_CONNECTOR, KIND_TONE, KIND_WORD } from "@/src/domain/feed/kinds";
import {
  activitySparklines,
  actorsActiveToday,
  recentFeedEvents,
  type FeedRow,
} from "@/src/domain/feed/queries";
import { latestCursor } from "@/src/domain/live/broker";
import { activeRuns, needsInputRuns } from "@/src/domain/run/queries";
import {
  TICKET_DOT_TONE,
  TICKET_WORD_CLASS,
  ticketStateLabel,
} from "@/src/domain/ticket/states";
import { dayStamp, shortAgo } from "@/src/lib/format";

export const dynamic = "force-dynamic";

/** E:393–417 → TimelineRail events, refs preferred (E: "completed T-201"). */
function activityEvent(e: FeedRow) {
  const ref = e.ticketRef ?? e.summary.split(" — ")[0];
  const connector = KIND_CONNECTOR[e.kind];
  return {
    who: e.actor,
    what: `${KIND_WORD[e.kind]} ${connector ? `${connector} ` : ""}${ref}`,
    at: shortAgo(e.createdAt),
    tone: KIND_TONE[e.kind],
  };
}

export default async function TodayPage() {
  await requireOwner();

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [counts, projects, sparklines, recent, runs, needsInput, stats, ship, feed, actors, cursor] =
    await Promise.all([
      heroCounts(),
      projectRows(),
      activitySparklines(),
      recentTickets(),
      activeRuns(),
      needsInputRuns(),
      weekStats(),
      readyToShipTickets(),
      recentFeedEvents(4),
      actorsActiveToday(dayStart),
      latestCursor(),
    ]);

  const pinned = projects.filter((p) => p.pinned);
  const others = projects.filter((p) => !p.pinned);
  const reviewTicket = ship[0];
  const failedTicket = recent.find((t) => t.state === "failed");
  const refreshedAt = feed[0]?.createdAt ?? new Date();

  return (
    <main className="flex-1 px-16 pt-12 pb-24">
      <LiveRefresh since={cursor} />
      <div className="grid grid-cols-[1fr_360px] gap-16">
        {/* MAIN COL (E:114–291) */}
        <div className="max-w-2xl">
          <PageHeader kind="cockpit" dayStamp={dayStamp()} title="Today.">
            {/* HERO sentence (E:122–140) — semantic mono numerals, real counts */}
            <span className="font-mono font-bold tracking-tighter text-stone-900">
              {counts.triage}
            </span>{" "}
            tickets need your triage.{" "}
            <span className="font-mono font-bold tracking-tighter text-amber-600">
              {counts.reviewReady}
            </span>{" "}
            are ready to ship.
            {counts.failed > 0 && (
              <>
                {" "}
                <span className="font-mono font-bold tracking-tighter text-rose-600">
                  {counts.failed}
                </span>{" "}
                failed.
              </>
            )}
          </PageHeader>

          {/* Live presence (E:143–152) — real distinct actors today */}
          {actors.length > 0 && (
            <div className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
              <LivePulse color="emerald" />
              <span>
                {actors.length} active today
              </span>
              <span className="text-stone-400 normal-case tracking-normal font-sans text-xs italic">
                {actors.map((a) => a.toLowerCase()).join(", ")}
              </span>
            </div>
          )}

          {/* §3.3 — Needs Input outranks everything: ONE AmberPanel, kicker
              counts, rows never pulse (v2 addition over E; kit composition
              per the dev-kit multi-Run form). */}
          {needsInput.length > 0 && (
            <div className="mt-12">
              <AmberPanel
                kicker={`${needsInput.length} run${needsInput.length === 1 ? " needs" : "s need"} your input`}
                rows={
                  <>
                    {needsInput.map((r) => (
                      <li key={r.id} className="py-4 first:pt-2 last:pb-0">
                        <div className="flex items-baseline justify-between gap-6">
                          <div className="text-base tracking-tight text-stone-900">
                            {r.title}
                          </div>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500 whitespace-nowrap">
                            {r.ref} · {r.projectName}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-stone-700 italic">
                          {r.question.prompt}
                        </div>
                        <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          waiting {shortAgo(r.since)} · answer here soon
                        </div>
                      </li>
                    ))}
                  </>
                }
              />
            </div>
          )}

          {/* Active runs — the v2 live strip (§3.3, §4-M6; PRD #1):
              running pulses in this live context, needs-input pulses amber,
              queued is static stone-400 — all via the kit's context API. */}
          <section className="mt-16">
            <MonoSectionLabel rule count={runs.length}>
              Active runs
            </MonoSectionLabel>
            {runs.length > 0 ? (
              <DividedList>
                {runs.map((r) => (
                  <ListRow
                    key={r.id}
                    state={r.state}
                    stateContext="live"
                    title={r.title}
                    meta={
                      <>
                        {r.projectName} · {r.ticketRef ?? r.ref} ·{" "}
                        <span className={runStateLabelClass(r.state)}>
                          {runStateLabelText(r.state)}
                        </span>
                      </>
                    }
                    right={shortAgo(r.since)}
                  />
                ))}
              </DividedList>
            ) : (
              <div className="py-10">
                <EmptyState
                  shape="column"
                  note="Nothing running."
                  goodNews="The Engine is idle. That's a good thing."
                />
              </div>
            )}
          </section>

          {/* AI Digest (E:155–176) — composed server-side from the live rows;
              LLM wiring is a later module, so the copy is honest aggregation
              and E:174's "regenerate ↻" doesn't port (would be a fake affordance). */}
          <section className="mt-16">
            <MonoSectionLabel dot="amber">AI digest</MonoSectionLabel>
            <p className="mt-4 text-lg leading-relaxed text-stone-700">
              {stats.shippedThisWeek > 0 ? (
                <>
                  You shipped{" "}
                  <span className="font-semibold text-stone-900">
                    {stats.shippedThisWeek} ticket{stats.shippedThisWeek === 1 ? "" : "s"}
                  </span>{" "}
                  this week.
                </>
              ) : (
                <>Nothing has shipped yet this week.</>
              )}
              {reviewTicket && (
                <>
                  {" "}
                  <span className="text-amber-600 font-medium">{reviewTicket.ref}</span>{" "}
                  <span className="text-stone-500">({reviewTicket.title})</span> is ready
                  for your review.
                </>
              )}
              {needsInput.length > 0 && (
                <>
                  {" "}
                  <span className="text-amber-700 font-medium">
                    {needsInput.length} run{needsInput.length === 1 ? "" : "s"}
                  </span>{" "}
                  {needsInput.length === 1 ? "is" : "are"} waiting on your answer.
                </>
              )}
              {failedTicket && (
                <>
                  {" "}
                  <span className="text-rose-600 font-medium">{failedTicket.ref}</span>{" "}
                  failed and needs another look.
                </>
              )}
            </p>
            <div className="mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
              <span>refreshed {shortAgo(refreshedAt)}</span>
              <span>·</span>
              <span>composed from your live feed</span>
            </div>
          </section>

          {/* PINNED strip (E:180–244) — vanishes when nothing is pinned */}
          {pinned.length > 0 && (
            <section className="mt-16">
              <MonoSectionLabel rule>Pinned</MonoSectionLabel>
              <ul className="divide-y divide-stone-200">
                {pinned.map((p) => (
                  <li key={p.id} className="py-5 group cursor-pointer">
                    <div className="flex items-baseline justify-between gap-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-amber-500">★</span>
                        <span className="text-lg tracking-tight font-medium">{p.name}</span>
                      </div>
                      <span className="font-mono text-xs text-stone-400 group-hover:text-stone-900 transition">
                        →
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-6">
                      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        <span>
                          <span className="text-stone-900">{p.openCount}</span> open
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1.5">
                          {/* honest no-Bridge-yet dot — stone-300 per §1.1 state-idle
                              (E:213's emerald "bridge live" returns with M9/M10) */}
                          <span className="h-1 w-1 rounded-full bg-stone-300" />
                          no bridge yet
                        </span>
                        <span>·</span>
                        <span>
                          last activity{" "}
                          {p.lastActivityAt ? shortAgo(p.lastActivityAt) : "—"}
                        </span>
                      </div>
                      {/* Activity sparkline — real 7-day feed counts (E:222–237) */}
                      <Sparkline data={sparklines.get(p.id) ?? [0, 0, 0, 0, 0, 0, 0]} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Recent — §3.5 capped live region (E:246–286) */}
          <section className="mt-16">
            <MonoSectionLabel rule count={recent.length}>
              Recent
            </MonoSectionLabel>
            {recent.length > 0 ? (
              <DividedList ordered capped>
                {recent.map((t, i) => (
                  <ListRow
                    key={t.id}
                    index={String(i + 1).padStart(2, "0")}
                    dotTone={TICKET_DOT_TONE[t.state]}
                    title={t.title}
                    meta={
                      <>
                        {t.projectName} · {t.reporter} ·{" "}
                        <span className={TICKET_WORD_CLASS[t.state]}>
                          {ticketStateLabel(t.state)}
                        </span>
                      </>
                    }
                    right={shortAgo(t.updatedAt)}
                  />
                ))}
              </DividedList>
            ) : (
              <div className="py-10">
                <EmptyState
                  shape="column"
                  note="Nothing here."
                  goodNews="No tickets have been touched yet."
                />
              </div>
            )}
          </section>
        </div>

        {/* ASIDE COL — editorial "in brief" rail (E:294–517) */}
        <aside className="space-y-14">
          {/* This week — hero number + secondary metrics + week bars (E:296–351) */}
          <section>
            <MonoSectionLabel>This week</MonoSectionLabel>
            <div className="mt-3">
              <span className="relative text-2xl font-bold tracking-tight">
                {stats.shippedThisWeek} shipped
                <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
              </span>
            </div>
            <p className="mt-3 text-sm text-stone-500 leading-relaxed">
              {stats.shippedThisWeek === 0 && stats.shippedLastWeek === 0 ? (
                <>A quiet week so far.</>
              ) : stats.shippedThisWeek > stats.shippedLastWeek ? (
                <>
                  Up from <span className="font-mono">{stats.shippedLastWeek}</span> last
                  week.
                </>
              ) : stats.shippedThisWeek < stats.shippedLastWeek ? (
                <>
                  Down from <span className="font-mono">{stats.shippedLastWeek}</span> last
                  week.
                </>
              ) : (
                <>Level with last week.</>
              )}
            </p>
            {/* E:314–323's "Engine time / PRs merged" aren't tracked yet —
                same row recipe, honest metrics (M6 deviation, see handoff). */}
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Runs finished</span>
                <span className="font-mono text-stone-900">{stats.runsFinishedThisWeek}</span>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Tickets filed</span>
                <span className="font-mono text-stone-900">{stats.ticketsFiledThisWeek}</span>
              </li>
            </ul>
            <div className="mt-6">
              <WeekBars
                bars={["M", "T", "W", "T", "F", "S", "S"].map((label, i) => ({
                  label,
                  value: stats.weekBars[i],
                }))}
                currentIndex={stats.todayIndex}
              />
            </div>
          </section>

          {/* READY TO SHIP — featured card (E:354–377) */}
          {ship.length > 0 && (
            <FeaturedCard>
              <MonoSectionLabel>Ready to ship</MonoSectionLabel>
              <div className="mt-3 text-sm text-stone-700 leading-relaxed">
                <span className="font-mono text-stone-900">
                  {ship.length} ticket{ship.length === 1 ? "" : "s"}
                </span>{" "}
                {ship.length === 1 ? "is" : "are"} ready for your review.
              </div>
              <div className="mt-2 font-mono text-xs text-stone-500">
                {ship.map((t) => t.ref).join(" · ")}
              </div>
              <div className="mt-5">
                {/* canon §3.4 / ledger E4: the ship CTA is emerald-600 —
                    E:368's stone-900 fill is ruled drift. Ship flow lands
                    with M8/M9. */}
                <PillButton kind="ship" fullWidth>
                  Ship {ship.length} now
                </PillButton>
              </div>
              {/* canon §3.6: review happens inside Atlas — E:373's `↗` reads
                  "leaves Atlas" and is overruled to `→`. */}
              <a className="mt-3 block text-center font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:underline cursor-pointer">
                Review first →
              </a>
            </FeaturedCard>
          )}

          {/* Activity — timeline rail, pulse on the newest only (E:379–446) */}
          <section>
            <MonoSectionLabel live="emerald">Activity</MonoSectionLabel>
            <div className="mt-4">
              {feed.length > 0 ? (
                <TimelineRail events={feed.map(activityEvent)} />
              ) : (
                <EmptyState shape="strip">Nothing has happened yet.</EmptyState>
              )}
            </div>
            <Link
              href="/inbox"
              className="mt-5 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
            >
              all activity →
            </Link>
          </section>

          {/* Other projects — non-pinned, quiet (E:448–478) */}
          {others.length > 0 && (
            <section>
              <MonoSectionLabel>Other projects</MonoSectionLabel>
              <ul className="mt-4 space-y-3">
                {others.map((p) => (
                  <li key={p.id} className="group cursor-pointer">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm tracking-tight text-stone-700 group-hover:text-stone-900">
                        {p.name}
                      </span>
                      <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                        →
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      <span>{p.openCount} open</span>
                      <span>·</span>
                      <span>{p.lastActivityAt ? shortAgo(p.lastActivityAt) : "quiet"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Bridge — honest §2.17 strip until a Bridge exists (M9/M10);
              E:481–516's healthy-Bridge stats return with the real daemon. */}
          <section>
            <MonoSectionLabel>Bridge</MonoSectionLabel>
            <div className="mt-3">
              <EmptyState shape="strip">
                No Bridge is paired with this Atlas yet. Your machine appears here —
                heartbeat, preflight, capability — once one connects.
              </EmptyState>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
