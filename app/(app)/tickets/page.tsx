/**
 * M13 — /tickets: the Collaborator's tickets view (variant T; PRD #43).
 *
 * Ported from design/variants/variant-t-collab.tsx:148–364 (breadcrumb +
 * file CTA row, "What you've filed." hero with the counts sentence,
 * filter chips, the plain-English divided list with owner-note quote
 * blocks + verify/reply links, 360 rail: You hero → question card →
 * recently shipped → scope footer). ROUTE DECISION (charter item 4,
 * recorded): T is a LIST surface ("My tickets" breadcrumb, T:152), so it
 * claims /tickets; the per-ticket collab view lives on /tickets/[ref]
 * (the role branch). Owners hitting /tickets land on /board — their
 * list IS the board.
 *
 * Canon over variant (one-line comments at each site): chips are kit
 * ScopeChips (§2.13, M6 precedent); state dots fold to the canonical
 * TICKET_DOT_TONE map (§1.1 — T's amber-400 in-progress / sky-400
 * needs-info are pre-canon drift); the file CTA drops T:155's dot
 * (§2.9 strict-dot: inline pills carry no dot).
 *
 * THE GUARD: every row comes from collabTickets() which scopes through
 * visibleProjectIds (HANDOFF-M11) — never re-derived here.
 */
import Link from "next/link";
import { redirect } from "next/navigation";

import { DOT_TONE_CLASS, EmptyState, MonoSectionLabel, PageHeader } from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireUser } from "@/src/domain/auth/guard";
import {
  collabTickets,
  type CollabTicketRow,
} from "@/src/domain/collab/queries";
import {
  COLLAB_FILTERS,
  COLLAB_STATE_LABEL,
  TICKET_DOT_TONE,
  isCollabOpen,
  matchesCollabFilter,
  type CollabFilter,
} from "@/src/domain/collab/states";
import { latestCursor } from "@/src/domain/live/broker";
import { shortAgo } from "@/src/lib/format";

import { CollabFilterChips } from "./filter-chips";

export const dynamic = "force-dynamic";

function monthStart(now: Date): Date {
  const d = new Date(now);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "~2 days" — T:296's average, computed from real shipped rows. */
function averageToShip(rows: CollabTicketRow[]): string | null {
  const shipped = rows.filter((t) => t.state === "shipped");
  if (!shipped.length) return null;
  const avgMs =
    shipped.reduce((sum, t) => sum + (t.updatedAt.getTime() - t.createdAt.getTime()), 0) /
    shipped.length;
  const hours = avgMs / 3_600_000;
  if (hours < 24) return `~${Math.max(1, Math.round(hours))}h`;
  return `~${Math.round(hours / 24)} day${Math.round(hours / 24) === 1 ? "" : "s"}`;
}

export default async function CollabTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const user = await requireUser();
  if (!user.role) redirect("/no-access");
  if (user.role === "owner") redirect("/board"); // the Owner's list IS the board

  const { show } = await searchParams;
  const filter: CollabFilter = (COLLAB_FILTERS as readonly string[]).includes(show ?? "")
    ? (show as CollabFilter)
    : "everything";

  const [rows, cursor] = await Promise.all([collabTickets(user.id, user.email), latestCursor()]);
  const now = new Date();

  const open = rows.filter((t) => isCollabOpen(t.state));
  const shipped = rows.filter((t) => t.state === "shipped");
  const waiting = rows.filter((t) => t.state === "needs-info");
  const visible = rows.filter((t) => matchesCollabFilter(filter, t.state));
  const firstQuestion = waiting[0];
  const avg = averageToShip(rows);
  const filedThisMonth = rows.filter((t) => t.createdAt >= monthStart(now)).length;

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      {/* top row (T:150–159) — breadcrumb instance-wide (the M8 idiom; T mocked one project) */}
      <PageHeader
        kind="routed"
        breadcrumb="Tickets · yours"
        nav={
          <Link
            href="/tickets/new"
            // canon §2.9 strict-dot: inline pill, no dot (T:155's dot is the named drift)
            className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-2 rounded-full shadow-sm inline-flex items-center gap-2 cursor-pointer"
          >
            File a Ticket
            <span className="text-stone-400">+</span>
          </Link>
        }
      >
        <div className="grid grid-cols-[1fr_360px] gap-16">
          {/* MAIN COL (T:162–272) */}
          <div className="max-w-2xl">
            {/* Hero (T:165–183) */}
            <div className="flex items-baseline gap-6 flex-wrap">
              <h1 className="text-5xl font-bold tracking-tighter">What you&rsquo;ve filed.</h1>
              <p className="text-base text-stone-500">
                <span className="font-mono text-stone-900">{open.length}</span> open ·{" "}
                <span className="font-mono text-emerald-600">{shipped.length}</span> shipped ·{" "}
                <span className="font-mono text-sky-600">{waiting.length}</span> waiting on you
              </p>
            </div>

            <CollabFilterChips selected={filter} waitingCount={waiting.length} />

            {/* Tickets list (T:197–267) */}
            <section className="mt-12">
              {visible.length === 0 ? (
                <div className="py-10">
                  <EmptyState
                    shape="column"
                    note="Nothing here."
                    goodNews={
                      rows.length === 0
                        ? "File your first Ticket — plain English is exactly enough."
                        : "Nothing matches this filter."
                    }
                  />
                </div>
              ) : (
                <ol className="divide-y divide-stone-200">
                  {visible.map((t) => (
                    <li key={t.id} className="py-6 group">
                      <div className="grid grid-cols-[1fr_auto] items-baseline gap-6">
                        <div>
                          {/* Title row (T:207–216) */}
                          <Link href={`/tickets/${t.ref}`} className="flex items-baseline gap-2.5 cursor-pointer">
                            {/* canon §1.1 dots — TICKET_DOT_TONE folds T:86–94's drift tones */}
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full mt-2 shrink-0 ${DOT_TONE_CLASS[TICKET_DOT_TONE[t.state]]}`}
                            />
                            <span className="text-lg tracking-tight font-medium group-hover:text-stone-900">
                              {t.title}
                            </span>
                          </Link>

                          {/* Plain-English state line (T:219–227) */}
                          <div className="mt-1.5 ml-4 text-sm text-stone-600">
                            {COLLAB_STATE_LABEL[t.state]}
                            {t.state !== "shipped" && (
                              <span className="text-stone-400"> · since {shortAgo(t.updatedAt)}</span>
                            )}
                          </div>

                          {/* Owner note (T:230–241) */}
                          {t.ownerNote && (
                            <div className="mt-3 ml-4 pl-4 border-l-2 border-stone-200">
                              <p className="text-sm italic text-stone-700 leading-relaxed">
                                &ldquo;{t.ownerNote}&rdquo;
                              </p>
                              <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                                {t.state === "shipped" ? "what the Owner says" : "what the Owner asked"}
                              </div>
                            </div>
                          )}

                          {/* Verify CTA (T:244–248) — the collab detail carries the verify prose */}
                          {t.state === "shipped" && (
                            <Link
                              href={`/tickets/${t.ref}`}
                              className="mt-3 ml-4 inline-block font-mono text-[10px] uppercase tracking-widest text-emerald-700 hover:text-emerald-800 cursor-pointer"
                            >
                              see what changed →
                            </Link>
                          )}

                          {/* Reply CTA (T:251–255) */}
                          {t.state === "needs-info" && (
                            <Link
                              href={`/tickets/${t.ref}`}
                              className="mt-3 ml-4 inline-block font-mono text-[10px] uppercase tracking-widest text-sky-700 hover:text-sky-800 cursor-pointer"
                            >
                              reply to the Owner →
                            </Link>
                          )}
                        </div>

                        {/* filed column (T:259–263) */}
                        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 text-right whitespace-nowrap">
                          filed
                          <br />
                          <span className="text-stone-500">{shortAgo(t.createdAt)}</span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          {/* RIGHT RAIL (T:275–364) */}
          <aside className="space-y-14">
            {/* You hero (T:277–309) */}
            <section>
              <MonoSectionLabel>You</MonoSectionLabel>
              <div className="mt-3">
                <span className="relative text-2xl font-bold tracking-tight">
                  {rows.length} Ticket{rows.length === 1 ? "" : "s"} filed
                  <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                <span className="font-mono text-emerald-600">{shipped.length}</span> shipped —
                that&rsquo;s real change you made.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Average to ship</span>
                  <span className="font-mono text-stone-900">{avg ?? "—"}</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Filed this month</span>
                  <span className="font-mono text-stone-900">{filedThisMonth}</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Currently open</span>
                  <span className="font-mono text-stone-900">{open.length}</span>
                </li>
              </ul>
            </section>

            {/* What's needed from you (T:312–328) — renders only when real */}
            {firstQuestion && (
              <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                {/* §1.1 — sky-500 (T:314's sky-400 folds to the canon step, M6 precedent) */}
                <MonoSectionLabel dot="sky">Owner asked you something</MonoSectionLabel>
                <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                  On{" "}
                  <span className="font-medium text-stone-900">
                    &ldquo;{firstQuestion.title.length > 32 ? `${firstQuestion.title.slice(0, 32)}...` : firstQuestion.title}&rdquo;
                  </span>
                  {firstQuestion.ownerNote ? <> — the Owner asked a question.</> : <> — your answer unblocks it.</>}
                </p>
                <div className="mt-5">
                  {/* T:324 — w-full primary, variant draws no dot (the Z:334 / M6 precedent) */}
                  <Link
                    href={`/tickets/${firstQuestion.ref}`}
                    className="block w-full text-center font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3 rounded-full shadow-sm cursor-pointer"
                  >
                    Open the question <span className="text-stone-400">→</span>
                  </Link>
                </div>
              </section>
            )}

            {/* Recently shipped (T:331–355) */}
            <section>
              <MonoSectionLabel>Recently shipped for you</MonoSectionLabel>
              {shipped.length > 0 ? (
                <ul className="mt-5 divide-y divide-stone-200">
                  {shipped.slice(0, 3).map((t) => (
                    <li key={t.id} className="py-3 group">
                      <Link href={`/tickets/${t.ref}`} className="flex items-baseline justify-between gap-2 cursor-pointer">
                        <span className="flex items-baseline gap-2 text-sm text-stone-700 group-hover:text-stone-900">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                          <span className="truncate">{t.title}</span>
                        </span>
                        <span className="font-mono text-[10px] text-stone-400 whitespace-nowrap">
                          {shortAgo(t.updatedAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-5">
                  <EmptyState shape="strip">
                    Nothing shipped yet — your first one will land here.
                  </EmptyState>
                </div>
              )}
            </section>

            {/* Scope footer (T:358–363) */}
            <section className="pt-4 border-t border-stone-200/80">
              <p className="text-sm italic text-stone-500 leading-relaxed">
                You see your own Tickets and what shipped that affects you. The Owner sees
                everything across the project.
              </p>
            </section>
          </aside>
        </div>
      </PageHeader>
    </main>
  );
}
