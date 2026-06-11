/**
 * M9 Session B — the Brief composer (W; PRD #19).
 *
 * Ported from design/variants/variant-w-brief.tsx:90–303 — hero, tabs,
 * the full-width border-t mono editor, dispatch row; the editing state
 * itself lives in ./composer.tsx (client).
 *
 * canon §3.1: brief W is full-bleed — the variant's 360 rail (AI
 * suggests / If-dispatched / Source Ticket / Draft history, W:177–292)
 * does NOT port; canon wins over the variant (master plan §5.4). The
 * reading column keeps a measure (max-w-3xl, the KK dense-main width) —
 * flagged in HANDOFF-M9 with the rail-content ledger candidate.
 *
 * Honest states:
 * - Brief FINAL (already dispatched): read-only record + the run link —
 *   the Engine read it verbatim; editing history would be revisionism.
 * - No Brief yet: the composer opens empty with a real
 *   "draft with the Engine ↻" affordance (enqueues the Helper Run).
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { BriefProse } from "@/src/components/run/BriefProse";
import { requireOwner } from "@/src/domain/auth/guard";
import { bridgePresence } from "@/src/domain/bridge/status";
import { latestEngineBriefForTicket } from "@/src/domain/dispatch/brief-edit";
import {
  activeHelperRun,
  latestBriefForTicket,
  latestRunForTicket,
} from "@/src/domain/dispatch/queries";
import { latestCursor } from "@/src/domain/live/broker";
import { ticketByRef } from "@/src/domain/ticket/queries";
import { shortAgo } from "@/src/lib/format";

import { BriefComposer } from "./composer";
import { queueBriefDraftAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function BriefComposerPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  await requireOwner();
  const { ref } = await params;
  const ticket = await ticketByRef(decodeURIComponent(ref));
  if (!ticket) notFound();

  const [brief, engineBrief, draftingRun, ownerRun, bridge, cursor] = await Promise.all([
    latestBriefForTicket(ticket.id),
    latestEngineBriefForTicket(ticket.id),
    activeHelperRun(ticket.id, "draft-brief"),
    latestRunForTicket(ticket.id),
    bridgePresence(),
    latestCursor(),
  ]);

  const finalized = brief?.status === "final";
  const ownerDraft = brief && brief.status === "draft" && brief.source === "owner" ? brief : null;
  const canDispatch = ticket.state === "approved";
  const dispatchHint = canDispatch
    ? null
    : ticket.state === "in-progress"
      ? "a Run owns this Ticket right now"
      : `dispatch starts from Approved — this Ticket is ${ticket.state.replace(/-/g, " ")}`;

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      {/* canon §3.1: W is full-bleed — no rail; measure kept (see header) */}
      <div className="max-w-3xl">
        {finalized && brief ? (
          <>
            {/* read-only record — see header */}
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Tickets · {ticket.ref} · Brief
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                final · dispatched {shortAgo(brief.updatedAt)}
              </div>
            </div>
            <div className="mt-12 font-mono text-xs uppercase tracking-widest text-stone-500">
              filed by {ticket.reporter}
              <span className="mx-2 text-stone-300">·</span>
              {brief.source === "helper-run" ? "drafted by Engine" : "edited by you"}
            </div>
            <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
              {ticket.title}
            </h1>
            <p className="mt-4 text-lg text-stone-700 leading-relaxed">
              This Brief is final — the Engine read it verbatim
              {ownerRun && (
                <>
                  {" "}
                  in{" "}
                  <Link href={`/runs/${ownerRun.ref}`} className="text-amber-600 hover:underline">
                    {ownerRun.ref}
                  </Link>
                </>
              )}
              . The record doesn&rsquo;t revise.
            </p>
            <div className="mt-12 border-t border-stone-200 pt-6">
              <BriefProse markdown={brief.body} />
            </div>
          </>
        ) : (
          <>
            <BriefComposer
              ticketId={ticket.id}
              ticketRef={ticket.ref}
              initialBriefId={ownerDraft?.id ?? null}
              initialBody={brief?.body ?? ""}
              initialSavedAt={brief ? brief.updatedAt.toISOString() : null}
              engineDraft={engineBrief?.body ?? null}
              canDispatch={canDispatch}
              dispatchHint={dispatchHint}
              bridgeMachine={bridge.status === "healthy" ? bridge.machine : null}
              hero={
                <BriefComposerHero
                  reporter={ticket.reporter}
                  source={brief ? brief.source : null}
                  drafting={Boolean(draftingRun)}
                  title={ticket.title}
                />
              }
            />
            {/* no draft yet — the real draft-with-Engine affordance */}
            {!brief && (
              <div className="mt-6">
                {draftingRun ? (
                  <p className="text-sm italic text-stone-500">
                    The Engine is drafting the Brief now — {draftingRun.ref} is on it; it
                    appears here the moment it lands.
                  </p>
                ) : (
                  <form action={queueBriefDraftAction} className="text-sm italic text-stone-500">
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="projectId" value={ticket.projectId} />
                    <input type="hidden" name="ticketRef" value={ticket.ref} />
                    Nothing drafted yet — write your own above, or{" "}
                    <button
                      type="submit"
                      className="not-italic font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
                    >
                      draft with the Engine ↻
                    </button>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

/** W:107–120 — the kicker + title + lede (server-rendered; static). */
function BriefComposerHero({
  reporter,
  source,
  drafting,
  title,
}: {
  reporter: string;
  source: "helper-run" | "owner" | null;
  drafting: boolean;
  title: string;
}) {
  return (
    <div className="mt-12">
      <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
        filed by {reporter}
        <span className="mx-2 text-stone-300">·</span>
        {source === "helper-run"
          ? "drafted by Engine"
          : source === "owner"
            ? "edited by you"
            : drafting
              ? "Engine drafting now"
              : "no draft yet"}
      </div>
      <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">{title}</h1>
      <p className="mt-4 text-lg text-stone-700 leading-relaxed">
        Edit the Brief before dispatching it. The Engine will read it verbatim — so be
        specific about acceptance criteria and out-of-scope.
      </p>
    </div>
  );
}
