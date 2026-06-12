/**
 * M13 — the Collaborator inbox (PRD #49; HANDOFF-M6 deviation 8 parked
 * the rail copy for this persona, deviation 10 parked the read state).
 *
 * Variant Z was DRAFTED Collaborator-flavored — this branch restores
 * Z's own voice (rail Z:340–368: tickets-you-filed / direct replies /
 * project-wide ships + "Tune notifications →"), which M6 had
 * Owner-adapted. Scope: rows from THEIR visible projects only
 * (collabFeedEvents → visibleProjectIds, THE GUARD — never re-derived);
 * unread = the per-user high-water mark, so the Owner's read state and
 * theirs never touch.
 *
 * Z:371's email-mirroring footer ports conditionally — it is only TRUE
 * when a Resend key exists (charter item 5's copy-truth law).
 */
import Link from "next/link";

import {
  DOT_TONE_CLASS,
  EmptyState,
  MonoSectionLabel,
  PageHeader,
  PillButton,
  StateDot,
} from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import type { CurrentUser } from "@/src/domain/auth/current-user";
import { weekStart } from "@/src/domain/cockpit/queries";
import { collabFeedEvents } from "@/src/domain/collab/queries";
import { readMarkFor } from "@/src/domain/collab/read-marks";
import {
  KIND_CONNECTOR,
  KIND_TONE,
  KIND_WORD,
  KIND_WORD_CLASS,
} from "@/src/domain/feed/kinds";
import type { FeedRow } from "@/src/domain/feed/queries";
import { latestCursor } from "@/src/domain/live/broker";
import { emailConfigured } from "@/src/domain/notifier/deliver";
import { shortAgo } from "@/src/lib/format";

import { markAllReadAction } from "./actions";
import { FilterChips, type InboxFilter } from "./filter-chips";

const GROUPS = ["Today", "Yesterday", "Earlier this week", "Last week", "Older"] as const;
type Group = (typeof GROUPS)[number];

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

export async function CollabInbox({
  user,
  filter,
}: {
  user: CurrentUser;
  filter: InboxFilter;
}) {
  const now = new Date();
  const thisWeek = weekStart(now);

  const [events, mark, cursor] = await Promise.all([
    collabFeedEvents(user.id),
    readMarkFor(user.id),
    latestCursor(),
  ]);

  const unread = events.filter((e) => e.id > mark);
  const isMine = (actor: string) => actor.toLowerCase() === user.email.toLowerCase();
  const unreadReplies = unread.filter((e) => e.kind === "replied" && !isMine(e.actor));
  const latestReply = unreadReplies[0];
  const visible = events.filter((e) => matches(filter, e));
  const shippedThisWeek = events.filter(
    (e) => e.kind === "shipped" && e.createdAt >= thisWeek,
  ).length;
  const totalThisWeek = events.filter((e) => e.createdAt >= thisWeek).length;
  const emailLive = emailConfigured();

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      {/* top row (Z:161–168) */}
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
            <div className="flex items-baseline gap-6 flex-wrap">
              <h1 className="text-5xl font-bold tracking-tighter">What&rsquo;s happened.</h1>
              <p className="text-base text-stone-500">
                <span className="font-mono text-amber-600">{unread.length}</span> new ·{" "}
                <span className="font-mono text-stone-900">{totalThisWeek}</span> total this
                week
              </p>
            </div>

            <FilterChips selected={filter} />

            <div className="mt-12 space-y-12">
              {visible.length === 0 && (
                <div className="py-10">
                  <EmptyState
                    shape="column"
                    note="Nothing here."
                    goodNews="Updates from your projects land on this page."
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
                        const isUnread = e.id > mark;
                        const connector = KIND_CONNECTOR[e.kind];
                        // Collaborators link to Tickets only — Run pages are
                        // the Owner's surfaces (their refs stay plain rows).
                        const target = e.ticketRef ? `/tickets/${e.ticketRef}` : null;
                        const rowClass =
                          "py-5 grid grid-cols-[12px_1fr_auto] items-baseline gap-4 group";
                        const row = (
                          <>
                            <span className="relative h-1.5 w-1.5 mt-2">
                              <span
                                className={`inline-block h-1.5 w-1.5 rounded-full ${
                                  isUnread ? DOT_TONE_CLASS[KIND_TONE[e.kind]] : "bg-stone-200"
                                }`}
                              />
                            </span>
                            <div>
                              <div
                                className={`text-base leading-snug ${
                                  isUnread ? "text-stone-900" : "text-stone-600"
                                }`}
                              >
                                <span className="font-medium">
                                  {isMine(e.actor) ? "You" : e.actor}
                                </span>{" "}
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
                              {(e.projectName || e.ticketRef) && (
                                <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                                  {e.projectName && <>in {e.projectName}</>}
                                  {e.projectName && e.ticketRef && <span className="mx-1">·</span>}
                                  {e.ticketRef}
                                </div>
                              )}
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

          {/* RIGHT RAIL (Z:291–377 — the Collaborator flavor, restored) */}
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
                Everything that happened on your projects, one page.
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

            {/* Reply CTA (Z:324–338) — renders only when real */}
            {latestReply && (
              <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                {/* §1.1 — sky-500 (Z:326's sky-400 folds to the canon step) */}
                <MonoSectionLabel dot="sky">Someone&rsquo;s waiting on you</MonoSectionLabel>
                <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                  {latestReply.actor} replied{" "}
                  {latestReply.ticketRef && (
                    <>
                      on{" "}
                      <span className="font-mono text-stone-900">{latestReply.ticketRef}</span>{" "}
                    </>
                  )}
                  {shortAgo(latestReply.createdAt)}.
                  {latestReply.preview && (
                    <span className="italic"> &ldquo;{latestReply.preview}&rdquo;</span>
                  )}
                </p>
                <div className="mt-5">
                  {latestReply.ticketRef ? (
                    <form action={`/tickets/${latestReply.ticketRef}`} method="get">
                      {/* Z:334 — w-full primary, no dot (the M6 precedent) */}
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

            {/* What you hear about (Z:341–368 — the original collab copy) */}
            <section>
              <MonoSectionLabel>What you hear about</MonoSectionLabel>
              <ul className="mt-5 space-y-3 text-sm">
                <li className="flex items-baseline gap-2">
                  <span className="mt-1.5 inline-flex shrink-0">
                    <StateDot tone="emerald" />
                  </span>
                  <span className="text-stone-700">
                    Tickets you filed: shipped, replied, declined
                  </span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className="mt-1.5 inline-flex shrink-0">
                    <StateDot tone="sky" />
                  </span>
                  <span className="text-stone-700">Direct replies from the Owner</span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className="mt-1.5 inline-flex shrink-0">
                    <StateDot tone="amber" />
                  </span>
                  <span className="text-stone-700">
                    Project-wide ships (only if you have a stake)
                  </span>
                </li>
              </ul>
              {/* Z:365 — real destination: the collab prefs page (PRD #48) */}
              <Link
                href="/settings/notifications"
                className="mt-5 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
              >
                Tune notifications →
              </Link>
            </section>

            {/* Footer (Z:371–376) — TRUE in both key configurations */}
            <section className="pt-4 border-t border-stone-200/80">
              <p className="text-sm italic text-stone-500 leading-relaxed">
                {emailLive ? (
                  <>
                    Atlas mirrors what lands in your email — clear your real inbox without
                    losing track of what shipped.
                  </>
                ) : (
                  <>
                    This page is the durable record of what happened. Ship emails and the
                    weekly digest start sending once a Resend key is configured.
                  </>
                )}
              </p>
            </section>
          </aside>
        </div>
      </PageHeader>
    </main>
  );
}
