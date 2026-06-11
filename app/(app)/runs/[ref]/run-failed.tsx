/**
 * M9 Session B — the FAILED Run page (K; PRD #22–23).
 *
 * Ported from design/variants/variant-k-job.tsx:85–356 (rose framing
 * per canon §3.7: rose kicker, rose state hero + w-8 underline, rose
 * track node; 360 rail). Per-failure-kind guidance comes from
 * FAILURE_GUIDANCE (src/domain/run/failure.ts) — the charter's "K
 * renders this".
 *
 * Honest-data adaptations (flagged in HANDOFF-M9):
 * - K:110–117's conflict lede composes from REAL rows (failure detail +
 *   diff stats); other kinds read their FAILURE_GUIDANCE sentence.
 * - The K:120–148 action card renders for every kind; the "Send back to
 *   Engine" primary is REAL and conflict-only (PRD #23 — the one-click
 *   recovery); "Open PR on GitHub ↗" renders only when a PR exists.
 * - K:151–177 "What Engine did" prose is Engine-written in the mock —
 *   the real section lists the run's actual diff stats (files +
 *   counts) and omits itself when the run died before touching code.
 * - K:209 "full log ↗" dropped — the tail IS the persisted log's end;
 *   a longer view is the live page's terminal, not a separate artifact.
 * - K:314–335 "AI suggests" + confidence bars are a mocked advisor —
 *   omitted; the guidance card carries the real advice (M7/M8 honest-
 *   affordance precedent).
 * - K:89 breadcrumb → M8 instance-wide idiom; Run, never Job.
 */
import Link from "next/link";

import { StateMachineTrack } from "@/src/components/kit";
import type { RunDetail } from "@/src/domain/run/detail";
import { milestoneAt } from "@/src/domain/run/detail";
import { parseRunDiffStats } from "@/src/domain/run/diff-stats";
import { FAILURE_GUIDANCE, isFailureKind } from "@/src/domain/run/failure";
import type { StdoutLine } from "@/src/domain/run/stdout";
import { shortAgo, timeAgo } from "@/src/lib/format";

import { sendBackAction } from "./actions";
import { LinkedTicket, Meta, runBreadcrumb, runDuration, runTrackSteps } from "./shared";

const KIND_PHRASE: Record<string, string> = {
  conflict: "conflict with the base branch",
  "not-mergeable": "merge refused",
  "gh-cli-error": "remote unreachable",
  "no-changes": "nothing to ship",
  "engine-crash": "engine crashed",
  "engine-timeout": "engine timed out",
  "no-repo": "no local repo",
  "worktree-failed": "worktree failed",
  "bridge-lost": "bridge lost",
};

export function RunFailed({
  detail,
  stdout,
}: {
  detail: RunDetail;
  stdout: { lines: StdoutLine[]; total: number };
}) {
  const { run, ticket, bridge } = detail;
  const kind = isFailureKind(run.failureKind) ? run.failureKind : null;
  const conflict = kind === "conflict";
  const guidance = kind ? FAILURE_GUIDANCE[kind] : "The run failed.";
  const failedAt = milestoneAt(detail.milestones, "failed") ?? run.updatedAt;
  // "Started" is when the Engine started, not when the run queued (K:11)
  const startedAt = milestoneAt(detail.milestones, "started") ?? run.createdAt;
  const diff = parseRunDiffStats(run.diffStats);
  const { steps, tone } = runTrackSteps(detail, shortAgo);
  const duration = runDuration(detail);

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      {/* Top: breadcrumb + run id (K:87–94) */}
      <div className="flex items-baseline justify-between gap-8">
        <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
          {runBreadcrumb(detail)}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-rose-700">
          ● run failed · {shortAgo(failedAt)}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
        {/* MAIN COL (K:97–213) */}
        <div className="max-w-2xl">
          {/* Hero — failure framing (K:99–117) */}
          <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
            <span className="text-rose-700 font-medium">failed</span>
            {kind && (
              <>
                <span className="mx-2 text-stone-300">·</span>
                <span>{KIND_PHRASE[kind]}</span>
              </>
            )}
            {bridge && (
              <>
                <span className="mx-2 text-stone-300">·</span>
                <span>ran on {bridge.name}</span>
              </>
            )}
          </div>
          <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
            {ticket ? <>Engine couldn&rsquo;t ship {ticket.ref}.</> : <>{run.ref} failed.</>}
          </h1>
          <p className="mt-4 text-lg text-stone-700 leading-relaxed">
            {conflict ? (
              <>
                The work itself completed cleanly — the run reached review. The merge
                couldn&rsquo;t land because the base branch moved underneath it
                {run.failureDetail ? (
                  <>
                    {" "}
                    (<span className="font-mono text-sm text-stone-900">{run.failureDetail}</span>)
                  </>
                ) : null}
                .
              </>
            ) : (
              <>
                {guidance}
                {run.failureDetail && (
                  <>
                    {" "}
                    <span className="font-mono text-sm text-stone-900">{run.failureDetail}</span>
                  </>
                )}
              </>
            )}
          </p>

          {/* WHAT-TO-DO card — featured chrome (K:120–148) */}
          <section className="mt-12 rounded-2xl bg-white/70 border border-stone-200/80 p-6">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-rose-700">
                {kind ?? "failed"}
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-stone-500">
                what to do
              </span>
            </div>
            <p className="mt-4 text-base text-stone-700 leading-relaxed">
              {conflict ? (
                <>
                  Send the Run back to the Engine with the conflict context — it will read the
                  moved <span className="font-mono text-sm text-stone-900">base branch</span>{" "}
                  fresh and re-apply its changes. This is usually the right call.
                </>
              ) : (
                guidance
              )}
            </p>
            {conflict && (
              <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                Or rebase the branch{" "}
                {run.branch && (
                  <span className="font-mono text-xs text-stone-700">{run.branch}</span>
                )}{" "}
                manually if you want to inspect the conflict yourself — the worktree survives
                on your machine.
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {conflict && (
                <form action={sendBackAction}>
                  <input type="hidden" name="runId" value={run.id} />
                  <button
                    type="submit"
                    className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-5 py-3 rounded-full inline-flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Send back to Engine
                    <span className="text-stone-400">↻</span>
                  </button>
                </form>
              )}
              {run.prUrl && (
                <a
                  href={run.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs uppercase tracking-widest text-stone-700 bg-white border border-stone-200 hover:border-stone-300 px-5 py-3 rounded-full cursor-pointer"
                >
                  Open PR on GitHub ↗
                </a>
              )}
              {!conflict && ticket && (
                <Link
                  href={`/tickets/${ticket.ref}`}
                  className="font-mono text-xs uppercase tracking-widest text-stone-700 bg-white border border-stone-200 hover:border-stone-300 px-5 py-3 rounded-full cursor-pointer"
                >
                  Open the Ticket →
                </Link>
              )}
            </div>
          </section>

          {/* WHAT ENGINE DID (K:151–177) — real diff stats, see header */}
          {diff && diff.filesChanged > 0 && (
            <section className="mt-16">
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                What Engine did
              </div>
              <div className="mt-5 space-y-4 text-base text-stone-700 leading-relaxed">
                <p>
                  Before the failure, the Engine touched{" "}
                  <span className="font-mono text-sm text-stone-900">{diff.filesChanged}</span>{" "}
                  file{diff.filesChanged === 1 ? "" : "s"} (
                  <span className="text-emerald-700 font-mono text-sm">+{diff.insertions}</span>
                  {" / "}
                  <span className="text-rose-600 font-mono text-sm">−{diff.deletions}</span>
                  ):
                </p>
                <ul className="space-y-1">
                  {diff.files.map((f) => (
                    <li key={f.path} className="font-mono text-sm text-stone-600">
                      {f.path}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* ENGINE OUTPUT — stdout tail (K:179–212) */}
          <section className="mt-16">
            <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Engine output
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                stdout · last {stdout.lines.length} lines
              </span>
            </div>
            {stdout.lines.length > 0 ? (
              <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4 font-mono text-[11px] text-stone-700 leading-relaxed space-y-0.5 max-h-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {stdout.lines.map((line, i) => {
                  const isErr = line.text.includes("⨯") || /error/i.test(line.text);
                  const isWarn = /conflict/i.test(line.text);
                  return (
                    <div
                      key={i}
                      className={
                        isErr ? "text-rose-700 font-medium" : isWarn ? "text-amber-700" : ""
                      }
                    >
                      [{line.t}] {line.text}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-5 text-sm italic text-stone-500">
                The run produced no output before it failed.
              </p>
            )}
          </section>
        </div>

        {/* RIGHT RAIL (K:216–354) */}
        <aside className="space-y-14">
          {/* STATE — rose hero (K:218–281) */}
          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              State
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              {/* K:223–225 — page-level failed badges may pulse rose (§3.3) */}
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-50" />
                <span className="relative inline-block h-2 w-2 rounded-full bg-rose-500" />
              </span>
              <span className="relative text-2xl font-bold tracking-tight">
                Failed
                <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-rose-500" />
              </span>
            </div>

            <div className="mt-6">
              <StateMachineTrack steps={steps} tone={tone} />
            </div>

            <div className="mt-5 text-sm text-stone-500 leading-relaxed">
              {conflict
                ? "Engine completed cleanly. The merge failed."
                : kind === "no-changes"
                  ? "Engine finished. Nothing changed."
                  : "The run stopped before review."}
            </div>
          </section>

          {/* RUN INFO (K:284–312) */}
          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Run info
            </div>
            <div className="mt-5 space-y-2 text-sm">
              <Meta strong label="Started" value={timeAgo(startedAt)} />
              <Meta strong label="Failed" value={timeAgo(failedAt)} />
              {duration && <Meta strong label="Duration" value={duration} />}
              {bridge && <Meta strong label="Ran on" value={bridge.name} />}
              {run.prUrl && (
                <Meta
                  label="PR"
                  value={
                    <a
                      href={run.prUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-amber-600 cursor-pointer"
                    >
                      {run.prUrl.split("/").pop()} ↗
                    </a>
                  }
                />
              )}
            </div>
          </section>

          {/* Linked (K:339–353) */}
          {ticket && <LinkedTicket ticket={ticket} line="the Ticket this Run is for" />}
        </aside>
      </div>
    </main>
  );
}
