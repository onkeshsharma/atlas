/**
 * M9 Session B — the LIVE Run page (queued / running / needs-input).
 *
 * Ported from design/variants/variant-rr-enginerun.tsx:101–390 (canon §4
 * M9 row: amber live badge, GateTrack, TerminalBlock, 320 rail; grid +
 * 680px main per RR:115–116). The stream is the REAL per-run stdout SSE
 * (PRD #5) through the kit TerminalBlock's streaming client.
 *
 * Honest-data adaptations (flagged in HANDOFF-M9):
 * - RR's quality gates are the Engine's internal QA steps — unknowable
 *   until a structured gate protocol exists. The GateTrack renders the
 *   run's REAL execution milestones instead (queued → claimed →
 *   worktree → engine → review), derived from row state.
 * - RR:133–141 status row: "est. 1m left" is unknowable — dropped; the
 *   bridge machine + engine flavor are real.
 * - RR:299–302 "Jobs typically ship in 1–4 minutes…" stats aren't
 *   tracked — the card carries an honest sentence instead.
 * - RR:327–331 "Pin to top of feed / Mute notifications" have no pin or
 *   notification system — omitted (fake affordances banned); Cancel is
 *   real (PRD #4).
 * - Hero adapts per live state ("Working on it." is running's sentence;
 *   queued and needs-input get honest siblings of the same shape).
 * - needs-input renders the §3.3 AmberPanel with the REAL answer form
 *   (the variant predates the needs-input state; §3.3's chrome is law).
 * - RR:104 "Jobs · #142" breadcrumb → the M8 instance-wide idiom; it is
 *   Run, never Job (CONTEXT.md).
 */
import Link from "next/link";

import {
  AmberPanel,
  FeaturedCard,
  GateTrack,
  LivePulse,
  PillButton,
  UnderlineInput,
  type Gate,
} from "@/src/components/kit";
import { BriefProse } from "@/src/components/run/BriefProse";
import type { Brief } from "@/src/db/schema";
import type { RunDetail, QueuedAfterRow } from "@/src/domain/run/detail";
import { dispatchedBy, milestoneAt } from "@/src/domain/run/detail";
import { parseNeedsInputQuestion } from "@/src/domain/run/needs-input";
import type { StdoutLine } from "@/src/domain/run/stdout";
import { shortAgo, timeAgo } from "@/src/lib/format";

import { answerRunAction, cancelRunAction } from "./actions";
import { Meta, runBreadcrumb } from "./shared";
import { ElapsedTimer } from "./elapsed";
import { RunStdoutTerminal } from "./stdout-stream";

/** real execution milestones in RR:153–188's gate-progress form (see header). */
function runGates(detail: RunDetail): Gate[] {
  const { run } = detail;
  const claimed = Boolean(detail.run.bridgeId);
  const hasWorktree = Boolean(run.worktreePath);
  const engineLive = run.state === "running" || run.state === "needs-input";
  return [
    { name: "Queued", state: run.state === "queued" ? "active" : "done" },
    { name: "Claimed", state: claimed ? "done" : "pending" },
    { name: "Worktree", state: hasWorktree ? "done" : claimed ? "active" : "pending" },
    { name: "Engine", state: engineLive ? "active" : "pending" },
    { name: "Review", state: "pending" },
  ];
}

const HERO: Record<string, { lead: string; rest: string }> = {
  // sentence-form titles take ONE amber accent phrase (§2.2; RR:121–127)
  running: { lead: "Working", rest: " on it." },
  "needs-input": { lead: "Waiting", rest: " on you." },
  queued: { lead: "In line", rest: "." },
};

export function RunLive({
  detail,
  brief,
  stdout,
  queued,
}: {
  detail: RunDetail;
  brief: Brief | null;
  stdout: { lines: StdoutLine[]; lastSeq: number };
  queued: QueuedAfterRow[];
}) {
  const { run, ticket, bridge } = detail;
  const startedAt = milestoneAt(detail.milestones, "started");
  const question = run.state === "needs-input" ? parseNeedsInputQuestion(run.question) : null;
  const gates = runGates(detail);
  const passed = gates.filter((g) => g.state === "done").length;
  const hero = HERO[run.state] ?? HERO.running;
  const streaming = run.state === "running";
  const by = dispatchedBy(detail.milestones);

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      {/* Top: breadcrumb + live badge (RR:102–113) */}
      <div className="flex items-baseline justify-between gap-8">
        <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
          {runBreadcrumb(detail)} · {run.state.replace(/-/g, " ")}
        </div>
        {streaming ? (
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-amber-700">
            <LivePulse color="amber" />
            live · streaming
          </div>
        ) : run.state === "needs-input" ? (
          // §3.3 — needs-input owns the amber pulse everywhere
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-amber-700">
            <LivePulse color="amber" />
            needs input
          </div>
        ) : (
          <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            queued{run.queuePosition !== null ? ` · position ${run.queuePosition}` : ""}
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-[1fr_320px] gap-16">
        <div className="max-w-[680px]">
          {/* Hero (RR:117–130) */}
          <div className="font-mono text-xs uppercase tracking-widest text-stone-500">Engine</div>
          <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
            <span className="relative">
              {hero.lead}
              <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-amber-500" />
            </span>
            {hero.rest}
          </h1>
          <p className="mt-5 text-xl text-stone-700 leading-relaxed">
            {run.title}
            {brief ? (
              <>
                {" "}
                — your Brief, <span className="font-mono text-base">{timeAgo(brief.createdAt)}</span>{" "}
                old.
              </>
            ) : run.lane === "helper" ? (
              <> — a Helper Run.</>
            ) : null}
          </p>

          {/* Status sentence (RR:133–141; "est." dropped — see header) */}
          <div className="mt-6 flex items-center gap-3 font-mono text-xs text-stone-500 flex-wrap">
            {startedAt ? <span>started {shortAgo(startedAt)}</span> : <span>queued {shortAgo(run.createdAt)}</span>}
            {bridge && (
              <>
                <span className="text-stone-300">·</span>
                <span>{bridge.name}</span>
              </>
            )}
            {bridge?.engine && (
              <>
                <span className="text-stone-300">·</span>
                <span>{bridge.engine} engine</span>
              </>
            )}
          </div>

          {/* §3.3 — the question demands action now (see header note) */}
          {question && (
            <div className="mt-10">
              <AmberPanel kicker="this run needs your input">
                <div className="mt-4 text-base text-stone-900 tracking-tight">{question.prompt}</div>
                {question.context && (
                  <div className="mt-1 font-mono text-xs text-stone-500">{question.context}</div>
                )}
                {question.kind === "permission" && question.options?.length ? (
                  <form
                    action={answerRunAction}
                    className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2"
                  >
                    <input type="hidden" name="runId" value={run.id} />
                    <input type="hidden" name="ref" value={run.ref} />
                    {question.options.map((option) => (
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
                  <form action={answerRunAction} className="mt-3 flex items-end gap-4">
                    <input type="hidden" name="runId" value={run.id} />
                    <input type="hidden" name="ref" value={run.ref} />
                    <div className="flex-1">
                      <UnderlineInput
                        name="text"
                        placeholder="Answer the Engine…"
                        aria-label={`Answer ${run.ref}`}
                      />
                    </div>
                    <span className="py-2">
                      <PillButton kind="ghost" type="submit">
                        answer →
                      </PillButton>
                    </span>
                  </form>
                )}
              </AmberPanel>
            </div>
          )}

          {/* GATES (RR:144–189) — real milestones, see header */}
          <section className="mt-12">
            <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Run gates
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                {passed} of {gates.length} passed
              </span>
            </div>
            <div className="mt-5">
              <GateTrack gates={gates} />
            </div>
          </section>

          {/* STREAM (RR:192–243) — the real per-run SSE */}
          <section className="mt-12">
            <RunStdoutTerminal
              runId={run.id}
              active={run.state === "running" || run.state === "needs-input"}
              path={`worktrees/${run.ref.toLowerCase()} · ${bridge?.engine ?? "engine"} session`}
              initialLines={stdout.lines}
              sinceSeq={stdout.lastSeq}
            />
            <p className="mt-4 text-xs italic text-stone-500 leading-relaxed">
              The stream lands as numbered chunks — close this tab and it resumes where it
              left off.
            </p>
          </section>

          {/* BRIEF preview (RR:245–274) */}
          {brief && ticket && (
            <section className="mt-12">
              <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  The Brief
                </h2>
                {/* canon §3.6 — the composer stays in Atlas: RR:251's `↗` reads → */}
                <Link
                  href={`/tickets/${ticket.ref}/brief`}
                  className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
                >
                  expand →
                </Link>
              </div>
              <div className="mt-5 rounded-2xl bg-white/70 border border-stone-200 p-6">
                <BriefProse markdown={brief.body} />
                <div className="mt-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  <span>drafted from</span>
                  <Link
                    href={`/tickets/${ticket.ref}`}
                    className="text-stone-700 hover:text-amber-600 cursor-pointer"
                  >
                    {ticket.ref} — &ldquo;{ticket.title}&rdquo; →
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Footnote (RR:276–283) — a div because the inline cancel is a
              real <form> (block content is invalid inside <p> in streamed HTML) */}
          <div className="mt-16 text-base italic text-stone-500 leading-relaxed">
            No diff yet — Atlas shows the diff once the Engine finishes. You can{" "}
            <form action={cancelRunAction} className="inline-block not-italic align-baseline">
              <input type="hidden" name="runId" value={run.id} />
              <input type="hidden" name="ref" value={run.ref} />
              <button
                type="submit"
                className="font-mono text-xs text-stone-700 hover:text-amber-600 cursor-pointer"
              >
                cancel the run →
              </button>
            </form>{" "}
            any time before then.
          </div>
        </div>

        {/* RAIL (RR:287–370) */}
        <aside className="space-y-12">
          {/* Big timer (RR:289–303) */}
          <FeaturedCard padding="6">
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                Elapsed
              </div>
              <div className="mt-3">
                {startedAt ? (
                  <ElapsedTimer
                    sinceIso={startedAt.toISOString()}
                    running={run.state === "running" || run.state === "needs-input"}
                  />
                ) : (
                  <div className="font-mono text-5xl font-bold tracking-tighter text-stone-400 leading-none">
                    —
                  </div>
                )}
              </div>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-amber-700">
                {run.state === "running"
                  ? "▶ running"
                  : run.state === "needs-input"
                    ? "● waiting on you"
                    : "queued"}
              </div>
              <p className="mt-4 text-xs text-stone-500 leading-relaxed">
                {run.state === "queued"
                  ? "Waiting for a slot under the run cap. The Bridge starts it the moment one frees."
                  : "The Engine streams here until it finishes or you cancel."}
              </p>
            </div>
          </FeaturedCard>

          {/* Run meta (RR:306–318) */}
          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">Run</div>
            <dl className="mt-5 space-y-3 text-sm">
              <Meta label="Run" value={run.ref} />
              {ticket && (
                <Meta
                  label="Ticket"
                  value={
                    <Link href={`/tickets/${ticket.ref}`} className="hover:text-amber-600">
                      {ticket.ref} →
                    </Link>
                  }
                />
              )}
              <Meta label="Project" value={detail.project.name} />
              <Meta label="Bridge" value={bridge?.name ?? "unclaimed"} />
              {bridge?.engine && <Meta label="Engine" value={bridge.engine} />}
              {run.branch && <Meta label="Branch" value={run.branch} />}
              {by && <Meta label="Dispatched by" value={by} />}
            </dl>
          </section>

          {/* Controls (RR:321–337; pin/mute omitted — see header) */}
          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Controls
            </div>
            <div className="mt-5 space-y-2.5">
              <form action={cancelRunAction}>
                <input type="hidden" name="runId" value={run.id} />
                <input type="hidden" name="ref" value={run.ref} />
                <button
                  type="submit"
                  className="block w-full text-left rounded-xl border border-rose-200 bg-rose-50/40 px-4 py-3 font-mono text-xs uppercase tracking-widest text-rose-700 hover:bg-rose-50/70 cursor-pointer"
                >
                  Cancel run →
                </button>
              </form>
            </div>
          </section>

          {/* Queue after this (RR:340–362) — the real queue */}
          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Queue after this
            </div>
            {queued.length > 0 ? (
              <ul className="mt-4 divide-y divide-stone-200/60">
                {queued.map((q) => (
                  <li key={q.id} className="py-3">
                    <div className="text-sm text-stone-900">{q.title}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      {q.ticketRef ?? q.ref} · queued {shortAgo(q.createdAt)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm italic text-stone-500">Nothing waiting behind it.</p>
            )}
          </section>

          {/* Footnote (RR:364–369) — true now: one route renders by state */}
          <section className="pt-4 border-t border-stone-200/80">
            <p className="text-sm italic text-stone-500 leading-relaxed">
              When the Engine finishes, this page becomes the Run&rsquo;s record — diff,
              outcome, and what to do next.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
