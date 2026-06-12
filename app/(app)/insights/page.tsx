/**
 * M16 — /insights: how the Owner actually ships (PRD #55).
 *
 * Ported from design/variants/variant-oo-insights.tsx:52–407 (breadcrumb
 * + range segments row, "How you're shipping." hero with semantic
 * numerals, Engine read, Weekly throughput figure with stacked rose
 * failures + legend + Fig. caption, Time-to-ship percentile rows, Per
 * Project divided list with share bars, Stragglers list; 360 rail:
 * Velocity hero + stat rows, Engine-suggests card, Export, Owner-only
 * footnote). Canon: §3.1 default rail (360 — OO:64 agrees), §2.19 charts
 * (kit WeekBars `figure` axis), §2.2 routed header, §2.17 empty states.
 *
 * Canon/honesty over variant (one-liners per §5.4):
 * - every number derives live from feed_events/runs/tickets via
 *   src/domain/insights/ — OO's mock constants are gone; absent metrics
 *   are NAMED (the M6 "Engine time isn't tracked" precedent):
 *   - OO:347–349 "Engine quota used 42/100 hrs" → Helper-Runs row + an
 *     italic gap line (Engine hours aren't recorded anywhere).
 *   - OO:391–395 "Charts as PNG ↗" → dropped; no PNG pipeline exists
 *     (the M6 "regenerate ↻" fake-affordance precedent). CSV is real.
 * - OO:85–88 pulses the velocity dot; §2.7 "pulse only what is genuinely
 *   live" wins → static dot, semantic color by direction.
 * - OO:194 "from triage to merge" + :198–199's Collaborator/PR framing →
 *   "from filed to shipped" (what the record actually measures).
 * - OO:103–109's Engine-read paragraph narrates causes ("the CONTEXT.md
 *   you updated made drafts more accurate") — composed here from real
 *   medians/counts only, meta-lined like Today's digest (M6 deviation 3).
 * - OO:352's emerald failure-rate value → stone-900 (§1.1 one color =
 *   one meaning: emerald is "shipped/healthy", not "low number").
 * - OO:256–266 per-project meta renders avg only when pairs measure it.
 */
import Link from "next/link";

import {
  EmptyState,
  FeaturedCard,
  MonoSectionLabel,
  PageHeader,
  PillButton,
  WeekBars,
} from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireOwner } from "@/src/domain/auth/guard";
import {
  formatAge,
  formatDuration,
  isInsightsRange,
  type InsightsRange,
  type Velocity,
} from "@/src/domain/insights/derive";
import { insightsData, type InsightsData } from "@/src/domain/insights/queries";
import { latestCursor } from "@/src/domain/live/broker";
import { ticketStateLabel, isTicketState } from "@/src/domain/ticket/states";

import { RangeControl } from "./range-control";

export const dynamic = "force-dynamic";

/** §2.7 over OO:85–88 — static dot; direction picks the semantic color. */
function velocityMeta(v: Velocity, compareLabel: string | null) {
  switch (v.kind) {
    case "compared": {
      const pct = `${v.pctChange > 0 ? "+" : v.pctChange < 0 ? "−" : "±"}${Math.abs(v.pctChange)}%`;
      return {
        dot: v.direction === "up" ? "bg-emerald-500" : v.direction === "down" ? "bg-rose-500" : "bg-stone-400",
        word: `ship velocity ${v.direction}`,
        detail: `${pct} vs ${compareLabel}`,
        hero: pct,
      };
    }
    case "new":
      return {
        dot: "bg-emerald-500",
        word: "new throughput",
        detail: `no ships in ${compareLabel}`,
        hero: "new",
      };
    case "quiet":
      return {
        dot: "bg-stone-400",
        word: "ship velocity quiet",
        detail: "no ships in either window yet",
        hero: "—",
      };
    case "none":
      return {
        dot: "bg-stone-400",
        word: "all-time record",
        detail: "no earlier period to compare",
        hero: "—",
      };
  }
}

/** the Engine-read paragraph — computed sentences, never narration. */
function engineRead(data: InsightsData): React.ReactNode {
  const { trend, pairCount, medianMs, projects, window } = data;
  const top = projects.find((p) => p.shipped > 0);
  const where =
    top && data.throughput.totalShipped > 0 ? (
      <>
        {" "}
        Most ships landed in <span className="font-mono text-stone-700">{top.name}</span> (
        {top.shipped} of {data.throughput.totalShipped}).
      </>
    ) : null;

  if (trend.firstMs !== null && trend.secondMs !== null && trend.firstMs !== trend.secondMs) {
    const faster = trend.secondMs < trend.firstMs;
    return (
      <>
        You&rsquo;ve gotten {faster ? "faster" : "slower"} over the {window.label} — median
        time-to-ship {faster ? "dropped" : "rose"} from{" "}
        <span className="font-mono text-stone-900">{formatDuration(trend.firstMs)}</span> to{" "}
        <span className="font-mono text-stone-900">{formatDuration(trend.secondMs)}</span>.
        {where}
      </>
    );
  }
  if (medianMs !== null) {
    return (
      <>
        Median time-to-ship is{" "}
        <span className="font-mono text-stone-900">{formatDuration(medianMs)}</span> across{" "}
        {pairCount} measured {pairCount === 1 ? "ship" : "ships"}
        {trend.firstMs !== null && trend.firstMs === trend.secondMs
          ? " — steady across both halves of the window"
          : ""}
        .{where}
      </>
    );
  }
  return (
    <>
      There&rsquo;s no filed → shipped history in this window yet — dispatch and ship a few
      Tickets and this read starts talking.
    </>
  );
}

/** throughput sentence — "best yet" only when it's true. */
function throughputSentence(data: InsightsData): React.ReactNode {
  const { bars, currentIndex, bestIndex, totalShipped } = data.throughput;
  const week = (i: number) => (
    <span className="font-mono text-amber-600 font-semibold">W{i + 1}</span>
  );
  if (totalShipped === 0) {
    return <>No ships in this window yet — the axis below is waiting.</>;
  }
  if (bestIndex === currentIndex) {
    return (
      <>
        Ships per week. This week ({week(currentIndex)}) is your best yet.
      </>
    );
  }
  return (
    <>
      Ships per week. Your best was {week(bestIndex!)} — {bars[bestIndex!].shipped} shipped.
    </>
  );
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireOwner();
  const params = await searchParams;
  const range: InsightsRange = isInsightsRange(params.range) ? params.range : "12w";
  const [data, cursor] = await Promise.all([insightsData(range), latestCursor()]);
  const { window, throughput } = data;
  const vel = velocityMeta(data.velocity, window.compareLabel);

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      <PageHeader kind="routed" breadcrumb={`Insights · ${window.label}`} nav={<RangeControl range={range} />}>
        <div className="grid grid-cols-[1fr_360px] gap-16">
          <div className="max-w-2xl">
            {/* Hero (OO:66–93) */}
            <h1 className="text-5xl font-bold tracking-tighter">How you&rsquo;re shipping.</h1>
            <p className="mt-4 text-2xl leading-tight tracking-tight text-stone-700">
              <span className="font-mono font-bold tracking-tighter text-stone-900">
                {throughput.totalShipped}
              </span>{" "}
              {throughput.totalShipped === 1 ? "Ticket" : "Tickets"} shipped {window.heroLabel} ·{" "}
              <span className="font-mono font-bold tracking-tighter text-rose-600">
                {throughput.totalFailed}
              </span>{" "}
              failed ·{" "}
              <span className="font-mono font-bold tracking-tighter text-amber-600">
                {data.medianMs === null ? "—" : `~${formatDuration(data.medianMs)}`}
              </span>{" "}
              median time-to-ship.
            </p>
            <div className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
              {/* canon §2.7: a computed stat never pulses (OO:85–88 drew a LivePulse) */}
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${vel.dot}`} />
              <span>{vel.word}</span>
              <span className="text-stone-400 normal-case tracking-normal font-sans text-xs italic">
                {vel.detail}
              </span>
            </div>

            {/* Engine read (OO:96–111) — honest aggregation, M6 digest idiom */}
            <section className="mt-16">
              <MonoSectionLabel dot="amber">Engine read</MonoSectionLabel>
              <p className="mt-5 text-base text-stone-700 leading-relaxed">{engineRead(data)}</p>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                composed from your live feed
              </div>
            </section>

            {/* THROUGHPUT (OO:114–185) */}
            <section className="mt-20">
              <MonoSectionLabel rule count={`${throughput.bars.length} weeks`}>
                Weekly throughput
              </MonoSectionLabel>
              <p className="mt-5 text-base text-stone-700 leading-relaxed">
                {throughputSentence(data)}
              </p>

              <div className="mt-8">
                <WeekBars
                  size="figure"
                  currentIndex={throughput.currentIndex}
                  bars={throughput.bars.map((b) => ({
                    label: b.label,
                    value: b.shipped,
                    negative: b.failed,
                  }))}
                />
              </div>
              <div className="mt-4 flex items-baseline gap-5 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                <span className="flex items-baseline gap-2">
                  <span className="inline-block h-2 w-2 rounded-sm bg-amber-500" />
                  shipped
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="inline-block h-2 w-2 rounded-sm bg-rose-400/80" />
                  failed
                </span>
              </div>
              <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest italic text-stone-400">
                Fig. 1 — weekly throughput, stacked
              </div>
            </section>

            {/* TIME TO SHIP (OO:188–225) */}
            <section className="mt-20">
              {/* honesty: OO:194 says "from triage to merge" — the record measures filed → shipped */}
              <MonoSectionLabel rule count="from filed to shipped">
                Time to ship
              </MonoSectionLabel>
              {data.percentiles.length === 0 ? (
                <div className="mt-6">
                  <EmptyState shape="strip">
                    No Ticket has gone filed → shipped in this window yet — percentiles appear
                    once ships land.
                  </EmptyState>
                </div>
              ) : (
                <>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    How long a Ticket sits between being filed and the code landing — measured
                    across {data.pairCount} shipped{" "}
                    {data.pairCount === 1 ? "Ticket" : "Tickets"}.
                  </p>
                  <div className="mt-8 space-y-5">
                    {data.percentiles.map((row) => (
                      <div key={row.label}>
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="text-stone-700">{row.label}</span>
                          <span className="font-mono text-stone-900">
                            {formatDuration(row.ms)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1 w-full bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400/70"
                            style={{ width: `${row.widthPct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* PER PROJECT (OO:228–281) */}
            <section className="mt-20">
              <MonoSectionLabel rule count={`${data.projects.length} active`}>
                Per Project
              </MonoSectionLabel>
              {data.projects.length === 0 ? (
                <div className="mt-6">
                  <EmptyState shape="strip">
                    No Project shipped or failed anything in this window.
                  </EmptyState>
                </div>
              ) : (
                <ol className="divide-y divide-stone-200">
                  {data.projects.map((p, i) => (
                    <li key={p.slug}>
                      <Link
                        href={`/projects/${p.slug}`}
                        className="py-5 grid grid-cols-[40px_1fr_auto] items-baseline gap-6 group cursor-pointer"
                      >
                        <span className="font-mono text-xs text-stone-400">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>
                          <span className="flex items-baseline gap-3 text-base">
                            <span className="font-mono font-medium text-stone-900">{p.name}</span>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                              {p.sharePct}% of all ships
                            </span>
                          </span>
                          <span className="mt-1 block font-mono text-xs text-stone-500">
                            <span className="text-emerald-700">{p.shipped} shipped</span>
                            <span className="mx-1.5 text-stone-300">·</span>
                            <span className="text-rose-700">{p.failed} failed</span>
                            <span className="mx-1.5 text-stone-300">·</span>
                            {p.avgMs === null ? (
                              // honesty: no measured pairs → no invented average
                              <span className="text-stone-400">avg unmeasured</span>
                            ) : (
                              <span className="text-stone-700">
                                avg ~{formatDuration(p.avgMs)}
                              </span>
                            )}
                          </span>
                          <span className="mt-3 block h-1 w-full bg-stone-200 rounded-full overflow-hidden">
                            <span
                              className="block h-full rounded-full bg-amber-500"
                              style={{ width: `${p.sharePct}%` }}
                            />
                          </span>
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                          open →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* STRAGGLERS (OO:284–319) */}
            <section className="mt-20">
              <MonoSectionLabel rule count="sitting longer than typical">
                Stragglers
              </MonoSectionLabel>
              {data.stragglers.length === 0 ? (
                <div className="mt-10">
                  <EmptyState
                    shape="column"
                    goodNews="Nothing is sitting longer than typical — that's a good thing."
                  />
                </div>
              ) : (
                <ol className="divide-y divide-stone-200">
                  {data.stragglers.map((t, i) => (
                    <li key={t.ref}>
                      <Link
                        href={`/tickets/${t.ref}`}
                        className="py-5 grid grid-cols-[40px_1fr_auto] items-baseline gap-6 group cursor-pointer"
                      >
                        <span className="font-mono text-xs text-stone-400">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>
                          <span className="block text-base font-medium text-stone-900">
                            {t.title}
                          </span>
                          <span className="mt-1 block font-mono text-[10px] uppercase tracking-widest text-stone-400">
                            {t.ref} · {t.projectName} · in{" "}
                            <span className="text-amber-700">
                              {t.blockedBy
                                ? `blocked-by ${t.blockedBy}`
                                : isTicketState(t.state)
                                  ? ticketStateLabel(t.state)
                                  : t.state}
                            </span>{" "}
                            for <span className="text-rose-700">{formatAge(t.ageMs)}</span>
                          </span>
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                          open →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          {/* RAIL (OO:323–405) — 360 default per §3.1 */}
          <aside className="space-y-14">
            <section>
              <MonoSectionLabel>Velocity</MonoSectionLabel>
              <div className="mt-3">
                <span className="relative text-2xl font-bold tracking-tight">
                  {vel.hero}
                  <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                {data.velocity.kind === "compared" ? (
                  <>
                    {data.velocity.direction === "up"
                      ? "Faster than"
                      : data.velocity.direction === "down"
                        ? "Slower than"
                        : "Even with"}{" "}
                    {window.compareLabel} — {throughput.totalShipped}{" "}
                    {throughput.totalShipped === 1 ? "ship" : "ships"} vs {data.prevShipped}.
                    {data.projects[0] && data.projects[0].shipped > 0 && (
                      <>
                        {" "}
                        Most of it is{" "}
                        <span className="font-mono text-stone-700">{data.projects[0].name}</span>.
                      </>
                    )}
                  </>
                ) : data.velocity.kind === "new" ? (
                  <>
                    No ships in {window.compareLabel} — this window&rsquo;s{" "}
                    {throughput.totalShipped} are all new throughput.
                  </>
                ) : data.velocity.kind === "quiet" ? (
                  <>No ships in either window yet.</>
                ) : (
                  <>The all-time view has no earlier period to compare.</>
                )}
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Median ship time</span>
                  <span className="font-mono text-stone-900">
                    {data.medianMs === null ? "—" : formatDuration(data.medianMs)}
                  </span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Failure rate</span>
                  {/* canon §1.1 over OO:352's emerald — a rate isn't "healthy", it's a number */}
                  <span className="font-mono text-stone-900">
                    {data.outcomes.failureRatePct === null
                      ? "—"
                      : `${data.outcomes.failureRatePct}%`}
                  </span>
                </li>
                {/* honesty: replaces OO:347–349 "Engine quota used" — see gap line */}
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Helper Runs</span>
                  <span className="font-mono text-stone-900">
                    {data.helpers.helper} of {data.helpers.total}
                  </span>
                </li>
              </ul>
              <p className="mt-4 text-xs italic text-stone-400 leading-relaxed">
                Engine hours aren&rsquo;t tracked, so there&rsquo;s no quota meter here.
              </p>
            </section>

            {/* Engine suggests (OO:357–373) */}
            <FeaturedCard>
              <MonoSectionLabel dot="amber">Engine suggests</MonoSectionLabel>
              {data.slowest ? (
                <>
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                    Your slowest Project is{" "}
                    <span className="font-mono text-stone-900">{data.slowest.name}</span> —{" "}
                    {formatDuration(data.slowest.avgMs!)} average filed → shipped across{" "}
                    {data.slowest.pairCount} measured{" "}
                    {data.slowest.pairCount === 1 ? "ship" : "ships"}.{" "}
                    {data.slowestContext && data.slowestContext.confirmedTerms === 0 ? (
                      <>Its Context has no confirmed terms yet — a refresh would probably help.</>
                    ) : data.slowestContext?.lastTouchedAt ? (
                      <>
                        Its Context was last touched{" "}
                        {formatAge(data.now.getTime() - data.slowestContext.lastTouchedAt.getTime())}{" "}
                        ago.
                      </>
                    ) : null}
                  </p>
                  <form action={`/projects/${data.slowest.slug}/context`} className="mt-5">
                    {/* §2.9 w-full primary carries the amber dot (OO:370 predates the strict-dot ruling) */}
                    <PillButton kind="primary" fullWidth dot="amber" type="submit">
                      Open {data.slowest.name} Context
                    </PillButton>
                  </form>
                </>
              ) : (
                <p className="mt-3 text-sm italic text-stone-500 leading-relaxed">
                  No measured ships in this window yet — suggestions appear once the record has
                  filed → shipped history.
                </p>
              )}
            </FeaturedCard>

            {/* Export (OO:375–397) — CSV real; PNG dropped (file header) */}
            <section>
              <MonoSectionLabel>Export</MonoSectionLabel>
              <ul className="mt-5 space-y-2 text-sm">
                <li>
                  <a
                    href={`/insights/export${range === "12w" ? "" : `?range=${range}`}`}
                    className="flex items-baseline justify-between group cursor-pointer"
                  >
                    <span className="text-stone-700 group-hover:text-stone-900">
                      Insights as CSV
                    </span>
                    <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                      ↗
                    </span>
                  </a>
                </li>
              </ul>
            </section>

            <section className="pt-4 border-t border-stone-200/80">
              <p className="text-sm italic text-stone-500 leading-relaxed">
                These are Owner-only — Collaborators don&rsquo;t see velocity or per-project
                stats.
              </p>
            </section>
          </aside>
        </div>
      </PageHeader>
    </main>
  );
}
