/**
 * M9 Session B — the CANCELLED Run page. No variant exists (K covers
 * failed, V shipped, RR live) — minimal composition from the K shell's
 * recipe in the §3.3 stone register (cancelled = stone-300/stone-400;
 * nothing pulses, nothing shouts). The M7 /projects-index precedent:
 * charter-sanctioned minimal page, nothing invented beyond §2.2 + the
 * run rail.
 */
import { StateMachineTrack } from "@/src/components/kit";
import type { RunDetail } from "@/src/domain/run/detail";
import { milestoneAt } from "@/src/domain/run/detail";
import type { StdoutLine } from "@/src/domain/run/stdout";
import { shortAgo, timeAgo } from "@/src/lib/format";

import { LinkedTicket, Meta, runBreadcrumb, runDuration, runTrackSteps } from "./shared";

export function RunCancelled({
  detail,
  stdout,
}: {
  detail: RunDetail;
  stdout: { lines: StdoutLine[]; total: number };
}) {
  const { run, ticket, bridge } = detail;
  const cancelledAt = milestoneAt(detail.milestones, "cancelled") ?? run.updatedAt;
  const cancelledBy = detail.milestones.find((m) => m.kind === "cancelled")?.actor ?? null;
  const { steps, tone } = runTrackSteps(detail, shortAgo);
  const duration = runDuration(detail);

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <div className="flex items-baseline justify-between gap-8">
        <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
          {runBreadcrumb(detail)}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
          ● cancelled · {shortAgo(cancelledAt)}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
        <div className="max-w-2xl">
          <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
            <span className="text-stone-400">cancelled</span>
            {bridge && (
              <>
                <span className="mx-2 text-stone-300">·</span>
                <span>ran on {bridge.name}</span>
              </>
            )}
          </div>
          <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
            {run.ref} was cancelled.
          </h1>
          <p className="mt-4 text-lg text-stone-700 leading-relaxed">
            {cancelledBy === "you"
              ? "You stopped this run. Nothing shipped; its worktree was pruned."
              : "This run was stopped. Nothing shipped; its worktree was pruned."}
            {ticket && <> The Ticket is back in your hands.</>}
          </p>

          {/* Output tail — what it said before it stopped */}
          {stdout.lines.length > 0 && (
            <section className="mt-16">
              <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  Engine output
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  stdout · last {stdout.lines.length} lines
                </span>
              </div>
              <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4 font-mono text-[11px] text-stone-700 leading-relaxed space-y-0.5 max-h-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {stdout.lines.map((line, i) => (
                  <div key={i}>
                    [{line.t}] {line.text}
                  </div>
                ))}
              </div>
            </section>
          )}

          <p className="mt-16 text-base italic text-stone-500 leading-relaxed">
            Cancelled runs keep their record but nothing else — dispatching again starts
            fresh.
          </p>
        </div>

        <aside className="space-y-14">
          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              State
            </div>
            {/* no underline: §3.1's rail-hero underline family is semantic
                (amber/rose/emerald) — a cancelled record carries none */}
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="inline-block h-2 w-2 rounded-full bg-stone-300" />
              <span className="text-2xl font-bold tracking-tight text-stone-500">Cancelled</span>
            </div>
            <div className="mt-6">
              <StateMachineTrack steps={steps} tone={tone} />
            </div>
          </section>

          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Run info
            </div>
            <div className="mt-5 space-y-2 text-sm">
              <Meta strong label="Started" value={timeAgo(run.createdAt)} />
              <Meta strong label="Cancelled" value={timeAgo(cancelledAt)} />
              {duration && <Meta strong label="Duration" value={duration} />}
              {bridge && <Meta strong label="Ran on" value={bridge.name} />}
            </div>
          </section>

          {ticket && <LinkedTicket ticket={ticket} line="the Ticket this Run was for" />}
        </aside>
      </div>
    </main>
  );
}
