/**
 * M13 — the Collaborator's ticket view (charter item 4; PRD #43/#44/#47).
 *
 * No variant draws a collab DETAIL page — T (the list) is the spec for
 * this persona's anatomy, so this view composes T's own idioms over the
 * kit: the plain-English state line (T:219), the owner-note quote block
 * (T:230–241), the emerald verify affordance (T:244) — here carrying
 * the REAL verify prose (verifyProse — the exact sentence the ship
 * email sends, one source of truth), the reply thread + composer
 * (PRD #47; §2.13 forms), and a simplified 360 rail in T's rail
 * vocabulary (You-scope footer T:358). Recorded as a derived surface in
 * HANDOFF-M13.
 *
 * THE GUARD: collabTicketByRef resolves through projectAccessFor — an
 * off-roster ref 404s (done criterion 2).
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { DOT_TONE_CLASS, EmptyState, MonoSectionLabel, PageHeader, PillButton, UnderlineTextarea } from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import type { CurrentUser } from "@/src/domain/auth/current-user";
import { collabTicketByRef } from "@/src/domain/collab/queries";
import { COLLAB_STATE_LABEL, TICKET_DOT_TONE, isCollabOpen } from "@/src/domain/collab/states";
import { latestCursor } from "@/src/domain/live/broker";
import { verifyProse } from "@/src/domain/notifier/compose-ship";
import { parseRunDiffStats } from "@/src/domain/run/diff-stats";
import { shortAgo, timeAgo } from "@/src/lib/format";

import { replyAction } from "./collab-actions";

export async function CollabTicketView({
  refParam,
  user,
}: {
  refParam: string;
  user: CurrentUser;
}) {
  const [detail, cursor] = await Promise.all([
    collabTicketByRef(refParam, user.id),
    latestCursor(),
  ]);
  if (!detail) notFound(); // unknown ref OR off-roster — same 404, no oracle

  const { ticket, projectName, shippedRun, thread } = detail;
  const paragraphs = ticket.body ? ticket.body.split("\n\n") : [];
  const diff = shippedRun ? parseRunDiffStats(shippedRun.diffStats) : null;
  const verify =
    ticket.state === "shipped"
      ? verifyProse({ projectName, ticketTitle: ticket.title, diff })
      : null;
  const isMine = (actor: string) => actor.toLowerCase() === user.email.toLowerCase();

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      <PageHeader kind="routed" breadcrumb={`Tickets · yours · ${ticket.ref}`} />

      <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
        {/* MAIN COL */}
        <div className="max-w-2xl">
          {/* hero — T's row anatomy at page scale */}
          <div className="flex items-baseline gap-2.5">
            <span
              // canon §1.1 — the canonical TICKET_DOT_TONE map (T's drift tones fold)
              className={`inline-block h-2 w-2 rounded-full mt-3 shrink-0 ${DOT_TONE_CLASS[TICKET_DOT_TONE[ticket.state]]}`}
            />
            <h1 className="text-5xl font-bold tracking-tighter leading-tight">{ticket.title}</h1>
          </div>
          <p className="mt-4 text-lg text-stone-600">
            {COLLAB_STATE_LABEL[ticket.state]}
            <span className="text-stone-400"> · since {shortAgo(ticket.updatedAt)}</span>
          </p>

          {/* your story — the reporter's own words (S's body, read back) */}
          {paragraphs.length > 0 && (
            <section className="mt-12">
              <MonoSectionLabel rule>What you asked for</MonoSectionLabel>
              <div className="mt-5 space-y-5 text-lg text-stone-700 leading-relaxed">
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          )}

          {/* shipped — the verify prose (the ship email's exact sentence) */}
          {verify && (
            <section className="mt-12">
              <MonoSectionLabel rule>See what changed</MonoSectionLabel>
              <div className="relative mt-7 pl-6">
                {/* §2.15 — emerald PullQuote in shipped contexts (AA:75) */}
                <span className="absolute -left-1 -top-2 font-bold text-4xl text-emerald-400/80 leading-none select-none">
                  &ldquo;
                </span>
                <p className="text-base italic text-stone-800 leading-relaxed">{verify}</p>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  what the Engine did, in plain language
                </div>
              </div>
            </section>
          )}

          {/* the conversation (PRD #47) */}
          <section className="mt-12">
            <MonoSectionLabel rule count={thread.length || undefined}>
              The conversation
            </MonoSectionLabel>
            {thread.length > 0 ? (
              <ol className="divide-y divide-stone-200">
                {thread.map((row) => (
                  <li key={row.id} className="py-5">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-sm font-medium text-stone-900">
                        {isMine(row.actor) ? "You" : "The Owner"}
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          {row.kind === "replied" ? "replied" : "asked"}
                        </span>
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 whitespace-nowrap">
                        {timeAgo(row.at)}
                      </span>
                    </div>
                    {/* T:230's quote block carries each line */}
                    <div className="mt-2 pl-4 border-l-2 border-stone-200">
                      <p className="text-sm italic text-stone-700 leading-relaxed">
                        &ldquo;{row.note}&rdquo;
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-5">
                <EmptyState shape="strip">
                  No back-and-forth yet — your reply lands straight in the Owner&rsquo;s inbox.
                </EmptyState>
              </div>
            )}

            {/* the reply composer — writes through the outboxed mutation */}
            <form action={replyAction} className="mt-8">
              <input type="hidden" name="ref" value={ticket.ref} />
              <UnderlineTextarea
                name="text"
                rows={3}
                label="Reply to the Owner"
                placeholder={
                  ticket.state === "needs-info"
                    ? "Answer the Owner's question — plain English is exactly enough."
                    : "Add context, answer a question, or say what you're seeing."
                }
              />
              <div className="mt-4 flex items-center gap-4">
                <PillButton kind="primary" type="submit">
                  Send reply
                </PillButton>
                <span className="italic text-sm text-stone-500">
                  goes straight to the Owner — no email needed
                </span>
              </div>
            </form>
          </section>
        </div>

        {/* RIGHT RAIL — simplified (charter: T's rail vocabulary) */}
        <aside className="space-y-14">
          {/* Where it stands */}
          <section>
            <MonoSectionLabel>Where it stands</MonoSectionLabel>
            <div className="mt-3">
              <span className="relative text-2xl font-bold tracking-tight">
                {COLLAB_STATE_LABEL[ticket.state]}
                <span
                  className={`absolute -bottom-1 left-0 h-[2px] w-8 ${
                    ticket.state === "shipped"
                      ? "bg-emerald-500"
                      : ticket.state === "failed"
                        ? "bg-rose-500"
                        : "bg-amber-500"
                  }`}
                />
              </span>
            </div>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Filed</span>
                <span className="font-mono text-stone-900">{timeAgo(ticket.createdAt)}</span>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Last movement</span>
                <span className="font-mono text-stone-900">{timeAgo(ticket.updatedAt)}</span>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Project</span>
                <span className="font-mono text-stone-900">{projectName}</span>
              </li>
            </ul>
          </section>

          {/* What happens next — collaborator-true steps */}
          {isCollabOpen(ticket.state) && (
            <section>
              <MonoSectionLabel>What happens next</MonoSectionLabel>
              <ol className="mt-5 space-y-3 text-sm text-stone-700 leading-relaxed">
                <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                  <span className="font-mono text-xs text-stone-400">→</span>
                  <span>The Owner reviews it and the Engine builds it.</span>
                </li>
                <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                  <span className="font-mono text-xs text-stone-400">→</span>
                  <span>You&rsquo;ll see every move here, in plain English.</span>
                </li>
                <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                  <span className="font-mono text-xs text-stone-400">→</span>
                  <span>When it ships, this page tells you how to check it works.</span>
                </li>
              </ol>
            </section>
          )}

          {/* shipped follow-up — the V-page "Did it work?" idiom, collab-flavored */}
          {ticket.state === "shipped" && (
            <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
              <MonoSectionLabel dot="emerald">Did it work?</MonoSectionLabel>
              <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                Try it. If something&rsquo;s still off, file a follow-up — re-opening is a
                new Ticket.
              </p>
              <div className="mt-5">
                <Link
                  href="/tickets/new"
                  className="block w-full text-center font-mono text-xs uppercase tracking-widest text-stone-700 bg-white border border-stone-200 hover:border-rose-300 hover:text-rose-700 px-3 py-3 rounded-full transition cursor-pointer"
                >
                  Still broken — file a follow-up
                </Link>
              </div>
            </section>
          )}

          {/* scope footer (T:358–363) */}
          <section className="pt-4 border-t border-stone-200/80">
            <p className="text-sm italic text-stone-500 leading-relaxed">
              You see your own Tickets and what shipped that affects you. The Owner sees
              everything across the project.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
