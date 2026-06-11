/**
 * M8 — Ticket detail. One page tells the Ticket's whole story (PRD #18).
 *
 * Ported from design/variants/variant-f-ticket-detail.tsx:141–509
 * (breadcrumb → text-5xl title → mono metadata row → text-lg prose body →
 * Activity divided list → Brief section; 360 rail: State hero + track →
 * If-dispatched card → AI → Related → Bridge → notes footer).
 * Canon over variant: routed pages are pt-8 (§2.2/§3.1 — F:143's pt-12 is
 * the Today-only step); rail underline color is the section's semantic
 * state (§3.1), not F's mocked amber-for-backlog.
 *
 * Honest rendering (charter hard walls):
 * - Dispatch CTA renders per F:355 but disabled — dispatch is M9.
 * - Brief section + notes line render their true empty state (no Brief
 *   pipeline exists yet).
 * - Bridge rail section is the M6 "no bridge yet" empty strip, not
 *   F:457–490's mocked healthy stats.
 * - F:325's "2 viewing now" presence line is omitted — per-page presence
 *   isn't knowable yet (M6 Today precedent: honest copy only).
 * - The State rail gains the OWNER_MOVES quiet ghost links (PRD #14 +
 *   charter flow "move to Backlog"; recipe §2.9 ghost + §3.7 step-1) —
 *   the variant drew no move affordance anywhere.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  EmptyState,
  FeaturedCard,
  PillButton,
  PullQuote,
  StateDot,
  StateMachineTrack,
  runStateLabelClass,
  runStateLabelText,
  type TrackStep,
} from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import type { FeedEvent } from "@/src/db/schema";
import { requireOwner } from "@/src/domain/auth/guard";
import { bridgePresence } from "@/src/domain/bridge/status";
import {
  activeHelperRun,
  latestBriefForTicket,
  latestRunForTicket,
} from "@/src/domain/dispatch/queries";
import { latestCursor } from "@/src/domain/live/broker";
import { CATEGORIES, CATEGORY_COLUMNS, ticketCategory } from "@/src/domain/ticket/categories";
import { confidenceSegments, parseEnrichment } from "@/src/domain/ticket/enrichment";
import {
  relatedTickets,
  ticketActivity,
  ticketByRef,
} from "@/src/domain/ticket/queries";
import {
  TICKET_DOT_TONE,
  TICKET_WORD_CLASS,
  ticketStateLabel,
} from "@/src/domain/ticket/states";
import { OWNER_MOVES } from "@/src/domain/ticket/transitions";
import { shortAgo, timeAgo } from "@/src/lib/format";
import type { TicketState } from "@/src/db/schema";

import { AddLinkForm } from "./add-link-form";
import { dispatchTicketAction, moveTicketAction } from "./actions";

export const dynamic = "force-dynamic";

/** F:54–56 — activity rows read "Ada filed this", "You moved to Backlog". */
function activityPhrase(e: FeedEvent): string {
  const payload = (e.payload ?? {}) as { to?: string; direction?: string; otherRef?: string };
  switch (e.kind) {
    case "filed":
      return "filed this";
    case "moved":
      return payload.to ? `moved to ${ticketStateLabel(payload.to as TicketState)}` : "moved it";
    case "linked":
      return payload.direction === "blocks"
        ? `declared this blocks ${payload.otherRef}`
        : `declared this blocked by ${payload.otherRef}`;
    case "replied":
      return "replied";
    default:
      return e.kind.replace(/-/g, " ");
  }
}

function displayActor(actor: string): string {
  return actor === "you" ? "You" : actor.charAt(0).toUpperCase() + actor.slice(1);
}

/** per-state rail sentence (F:320's "Approved by you. Not dispatched yet."). */
const STATE_SENTENCE: Record<TicketState, string> = {
  triage: "Waiting for your triage.",
  "needs-info": "Handed back to the reporter for more.",
  backlog: "Parked deliberately. Pull it forward when ready.",
  approved: "Approved by you. Not dispatched yet.",
  "in-progress": "A Run owns this Ticket right now.",
  "review-ready": "The Run finished — ready for your review.",
  shipped: "Shipped. The record is closed.",
  failed: "The Run failed. Retry paths are open.",
  declined: "Declined. The record is closed.",
};

/** §3.1 — rail hero underline + track tone follow the section's semantic state. */
function heroTone(state: TicketState): { underline: string; track: "amber" | "rose" | "emerald" } {
  if (state === "shipped") return { underline: "bg-emerald-500", track: "emerald" };
  if (state === "failed") return { underline: "bg-rose-500", track: "rose" };
  return { underline: "bg-amber-500", track: "amber" };
}

/** dispatch is still this Ticket's future in these states (card honesty). */
const PRE_DISPATCH_STATES: readonly TicketState[] = [
  "triage",
  "needs-info",
  "backlog",
  "approved",
  "failed",
];

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  await requireOwner();
  const { ref } = await params;

  const ticket = await ticketByRef(decodeURIComponent(ref));
  if (!ticket) notFound();

  const [activity, related, cursor, brief, draftingRun, ownerRun, bridge] = await Promise.all([
    ticketActivity(ticket.id),
    relatedTickets(ticket.id),
    latestCursor(),
    latestBriefForTicket(ticket.id),
    activeHelperRun(ticket.id, "draft-brief"),
    latestRunForTicket(ticket.id),
    bridgePresence(),
  ]);

  const enrichment = parseEnrichment(ticket.enrichment);
  const paragraphs = ticket.body ? ticket.body.split("\n\n") : [];
  const category = ticketCategory(ticket.state);
  const categoryIndex = CATEGORIES.indexOf(category);
  const tone = heroTone(ticket.state);
  const moves = OWNER_MOVES[ticket.state] ?? [];
  const blockers = related.filter((r) => r.relation === "blocks");

  const trackSteps: TrackStep[] = CATEGORY_COLUMNS.map((c, i) => ({
    key: c.key,
    label: c.label,
    status: i < categoryIndex ? "done" : i === categoryIndex ? "current" : "pending",
    at:
      i === categoryIndex
        ? shortAgo(ticket.updatedAt)
        : i === 0
          ? shortAgo(ticket.createdAt)
          : i < categoryIndex
            ? "earlier"
            : null,
  }));

  return (
    <main className="flex-1 relative">
      <LiveRefresh since={cursor} />
      {/* canon §3.1: routed pt-8 (F:143's pt-12 is Today-only — canon wins) */}
      <div className="px-16 pt-8 pb-24 grid grid-cols-[1fr_360px] gap-16">
        {/* LEFT — body rail (F:144–244) */}
        <div className="max-w-2xl">
          <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
            Projects · {ticket.projectName} · {ticket.ref}
          </div>

          <h1 className="mt-2 text-5xl font-bold tracking-tighter leading-tight">
            {ticket.title}
          </h1>

          {/* Metadata row (F:157–165) — state word per §3.3 vocabulary */}
          <div className="mt-4 font-mono text-xs uppercase tracking-widest text-stone-500">
            {ticket.kind ?? "unclassified"}
            <span className="mx-2">·</span>
            filed by {ticket.reporter}
            <span className="mx-2">·</span>
            {timeAgo(ticket.createdAt)}
            <span className="mx-2">·</span>
            <span className={TICKET_WORD_CLASS[ticket.state]}>
              {ticketStateLabel(ticket.state)}
            </span>
          </div>

          {/* Body as editorial prose (F:168–174) */}
          {paragraphs.length > 0 ? (
            <div className="mt-12 space-y-5">
              {paragraphs.map((para, i) => (
                <p key={i} className="text-lg leading-relaxed text-stone-700">
                  {para}
                </p>
              ))}
            </div>
          ) : (
            <div className="mt-12">
              <EmptyState shape="strip">No story attached — just the title.</EmptyState>
            </div>
          )}

          {/* Activity (F:177–199) — this Ticket's real outbox rows */}
          <section className="mt-20">
            <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Activity
              </h2>
            </div>
            {activity.length > 0 ? (
              <ol className="divide-y divide-stone-200">
                {activity.map((a, i) => (
                  <li
                    key={a.id}
                    className="py-5 grid grid-cols-[40px_1fr_auto] items-baseline gap-6"
                  >
                    <span className="font-mono text-xs text-stone-400">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="text-base tracking-tight">
                      <span className="font-medium">{displayActor(a.actor)}</span>{" "}
                      {activityPhrase(a)}
                      {a.preview && (
                        <span className="block mt-1 text-sm italic text-stone-500">
                          &ldquo;{a.preview}&rdquo;
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-stone-400">
                      {shortAgo(a.createdAt)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="pt-5">
                <EmptyState shape="strip">Nothing has happened yet.</EmptyState>
              </div>
            )}
          </section>

          {/* Brief — real rows now exist (M9 pipeline). Minimal honest
              render only: the full F:201–243 port (FeaturedCard chrome,
              edit/regenerate links) is Session B's, with W. */}
          <section className="mt-20">
            <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Brief
              </h2>
              {brief && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  {brief.status} · {brief.source === "helper-run" ? "drafted by the Engine" : "edited by you"}
                </span>
              )}
            </div>
            {brief ? (
              <div className="pt-5 font-mono text-xs leading-relaxed text-stone-700 whitespace-pre-wrap">
                {brief.body}
              </div>
            ) : draftingRun ? (
              <div className="pt-5">
                <EmptyState shape="strip">
                  The Engine is drafting the Brief now — {draftingRun.ref} is on it.
                </EmptyState>
              </div>
            ) : (
              <div className="pt-5">
                <EmptyState shape="strip">
                  No Brief drafted yet — dispatching drafts one from this Ticket first.
                </EmptyState>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT — 360 metadata rail (F:246–509) */}
        <aside className="space-y-14">
          {/* STATE — hero + category track (F:252–322) */}
          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              State
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <StateDot tone={TICKET_DOT_TONE[ticket.state]} size="2" />
              <span className="relative text-2xl font-bold tracking-tight">
                {ticketStateLabel(ticket.state)}
                <span className={`absolute -bottom-1 left-0 h-[2px] w-8 ${tone.underline}`} />
              </span>
            </div>

            <div className="mt-6">
              <StateMachineTrack steps={trackSteps} tone={tone.track} />
            </div>

            <div className="mt-5 text-sm text-stone-500 leading-relaxed">
              {STATE_SENTENCE[ticket.state]}
            </div>

            {/* OWNER_MOVES ghost links (PRD #14; §2.9 ghost, §3.7 danger step-1) */}
            {moves.length > 0 && (
              <div className="mt-3 flex items-center gap-4">
                {moves.map((m) => (
                  <form key={m.to} action={moveTicketAction}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="ref" value={ticket.ref} />
                    <input type="hidden" name="from" value={ticket.state} />
                    <input type="hidden" name="to" value={m.to} />
                    <button
                      type="submit"
                      className={`font-mono text-[10px] uppercase tracking-widest cursor-pointer transition ${
                        m.to === "declined"
                          ? "text-stone-500 hover:text-rose-700"
                          : "text-stone-500 hover:text-amber-600"
                      }`}
                    >
                      {m.label} →
                    </button>
                  </form>
                ))}
              </div>
            )}
          </section>

          {/* IF DISPATCHED (F:338–363) — the CTA is REAL now (M9 charter §8).
              Two-step pipeline: no Brief → first click drafts it (Helper
              Run; the page live-updates); Brief present → dispatch for
              real. Non-approved states keep the honest-disabled form. */}
          {PRE_DISPATCH_STATES.includes(ticket.state) && (
            <FeaturedCard>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                If dispatched
              </div>
              <div className="mt-3 text-sm text-stone-700 leading-relaxed">
                The Engine runs this in its own worktree on your machine, via the Bridge.
              </div>
              <div className="mt-2 text-xs text-stone-500 leading-relaxed">
                {bridge.status === "healthy" ? (
                  <>
                    <span className="font-mono text-stone-600">{bridge.machine}</span> is
                    connected and listening.
                  </>
                ) : bridge.status === "offline" ? (
                  <>
                    <span className="font-mono text-stone-600">{bridge.machine}</span> is
                    offline — Runs queue until it reconnects.
                  </>
                ) : (
                  <>
                    <span className="font-mono text-stone-600">no bridge yet</span> — Runs
                    queue until one pairs.
                  </>
                )}
              </div>
              <div className="mt-5">
                <form action={dispatchTicketAction}>
                  <input type="hidden" name="ticketId" value={ticket.id} />
                  <input type="hidden" name="ref" value={ticket.ref} />
                  <PillButton
                    kind="primary"
                    fullWidth
                    dot="amber"
                    type="submit"
                    disabled={ticket.state !== "approved" || Boolean(draftingRun)}
                  >
                    Dispatch to AI
                  </PillButton>
                </form>
              </div>
              <p className="mt-3 text-center text-xs italic text-stone-500">
                {ticket.state !== "approved"
                  ? "dispatch starts from Approved"
                  : draftingRun
                    ? `the Engine is drafting the Brief — ${draftingRun.ref}`
                    : brief
                      ? "executes the drafted Brief below"
                      : "drafts the Brief first — you confirm before the Engine starts"}
              </p>
            </FeaturedCard>
          )}

          {/* AI (F:365–428) — real enrichment or honest pending */}
          <section>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              AI
            </div>
            {enrichment ? (
              <>
                <p className="mt-4 text-base text-stone-700 leading-relaxed">
                  Looks like {enrichment.kind === "enhancement" ? "an" : "a"}{" "}
                  <span className="font-semibold text-stone-900">{enrichment.kind}</span> at{" "}
                  <span className="font-semibold text-stone-900">{enrichment.severity}</span>{" "}
                  severity.
                  {enrichment.similarTo && (
                    <>
                      {" "}
                      Similar to{" "}
                      <Link
                        href={`/tickets/${enrichment.similarTo}`}
                        className="text-amber-600 hover:underline cursor-pointer"
                      >
                        {enrichment.similarTo}
                      </Link>
                      .
                    </>
                  )}
                </p>

                {/* Confidence meter (F:385–395) */}
                <div className="mt-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  <span>Confidence</span>
                  <span className="flex items-center gap-0.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={`inline-block h-3 w-1.5 ${
                          i < confidenceSegments(enrichment.confidence)
                            ? "bg-amber-500"
                            : "bg-stone-200"
                        }`}
                      />
                    ))}
                  </span>
                  <span className="text-stone-700">{enrichment.confidence}</span>
                </div>

                {enrichment.likelyFiles.length > 0 && (
                  <>
                    <div className="mt-5 text-xs font-mono uppercase tracking-widest text-stone-500">
                      Likely touches
                    </div>
                    <ul className="mt-2 space-y-1">
                      {enrichment.likelyFiles.map((f) => (
                        <li key={f} className="font-mono text-xs text-stone-600">
                          {f}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {enrichment.question && (
                  <div className="mt-7">
                    <PullQuote attribution="AI asks">{enrichment.question}</PullQuote>
                  </div>
                )}

                <div className="mt-5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  enriched {enrichment.enrichedAt.slice(0, 10)}
                </div>
              </>
            ) : (
              <div className="mt-4">
                <EmptyState shape="strip">
                  Enrichment pending — a Helper Run reads new Tickets once the Engine
                  arrives (M9).
                </EmptyState>
              </div>
            )}
          </section>

          {/* RELATED (F:430–455) — real declared edges (PRD #16) */}
          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Related
            </div>
            {related.length > 0 ? (
              <ul className="mt-4 space-y-4">
                {related.map((r) => (
                  <li key={r.id} className="group">
                    <Link href={`/tickets/${r.ref}`} className="block cursor-pointer">
                      <div className="flex items-baseline gap-2 text-sm text-stone-700 group-hover:text-stone-900 leading-snug">
                        <StateDot tone={TICKET_DOT_TONE[r.state]} />
                        <span>{r.title}</span>
                      </div>
                      <div className="mt-1 ml-3.5 font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                        {r.ref} · {ticketStateLabel(r.state)} ·{" "}
                        {r.relation === "blocks" ? "blocks this" : "blocked by this"}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4">
                <EmptyState shape="strip">Nothing linked yet.</EmptyState>
              </div>
            )}
          </section>

          {/* BRIDGE (F:457–490) — real presence from the heartbeat (M9);
              the full healthy-stats panel is M10's surface. */}
          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Bridge
            </div>
            <div className="mt-3">
              {bridge.status === "none" ? (
                <EmptyState shape="strip">
                  No bridge paired yet — pair one and its heartbeat appears here.
                </EmptyState>
              ) : (
                <div className="flex items-baseline gap-2 text-sm text-stone-700">
                  <StateDot tone={bridge.status === "healthy" ? "emerald" : "rose"} />
                  <span className="font-mono text-xs">{bridge.machine}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    {bridge.status === "healthy" ? "heartbeat fresh" : "offline"}
                  </span>
                </div>
              )}
              {ownerRun && (
                <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  last run {ownerRun.ref} ·{" "}
                  <span className={runStateLabelClass(ownerRun.state)}>
                    {runStateLabelText(ownerRun.state)}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* NOTES footer (F:492–508) */}
          <section className="pt-4 border-t border-stone-200/80">
            <ul className="text-sm space-y-2">
              <li className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-stone-500">
                  {blockers.length > 0
                    ? `Blocked by ${blockers.map((b) => b.ref).join(", ")}`
                    : "No blockers"}
                </span>
                <AddLinkForm ticketId={ticket.id} ticketRef={ticket.ref} />
              </li>
              <li className="flex items-baseline justify-between">
                {brief ? (
                  <>
                    <span className="text-stone-500">Brief drafted</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      {brief.status}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-stone-500">No draft Brief yet</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      drafts at dispatch
                    </span>
                  </>
                )}
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
