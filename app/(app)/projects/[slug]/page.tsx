/**
 * M7 — /projects/[slug], the project landing, ported from
 * design/variants/variant-o-project.tsx:77–450 (hero · count sentence ·
 * presence line · Engine suggests · jump chips · pinned · activity ·
 * 360 rail). Canon: §2.2 routed header, §2.3 rows, §2.4 rail cards,
 * §3.1 default rail, §3.3 live vocabulary, §3.4 ship CTA.
 *
 * Deviations (flagged for HANDOFF-M7):
 *  - O:84 "File a Ticket" header CTA is M8's surface — the header slot
 *    carries the charter's pin/unpin affordance instead (PRD #32).
 *  - O:128 "healthy · build green" renders only from a real clean ingest
 *    health block; O:136 "2 viewing now" (live viewers) → "N active
 *    today" from real feed actors (M6 presence precedent).
 *  - O:149 Engine-suggests prose is honest aggregation over live rows
 *    (M6 AI-digest precedent); "open triage →"/"regenerate ↻" dropped
 *    (board is M8; no LLM wiring yet).
 *  - O:184–187 Kanban/Triage/Review/Failed jump chips target M8's
 *    board — chips render only for surfaces that exist (ingest,
 *    context); the counts already live in the sentence + rail.
 *  - O:351 "parallel-safe / Ship Group" claim needs the Hints engine
 *    (M8/M9) — honest copy without the claim (M6 deviation-6 precedent);
 *    O:363's `↗` → `→` per §3.6 (review stays in Atlas).
 *  - O:368 Bridge mini renders the honest §2.17 strip until M9/M10.
 *  - O:392 member roster is M11 — renders the real instance membership
 *    (owner mark + collaborator count), no fake presence dots.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  DividedList,
  EmptyState,
  EmptyStateLink,
  FeaturedCard,
  InitialMark,
  ListRow,
  LivePulse,
  MonoSectionLabel,
  PageHeader,
  PillButton,
  RecentChip,
  WeekBars,
  DOT_TONE_CLASS,
} from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireOwner } from "@/src/domain/auth/guard";
import { bridgePresence } from "@/src/domain/bridge/status";
import { activeToday } from "@/src/domain/people/presence";
import { latestActorActivity, projectRoster } from "@/src/domain/people/queries";
import { weekStart } from "@/src/domain/cockpit/queries";
import { KIND_CONNECTOR, KIND_TONE, KIND_WORD } from "@/src/domain/feed/kinds";
import {
  activitySparklines,
  actorsActiveToday,
  recentFeedEvents,
} from "@/src/domain/feed/queries";
import { latestCursor } from "@/src/domain/live/broker";
import {
  contextTermsFor,
  latestFailedTicket,
  pinnedTickets,
  projectBySlug,
  projectIngestSummary,
  reviewReadyTickets,
  shippedThisWeek,
  ticketStateCounts,
} from "@/src/domain/project/queries";
import {
  TICKET_DOT_TONE,
  TICKET_WORD_CLASS,
  ticketStateLabel,
} from "@/src/domain/ticket/states";
import { shortAgo, timeAgo } from "@/src/lib/format";

import { setPinnedAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProjectLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireOwner();
  const { slug } = await params;
  const project = await projectBySlug(slug);
  if (!project) notFound();

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  // M11 seam closure — the rail's Members section reads the REAL roster
  // (owner + project_members) and per-person derived presence.
  const [counts, pins, ship, failed, actors, feed, sparklines, shipped, terms, roster, activity, cursor, bridge] =
    await Promise.all([
      ticketStateCounts(project.id),
      pinnedTickets(project.id),
      reviewReadyTickets(project.id),
      latestFailedTicket(project.id),
      actorsActiveToday(dayStart, project.id),
      recentFeedEvents(7, project.id),
      activitySparklines(),
      shippedThisWeek(project.id, weekStart(new Date())),
      contextTermsFor(project.id),
      projectRoster(project.id),
      latestActorActivity(30),
      latestCursor(),
      bridgePresence(), // M15 audit — the Bridge strip must tell the truth
    ]);
  const membersActiveToday = roster.filter((m) =>
    activeToday(
      { displayName: m.displayName, handle: m.handle, email: m.email, isOwner: m.role === "owner" },
      activity,
      dayStart,
    ),
  ).length;

  const summary = projectIngestSummary(project);
  const healthy = summary !== null && summary.health.every((h) => h.ok);
  const week = sparklines.get(project.id) ?? [0, 0, 0, 0, 0, 0, 0];
  const dayLetters = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString("en-US", { weekday: "narrow" });
  });
  const refreshedAt = feed[0]?.createdAt ?? project.createdAt;

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      <PageHeader
        kind="routed"
        breadcrumb={`Projects · ${project.name}`}
        nav={
          // deviation — pin/unpin lives here (see header comment).
          <form action={setPinnedAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="slug" value={project.slug} />
            <input type="hidden" name="pinned" value={String(!project.pinned)} />
            <button
              type="submit"
              className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
            >
              {project.pinned ? (
                <>
                  <span className="text-amber-500">★</span> pinned · unpin
                </>
              ) : (
                <>pin to Today ★</>
              )}
            </button>
          </form>
        }
      >
        <div className="grid grid-cols-[1fr_360px] gap-16">
          {/* MAIN COL (O:93–270) */}
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold tracking-tighter">{project.name}.</h1>
            <p className="mt-4 text-lg text-stone-700 leading-relaxed">
              {project.description ?? "No description yet."}{" "}
              {project.ingestStatus === "ready" && project.ingestedAt ? (
                <>
                  Ingested{" "}
                  <span className="font-mono text-stone-900">
                    {timeAgo(project.ingestedAt)}
                  </span>
                  .
                </>
              ) : project.ingestStatus === "queued" ? (
                <>Ingest queued.</>
              ) : (
                <>Not ingested yet.</>
              )}
            </p>

            {/* Count sentence (O:102–119) — real grouped counts */}
            <p className="mt-8 text-2xl leading-tight tracking-tight text-stone-700">
              <span className="font-mono font-bold tracking-tighter text-stone-900">
                {counts.open}
              </span>{" "}
              open Tickets ·{" "}
              <span className="font-mono font-bold tracking-tighter text-stone-900">
                {counts.byState.triage}
              </span>{" "}
              waiting on triage ·{" "}
              <span className="font-mono font-bold tracking-tighter text-amber-600">
                {counts.byState["review-ready"]}
              </span>{" "}
              ready to ship.
              {counts.byState.failed > 0 && (
                <>
                  {" "}
                  <span className="font-mono font-bold tracking-tighter text-rose-600">
                    {counts.byState.failed}
                  </span>{" "}
                  failed.
                </>
              )}
            </p>

            {/* Presence + insight line (O:122–146) — honest spans only */}
            <div className="mt-5 flex items-baseline gap-4 flex-wrap font-mono text-[10px] uppercase tracking-widest text-stone-500">
              {healthy && (
                <span className="flex items-center gap-2">
                  <LivePulse color="emerald" />
                  <span>healthy · last ingest clean</span>
                </span>
              )}
              {actors.length > 0 && (
                <>
                  {healthy && <span className="text-stone-300">·</span>}
                  <span className="flex items-center gap-2">
                    <LivePulse color="emerald" />
                    <span>{actors.length} active today</span>
                    <span className="text-stone-400 normal-case tracking-normal font-sans text-xs italic">
                      {actors.map((a) => a.toLowerCase()).join(", ")}
                    </span>
                  </span>
                </>
              )}
              {failed && (
                <>
                  {(healthy || actors.length > 0) && (
                    <span className="text-stone-300">·</span>
                  )}
                  <span className="normal-case tracking-normal font-sans text-xs italic text-stone-500">
                    <span className="font-mono not-italic text-rose-700">
                      {failed.ref}
                    </span>{" "}
                    failed {shortAgo(failed.updatedAt)} — worth a look
                  </span>
                </>
              )}
            </div>

            {/* Engine suggests (O:149–176) — honest aggregation, see header */}
            <section className="mt-12">
              <MonoSectionLabel dot="amber">Engine suggests</MonoSectionLabel>
              <p className="mt-5 text-base text-stone-700 leading-relaxed">
                {counts.byState.triage > 0 ? (
                  <>
                    Clear the{" "}
                    <span className="font-semibold text-stone-900">Triage queue</span>{" "}
                    ({counts.byState.triage}{" "}
                    {counts.byState.triage === 1 ? "item" : "items"}) before the next
                    dispatch.
                  </>
                ) : (
                  <>The triage queue is clear.</>
                )}
                {ship.length > 0 && (
                  <>
                    {" "}
                    {ship.map((t, i) => (
                      <span key={t.id}>
                        {i > 0 && (i === ship.length - 1 ? " and " : ", ")}
                        <span className="font-mono text-emerald-700">{t.ref}</span>
                      </span>
                    ))}{" "}
                    {ship.length === 1 ? "is" : "are"} ready for your review.
                  </>
                )}
                {counts.open === 0 && ship.length === 0 && (
                  <> Nothing here demands you right now.</>
                )}
              </p>
              <div className="mt-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                <span>refreshed {shortAgo(refreshedAt)}</span>
                <span className="text-stone-300">·</span>
                <span>composed from your live feed</span>
              </div>
            </section>

            {/* Jump to (O:179–191) — only chips that can jump (see header) */}
            <section className="mt-16">
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Jump to
              </div>
              <div className="mt-5 flex items-center gap-2 flex-wrap">
                {/* §7.3 — kit RecentChip (UU:105 shape) carries O's chip role */}
                <RecentChip href={`/projects/${project.slug}/ingest`}>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-700">
                    Ingest summary
                  </span>{" "}
                  <span className="font-mono text-[10px] text-stone-400">→</span>
                </RecentChip>
                <RecentChip href={`/projects/${project.slug}/context`}>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-700">
                    CONTEXT.md
                  </span>{" "}
                  <span className="font-mono text-[10px] text-stone-400">→</span>
                </RecentChip>
              </div>
            </section>

            {/* Pinned tickets (O:194–229) — hidden when empty (M6 precedent) */}
            {pins.length > 0 && (
              <section className="mt-16">
                <MonoSectionLabel rule count={pins.length}>
                  Pinned
                </MonoSectionLabel>
                <ul className="divide-y divide-stone-200">
                  {pins.map((t) => (
                    <li
                      key={t.id}
                      className="py-5 grid grid-cols-[auto_1fr_auto] items-baseline gap-4 group"
                    >
                      <span className="text-amber-500">★</span>
                      <div>
                        <div className="flex items-baseline gap-2.5 text-lg tracking-tight">
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full mt-2 shrink-0 ${DOT_TONE_CLASS[TICKET_DOT_TONE[t.state]]}`}
                          />
                          <span>{t.title}</span>
                        </div>
                        <div className="mt-1 ml-4 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          {t.ref} ·{" "}
                          <span className={TICKET_WORD_CLASS[t.state]}>
                            {ticketStateLabel(t.state)}
                          </span>{" "}
                          · filed by {t.reporter}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-stone-400 whitespace-nowrap">
                        {shortAgo(t.updatedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* What's happening (O:232–270) — project-scoped feed */}
            <section className="mt-16">
              <MonoSectionLabel rule count={feed.length}>
                What&rsquo;s happening
              </MonoSectionLabel>
              {feed.length > 0 ? (
                <DividedList ordered>
                  {feed.map((e, i) => {
                    const [lead, rest] = e.summary.split(" — ");
                    const connector = KIND_CONNECTOR[e.kind];
                    return (
                      <ListRow
                        key={e.id}
                        index={String(i + 1).padStart(2, "0")}
                        dotTone={KIND_TONE[e.kind]}
                        title={
                          <span className="text-base text-stone-700 leading-snug">
                            <span className="font-medium text-stone-900">
                              {e.actor}
                            </span>{" "}
                            {KIND_WORD[e.kind]}{" "}
                            {connector ? `${connector} ` : ""}
                            {e.ticketRef ?? lead}
                            {rest && (
                              <>
                                {" "}
                                · <span className="italic">{rest}</span>
                              </>
                            )}
                          </span>
                        }
                        right={shortAgo(e.createdAt)}
                      />
                    );
                  })}
                </DividedList>
              ) : (
                <div className="py-10">
                  <EmptyState
                    shape="column"
                    note="Nothing here."
                    goodNews="Nothing has happened on this project yet."
                  />
                </div>
              )}
              <Link
                href="/inbox"
                className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
              >
                all activity →
              </Link>
            </section>
          </div>

          {/* RIGHT RAIL (O:274–448) */}
          <aside className="space-y-14">
            {/* Project hero (O:276–343) */}
            <section>
              <MonoSectionLabel>Project</MonoSectionLabel>
              <div className="mt-3">
                <span className="relative text-2xl font-bold tracking-tight">
                  {counts.open} open Ticket{counts.open === 1 ? "" : "s"}
                  <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                {counts.byState["review-ready"]}{" "}
                {counts.byState["review-ready"] === 1 ? "is" : "are"} ready to ship.
                {counts.byState.failed > 0 && (
                  <>
                    {" "}
                    <span className="text-rose-600">
                      {counts.byState.failed} failed
                    </span>{" "}
                    {counts.byState.failed === 1 ? "needs" : "need"} your attention.
                  </>
                )}
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Triage</span>
                  <span className="font-mono text-stone-900">
                    {counts.byState.triage}
                  </span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">In progress</span>
                  <span className="font-mono text-stone-900">
                    {counts.byState["in-progress"]}
                  </span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Review ready</span>
                  <span className="font-mono text-amber-600">
                    {counts.byState["review-ready"]}
                  </span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Shipped this week</span>
                  <span className="font-mono text-stone-900">{shipped}</span>
                </li>
              </ul>

              {/* O:309–342 — 7-day chart; data = real per-project feed
                  activity (the M6 sparkline series), so the label says so */}
              <div className="mt-6">
                <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-2">
                  7-day activity
                </div>
                <WeekBars
                  bars={dayLetters.map((label, i) => ({ label, value: week[i] }))}
                  currentIndex={6}
                />
              </div>
            </section>

            {/* Ready to ship (O:346–365) — honest copy, §3.4 emerald CTA */}
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
                  <PillButton kind="ship" fullWidth>
                    Ship {ship.length} now
                  </PillButton>
                </div>
                <a className="mt-3 block text-center font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:underline cursor-pointer">
                  Review first →
                </a>
              </FeaturedCard>
            )}

            {/* Bridge mini (O:368–389) — M15 §2.17 audit: the "no Bridge
                is paired" claim went false when M10 shipped pairing; the
                strip now tells the truth per bridgePresence. O's full
                Bridge mini stats stay REGISTERED (HANDOFF-M15). */}
            <section>
              <MonoSectionLabel>Bridge</MonoSectionLabel>
              <div className="mt-3">
                {bridge.status === "none" ? (
                  <EmptyState shape="strip">
                    No Bridge is paired with this Atlas yet. Runs for this project
                    queue until one connects.
                  </EmptyState>
                ) : (
                  <EmptyState shape="strip">
                    <span className="font-mono not-italic text-xs text-stone-700">
                      {bridge.machine}
                    </span>{" "}
                    is {bridge.status === "healthy" ? "online" : "offline"} — the
                    full panel lives in{" "}
                    <EmptyStateLink href="/settings/bridges">Bridges</EmptyStateLink>.
                  </EmptyState>
                )}
              </div>
            </section>

            {/* M18 — repo source honest status (charter §7) */}
            {(project.repoUrl || project.localPath) && (
              <section>
                <MonoSectionLabel>Repo</MonoSectionLabel>
                <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  {project.repoUrl && project.localPath ? (
                    <span>cloned at {project.localPath}</span>
                  ) : project.repoUrl && !project.localPath ? (
                    <span>will clone on the first run</span>
                  ) : (
                    <span>local checkout · {project.localPath}</span>
                  )}
                </div>
              </section>
            )}

            {/* Members (O:392–417) — M11 seam closure (HANDOFF-M7 note):
                real per-project roster + derived presence + the restored
                "manage members →". O:413 "2 active now" → "active today"
                (the M6 presence derivation; no liveness channel). */}
            <section>
              <MonoSectionLabel>Members</MonoSectionLabel>
              <div className="mt-5 flex items-center gap-4">
                {roster.map((m) => (
                  <InitialMark
                    key={m.userId}
                    initial={m.initial}
                    presence={
                      activeToday(
                        {
                          displayName: m.displayName,
                          handle: m.handle,
                          email: m.email,
                          isOwner: m.role === "owner",
                        },
                        activity,
                        dayStart,
                      )
                        ? "emerald"
                        : undefined
                    }
                  />
                ))}
              </div>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                {roster.some((m) => m.role === "owner") ? "1 owner" : "no owner yet"} ·{" "}
                {roster.filter((m) => m.role === "collaborator").length} collaborator
                {roster.filter((m) => m.role === "collaborator").length === 1 ? "" : "s"}
                {membersActiveToday > 0 && <> · {membersActiveToday} active today</>}
              </div>
              <Link
                href={`/projects/${project.slug}/members`}
                className="mt-3 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
              >
                manage members →
              </Link>
            </section>

            {/* Quick links footer (O:420–447) */}
            <section className="pt-4 border-t border-stone-200/80">
              <ul className="text-sm space-y-2">
                <li>
                  <Link
                    href={`/projects/${project.slug}/ingest`}
                    className="flex items-baseline justify-between group cursor-pointer"
                  >
                    <span className="text-stone-700 group-hover:text-stone-900">
                      Ingest summary
                    </span>
                    <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                      →
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/projects/${project.slug}/context`}
                    className="flex items-baseline justify-between group cursor-pointer"
                  >
                    <span className="text-stone-700 group-hover:text-stone-900">
                      Project CONTEXT.md
                    </span>
                    <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                      →
                    </span>
                  </Link>
                </li>
                {project.repoUrl && (
                  <li>
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-baseline justify-between group cursor-pointer"
                    >
                      <span className="text-stone-700 group-hover:text-stone-900">
                        Repository
                      </span>
                      <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                        ↗
                      </span>
                    </a>
                  </li>
                )}
              </ul>
            </section>

            {/* context terms exist — quiet cross-ref (rail footnote §3.1) */}
            {terms.confirmed.length > 0 && (
              <section className="pt-4 border-t border-stone-200/80">
                <p className="text-sm italic text-stone-500 leading-relaxed">
                  {/* Turbopack JSX gotcha — keep the {" "} after the inline expr */}
                  {terms.confirmed.length} term
                  {terms.confirmed.length === 1 ? "" : "s"}
                  {" "}in this project&rsquo;s language
                  {terms.suggested.length > 0 && (
                    <>
                      {" "}
                      · {terms.suggested.length} Engine suggestion
                      {terms.suggested.length === 1 ? "" : "s"} waiting
                    </>
                  )}
                  .
                </p>
              </section>
            )}
          </aside>
        </div>
      </PageHeader>
    </main>
  );
}
