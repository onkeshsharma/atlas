/**
 * M6 — Inbox: the cross-project "what's happened" feed.
 *
 * Ported from design/variants/variant-z-inbox.tsx:106–388 over real
 * feed_events rows. Canon: §2.2 routed header (pt-8 + mono kicker row),
 * §3.1 `[1fr_360px]` grid, §2.5 rule-rows, §1.1 tone law (Z's sky-400
 * folds to sky-500 — state-social), §3.6 glyphs (`mark all read →`,
 * not Z:165's `↗` — the action stays in Atlas), §3.8 voice.
 *
 * Z was drafted Collaborator-flavored; v2.0's inbox reader is the Owner,
 * so the rail's explanatory copy is adapted to the Owner persona
 * (deviation — see HANDOFF-M6; M13 re-derives the Collaborator inbox).
 *
 * M12 — the charter's inbox wiring: rows link to their Run
 * (/runs/[ref]) or Ticket (/tickets/[ref]); the reply card's CTA opens
 * the real ticket. `linked` rows keep the kind-map rendering (HANDOFF-M8
 * item 4's richer composer judged not warranted — the sentence already
 * reads "you linked T-279 — blocks T-280").
 */
import Link from "next/link";

import {
  DOT_TONE_CLASS,
  EmptyState,
  MonoSectionLabel,
  PageHeader,
  PillButton,
  StateDot,
  UnderlineInput,
} from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireUser } from "@/src/domain/auth/guard";
import { redirect } from "next/navigation";
import { weekStart } from "@/src/domain/cockpit/queries";
import {
  KIND_CONNECTOR,
  KIND_TONE,
  KIND_WORD,
  KIND_WORD_CLASS,
} from "@/src/domain/feed/kinds";
import {
  eventCountSince,
  kindCountSince,
  recentFeedEvents,
  type FeedRow,
} from "@/src/domain/feed/queries";
import { latestCursor } from "@/src/domain/live/broker";
import { needsInputRuns, reviewReadyRuns } from "@/src/domain/run/queries";
import { shortAgo } from "@/src/lib/format";

import { answerRunAction, approveShipAction, markAllReadAction, sendBackAction } from "./actions";
import { CollabInbox } from "./collab-inbox";
import { FilterChips, type InboxFilter } from "./filter-chips";

export const dynamic = "force-dynamic";

const GROUPS = ["Today", "Yesterday", "Earlier this week", "Last week", "Older"] as const;
type Group = (typeof GROUPS)[number];

/**
 * Phase 1 — soft cap per Agent-Inbox lane. The header count stays honest (true
 * total); only the first N render their action forms, with a "+N more →"
 * overflow to the board. Keeps a busy day (many parallel runs — the whole
 * point of the vision) from burying the Notify feed under a wall of forms.
 */
const LANE_CAP = 6;

function groupFor(at: Date, now: Date): Group {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  if (at >= dayStart) return "Today";
  const yesterday = new Date(dayStart);
  yesterday.setDate(yesterday.getDate() - 1);
  if (at >= yesterday) return "Yesterday";
  const thisWeek = weekStart(now);
  if (at >= thisWeek) return "Earlier this week";
  const lastWeek = new Date(thisWeek);
  lastWeek.setDate(lastWeek.getDate() - 7);
  if (at >= lastWeek) return "Last week";
  return "Older";
}

const RUN_KINDS = new Set([
  "dispatched",
  "started",
  "needs-input",
  "answered",
  "review-ready",
  "failed",
  "cancelled",
]);

function matches(filter: InboxFilter, e: FeedRow): boolean {
  if (filter === "shipped") return e.kind === "shipped";
  if (filter === "replies") return e.kind === "replied";
  if (filter === "runs") return e.runId !== null || RUN_KINDS.has(e.kind);
  return true;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const user = await requireUser();
  if (!user.role) redirect("/no-access");

  const { show } = await searchParams;
  const filter: InboxFilter =
    show === "shipped" || show === "replies" || show === "runs" ? show : "everything";

  // M13 — the Collaborator inbox (charter item 4): scoped rows, per-user
  // read marks, Z's original collab rail copy. The Owner keeps M6's page.
  if (user.role === "collaborator") {
    return <CollabInbox user={user} filter={filter} />;
  }

  const now = new Date();
  const thisWeek = weekStart(now);
  const lastWeek = new Date(thisWeek);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const [events, cursor, shippedThisWeek, totalThisWeek, totalLastWeek, questions, reviews] =
    await Promise.all([
      recentFeedEvents(50),
      latestCursor(),
      kindCountSince("shipped", thisWeek),
      eventCountSince(thisWeek),
      eventCountSince(lastWeek, thisWeek),
      needsInputRuns(),
      reviewReadyRuns(),
    ]);

  const unread = events.filter((e) => e.readAt === null);
  const unreadReplies = unread.filter((e) => e.kind === "replied");
  const latestReply = unreadReplies[0];
  const visible = events.filter((e) => matches(filter, e));

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      {/* top row (Z:161–168) — routed header: mono kicker + right action */}
      <PageHeader
        kind="routed"
        breadcrumb="Inbox"
        nav={
          unread.length > 0 ? (
            <form action={markAllReadAction}>
              {/* canon §3.6 — `→`, not Z:165's `↗` (the action stays in Atlas) */}
              <button
                type="submit"
                className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
              >
                mark all read →
              </button>
            </form>
          ) : undefined
        }
      >
        <div className="grid grid-cols-[1fr_360px] gap-16">
          {/* MAIN COL (Z:172–288) */}
          <div className="max-w-2xl">
            {/* Hero (Z:174–184) */}
            <div className="flex items-baseline gap-6 flex-wrap">
              <h1 className="text-5xl font-bold tracking-tighter">What&rsquo;s happened.</h1>
              <p className="text-base text-stone-500">
                <span className="font-mono text-amber-600">{unread.length}</span> new ·{" "}
                <span className="font-mono text-stone-900">{totalThisWeek}</span> total this
                week
              </p>
            </div>

            {/* Phase 1 — the Agent Inbox: actionable lanes ABOVE the feed. Act
                on a Question or a Review right here without navigating; the
                grouped feed below stays the Notify lane. */}
            {(questions.length > 0 || reviews.length > 0) && (
              <div className="mt-10 space-y-10">
                {questions.length > 0 && (
                  <section>
                    <MonoSectionLabel rule count={questions.length} dot="amber">
                      Needs your answer
                    </MonoSectionLabel>
                    <ul className="divide-y divide-stone-200">
                      {questions.slice(0, LANE_CAP).map((r) => (
                        <li key={r.id} className="py-5">
                          <div className="flex items-baseline justify-between gap-4">
                            <Link
                              href={`/runs/${r.ref}`}
                              className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-600 cursor-pointer"
                            >
                              {r.ref} · {r.projectName}
                            </Link>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 whitespace-nowrap">
                              waiting {shortAgo(r.since)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm italic text-stone-700 leading-relaxed">
                            {r.question.prompt}
                          </p>
                          {r.question.kind === "permission" && r.question.options?.length ? (
                            <form
                              action={answerRunAction}
                              className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2"
                            >
                              <input type="hidden" name="runId" value={r.id} />
                              {r.question.options.map((option) => (
                                <button
                                  key={option}
                                  type="submit"
                                  name="choice"
                                  value={option}
                                  className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer transition"
                                >
                                  {option} →
                                </button>
                              ))}
                            </form>
                          ) : (
                            <form action={answerRunAction} className="mt-2 flex items-end gap-4">
                              <input type="hidden" name="runId" value={r.id} />
                              <div className="flex-1">
                                <UnderlineInput
                                  name="text"
                                  placeholder="Answer the Engine…"
                                  aria-label={`Answer ${r.ref}`}
                                />
                              </div>
                              <span className="py-2">
                                <PillButton kind="ghost" type="submit">
                                  answer →
                                </PillButton>
                              </span>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                    {questions.length > LANE_CAP && (
                      <Link
                        href="/board"
                        className="mt-3 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-600 cursor-pointer"
                      >
                        + {questions.length - LANE_CAP} more →
                      </Link>
                    )}
                  </section>
                )}

                {reviews.length > 0 && (
                  <section>
                    <MonoSectionLabel rule count={reviews.length} dot="emerald">
                      Ready for your review
                    </MonoSectionLabel>
                    <ul className="divide-y divide-stone-200">
                      {reviews.slice(0, LANE_CAP).map((r) => (
                        <li key={r.id} className="py-5">
                          <div className="flex items-baseline justify-between gap-4">
                            <Link
                              href={`/runs/${r.ref}/diff`}
                              className="text-base text-stone-900 hover:text-amber-600 cursor-pointer"
                            >
                              {r.title}
                            </Link>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 whitespace-nowrap">
                              {shortAgo(r.since)}
                            </span>
                          </div>
                          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                            {r.ref} · {r.projectName}
                            {r.filesChanged > 0 && (
                              <>
                                <span className="mx-1">·</span>
                                {r.filesChanged} file{r.filesChanged === 1 ? "" : "s"}{" "}
                                <span className="text-emerald-600">+{r.insertions}</span>{" "}
                                <span className="text-rose-500">&minus;{r.deletions}</span>
                              </>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                            <form action={approveShipAction}>
                              <input type="hidden" name="runId" value={r.id} />
                              <PillButton kind="ship" type="submit">
                                Approve &amp; ship →
                              </PillButton>
                            </form>
                            <Link
                              href={`/runs/${r.ref}/diff`}
                              className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
                            >
                              review diff →
                            </Link>
                            <form action={sendBackAction}>
                              <input type="hidden" name="runId" value={r.id} />
                              <button
                                type="submit"
                                className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-600 cursor-pointer"
                              >
                                send back →
                              </button>
                            </form>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {reviews.length > LANE_CAP && (
                      <Link
                        href="/board"
                        className="mt-3 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-600 cursor-pointer"
                      >
                        + {reviews.length - LANE_CAP} more →
                      </Link>
                    )}
                  </section>
                )}
              </div>
            )}

            <FilterChips selected={filter} />

            {/* Grouped notifications (Z:198–282) */}
            <div className="mt-12 space-y-12">
              {visible.length === 0 && (
                <div className="py-10">
                  <EmptyState
                    shape="column"
                    note="Nothing here."
                    goodNews="Nothing matches this filter yet."
                  />
                </div>
              )}
              {GROUPS.map((group) => {
                const groupEvents = visible.filter((e) => groupFor(e.createdAt, now) === group);
                if (groupEvents.length === 0) return null;
                return (
                  <section key={group}>
                    <MonoSectionLabel rule count={groupEvents.length}>
                      {group}
                    </MonoSectionLabel>
                    <ol className="divide-y divide-stone-200">
                      {groupEvents.map((e) => {
                        const isUnread = e.readAt === null;
                        const connector = KIND_CONNECTOR[e.kind];
                        // M12 — Run rows open the Run, Ticket rows the
                        // Ticket (charter item 4a); rows about neither
                        // (joined…) stay plain.
                        const target = e.runRef
                          ? `/runs/${e.runRef}`
                          : e.ticketRef
                            ? `/tickets/${e.ticketRef}`
                            : null;
                        const rowClass =
                          "py-5 grid grid-cols-[12px_1fr_auto] items-baseline gap-4 group";
                        const row = (
                          <>
                            {/* unread indicator OR spent dot (Z:219–230) */}
                            <span className="relative h-1.5 w-1.5 mt-2">
                              <span
                                className={`inline-block h-1.5 w-1.5 rounded-full ${
                                  isUnread ? DOT_TONE_CLASS[KIND_TONE[e.kind]] : "bg-stone-200"
                                }`}
                              />
                            </span>
                            <div>
                              {/* the sentence (Z:233–253): who · mono kind word · rest */}
                              <div
                                className={`text-base leading-snug ${
                                  isUnread ? "text-stone-900" : "text-stone-600"
                                }`}
                              >
                                <span className="font-medium">{e.actor}</span>{" "}
                                <span
                                  className={`font-mono text-xs uppercase tracking-widest mx-1 ${
                                    isUnread ? KIND_WORD_CLASS[e.kind] : "text-stone-400"
                                  }`}
                                >
                                  {KIND_WORD[e.kind]}
                                </span>{" "}
                                {connector ? `${connector} ` : ""}
                                {e.summary}
                              </div>
                              {/* project context (Z:255–263) */}
                              {(e.projectName || e.ticketRef) && (
                                <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                                  {e.projectName && <>in {e.projectName}</>}
                                  {e.projectName && e.ticketRef && (
                                    <span className="mx-1">·</span>
                                  )}
                                  {e.ticketRef}
                                </div>
                              )}
                              {/* preview quote (Z:265–269) */}
                              {e.preview && (
                                <p className="mt-2 text-sm italic text-stone-600 leading-relaxed">
                                  &ldquo;{e.preview}&rdquo;
                                </p>
                              )}
                            </div>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 whitespace-nowrap text-right">
                              {shortAgo(e.createdAt)}
                            </span>
                          </>
                        );
                        return (
                          <li key={e.id}>
                            {target ? (
                              <Link href={target} className={`${rowClass} cursor-pointer`}>
                                {row}
                              </Link>
                            ) : (
                              <div className={rowClass}>{row}</div>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                );
              })}
            </div>
          </div>

          {/* RIGHT RAIL (Z:291–377) */}
          <aside className="space-y-14">
            {/* This week hero (Z:293–321) */}
            <section>
              <MonoSectionLabel>This week</MonoSectionLabel>
              <div className="mt-3">
                <span className="relative text-2xl font-bold tracking-tight">
                  {unread.length} unread
                  <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                {totalThisWeek >= totalLastWeek ? (
                  <>
                    Up from <span className="font-mono">{totalLastWeek}</span> updates last
                    week.
                  </>
                ) : (
                  <>
                    Down from <span className="font-mono">{totalLastWeek}</span> updates last
                    week. You&rsquo;re on top of it.
                  </>
                )}
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Shipped for you</span>
                  <span className="font-mono text-emerald-600">{shippedThisWeek}</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Replies waiting</span>
                  <span className="font-mono text-sky-600">{unreadReplies.length}</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Updates this week</span>
                  <span className="font-mono text-stone-900">{totalThisWeek}</span>
                </li>
              </ul>
            </section>

            {/* Reply CTA — featured (Z:324–338); renders only when real */}
            {latestReply && (
              <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                {/* §1.1 — sky-500, folding Z:326's sky-400 to the canon step */}
                <MonoSectionLabel dot="sky">
                  Someone&rsquo;s waiting on you
                </MonoSectionLabel>
                <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                  {latestReply.actor} replied{" "}
                  {latestReply.ticketRef && (
                    <>
                      on{" "}
                      <span className="font-mono text-stone-900">
                        {latestReply.ticketRef}
                      </span>{" "}
                    </>
                  )}
                  {shortAgo(latestReply.createdAt)}.
                  {/* Z:332 carries the reply's content — ours quotes it verbatim */}
                  {latestReply.preview && (
                    <span className="italic"> &ldquo;{latestReply.preview}&rdquo;</span>
                  )}
                </p>
                <div className="mt-5">
                  {/* Z:334 — w-full primary, no dot. M12 — wired: a GET form
                      navigates to the M8 ticket page (no nested interactive
                      elements, no kit change). */}
                  {latestReply.ticketRef ? (
                    <form action={`/tickets/${latestReply.ticketRef}`} method="get">
                      <PillButton kind="primary" fullWidth dot="none" type="submit">
                        Open the reply
                      </PillButton>
                    </form>
                  ) : (
                    <PillButton kind="primary" fullWidth dot="none" disabled>
                      Open the reply
                    </PillButton>
                  )}
                </div>
              </section>
            )}

            {/* What you hear about (Z:341–368) — Owner-persona copy */}
            <section>
              <MonoSectionLabel>What you hear about</MonoSectionLabel>
              <ul className="mt-5 space-y-3 text-sm">
                <li className="flex items-baseline gap-2">
                  <span className="mt-1.5 inline-flex shrink-0">
                    <StateDot tone="emerald" />
                  </span>
                  <span className="text-stone-700">
                    Ships and finished Runs across your projects
                  </span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className="mt-1.5 inline-flex shrink-0">
                    <StateDot tone="sky" />
                  </span>
                  <span className="text-stone-700">
                    Replies and joins from your circle
                  </span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className="mt-1.5 inline-flex shrink-0">
                    <StateDot tone="amber" />
                  </span>
                  <span className="text-stone-700">
                    Runs that need your input or review
                  </span>
                </li>
              </ul>
            </section>

            {/* Footer (Z:371–376) — M13 copy-truth sweep: the Notifier is live
                (Collaborator ship emails + digests); the Owner reads HERE. */}
            <section className="pt-4 border-t border-stone-200/80">
              <p className="text-sm italic text-stone-500 leading-relaxed">
                This page is the durable record of what happened. Collaborators can get
                ship emails and a weekly digest; your cockpit never depends on email.
              </p>
            </section>
          </aside>
        </div>
      </PageHeader>
    </main>
  );
}
