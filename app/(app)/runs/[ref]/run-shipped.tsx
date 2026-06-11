/**
 * M9 Session B — the SHIPPED Run page (V; PRD #27).
 *
 * Ported from design/variants/variant-v-shipped.tsx:80–397 (emerald
 * framing per canon §4 M9 row: emerald kicker + page badge, emerald
 * PullQuote, all-done state track, 360 rail).
 *
 * Honest-data adaptations (flagged in HANDOFF-M9):
 * - V:116–145 "what's deployed" Production/Preview rows — Atlas knows
 *   nothing about deploys; the card lists what REALLY landed (merge
 *   sha / target, PR when one exists, the run branch).
 * - V:148–179 "How to verify" promises an Engine-written email to the
 *   reporter — emails are M13's and no verify-prose contract exists;
 *   the emerald PullQuote composes the honest verification line from
 *   the run's real diff (what changed, where it landed).
 * - V:181–229 "What Engine did" numbered list renders the run's REAL
 *   diff stats per file.
 * - V:328–349 "Did it work?" card — "Looks good" has no verb (the
 *   record is already closed) and "notify carmen" is M13's; the card
 *   keeps the one real affordance: file a follow-up if it's still
 *   broken (re-opening = a new Ticket, the durable-record rule).
 * - V:254 "full log ↗" dropped (K's reasoning); V:84 breadcrumb → M8
 *   instance-wide idiom; Run, never Job.
 */
import Link from "next/link";

import { FeaturedCard, LivePulse, StateMachineTrack } from "@/src/components/kit";
import type { RunDetail } from "@/src/domain/run/detail";
import { milestoneAt } from "@/src/domain/run/detail";
import { parseRunDiffStats } from "@/src/domain/run/diff-stats";
import type { StdoutLine } from "@/src/domain/run/stdout";
import { shortAgo, timeAgo } from "@/src/lib/format";

import { LinkedTicket, Meta, runBreadcrumb, runDuration, runTrackSteps } from "./shared";

export function RunShipped({
  detail,
  stdout,
}: {
  detail: RunDetail;
  stdout: { lines: StdoutLine[]; total: number };
}) {
  const { run, ticket, bridge } = detail;
  const shippedAt = milestoneAt(detail.milestones, "shipped") ?? run.updatedAt;
  const diff = parseRunDiffStats(run.diffStats);
  const { steps, tone } = runTrackSteps(detail, shortAgo);
  const duration = runDuration(detail);
  const prNumber = run.prUrl?.split("/").pop();

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      {/* Top (V:82–93) */}
      <div className="flex items-baseline justify-between gap-8">
        <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
          {runBreadcrumb(detail)}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-700 flex items-center gap-2">
          <LivePulse color="emerald" />
          shipped {shortAgo(shippedAt)}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
        {/* MAIN COL (V:96–257) */}
        <div className="max-w-2xl">
          {/* Hero (V:98–113) */}
          <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
            <span className="text-emerald-700 font-medium">shipped</span>
            <span className="mx-2 text-stone-300">·</span>
            <span>
              {run.prUrl ? `PR #${prNumber} merged` : "merged into the base branch"}
            </span>
            {bridge && (
              <>
                <span className="mx-2 text-stone-300">·</span>
                <span>ran on {bridge.name}</span>
              </>
            )}
          </div>
          <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
            Atlas shipped {ticket?.ref ?? run.ref}.
          </h1>
          <p className="mt-4 text-lg text-stone-700 leading-relaxed">
            {run.title}. The merge landed cleanly
            {duration && (
              <>
                {" "}
                — start to ship in <span className="font-mono text-stone-900">{duration}</span>
              </>
            )}
            .
          </p>

          {/* WHAT LANDED — featured shipped card (V:116–145, honest rows) */}
          <section className="mt-12 rounded-2xl bg-white/70 border border-stone-200/80 p-6">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                landed
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-stone-500">
                what shipped
              </span>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              {run.mergeSha && (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-stone-700">Merge commit</span>
                  <span className="font-mono text-stone-700 truncate">
                    {run.mergeSha.slice(0, 12)}
                  </span>
                </div>
              )}
              {run.prUrl && (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-stone-700">Pull Request</span>
                  <a
                    href={run.prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-stone-700 hover:text-amber-600 cursor-pointer truncate"
                  >
                    #{prNumber} ↗
                  </a>
                </div>
              )}
              {run.branch && (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-stone-700">From branch</span>
                  <span className="font-mono text-stone-700 truncate">{run.branch}</span>
                </div>
              )}
              {diff && (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-stone-700">Change size</span>
                  <span className="font-mono text-stone-700">
                    <span className="text-emerald-700">+{diff.insertions}</span>{" "}
                    <span className="text-rose-600">−{diff.deletions}</span> ·{" "}
                    {diff.filesChanged} file{diff.filesChanged === 1 ? "" : "s"}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* HOW TO VERIFY (V:148–179) — composed from real rows, see header */}
          <section className="mt-16">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              How to verify
            </div>
            <p className="mt-5 text-base text-stone-700 leading-relaxed">
              Closure is yours to confirm — the record says shipped, the code says where to
              look:
            </p>
            <div className="relative mt-7 pl-6">
              {/* §2.15 — emerald PullQuote in shipped contexts (V:161) */}
              <span className="absolute -left-1 -top-2 font-bold text-4xl text-emerald-400/80 leading-none select-none">
                &ldquo;
              </span>
              <p className="text-base italic text-stone-800 leading-relaxed">
                {diff && diff.filesChanged > 0 ? (
                  <>
                    The change lives in{" "}
                    {diff.files.slice(0, 3).map((f, i) => (
                      <span key={f.path}>
                        <span className="font-mono text-sm not-italic text-stone-700">
                          {f.path}
                        </span>
                        {i < Math.min(diff.files.length, 3) - 1 ? ", " : ""}
                      </span>
                    ))}
                    {diff.files.length > 3 ? ` and ${diff.files.length - 3} more` : ""} — pull
                    the latest{run.mergeSha ? (
                      <>
                        {" "}
                        (<span className="font-mono text-sm not-italic text-stone-700">
                          {run.mergeSha.slice(0, 7)}
                        </span>)
                      </>
                    ) : null}{" "}
                    and exercise what the Ticket asked for.
                  </>
                ) : (
                  <>Pull the latest base branch and exercise what the Ticket asked for.</>
                )}
              </p>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                what to verify
              </div>
            </div>
          </section>

          {/* WHAT ENGINE DID (V:181–229) — the real per-file list */}
          {diff && diff.filesChanged > 0 && (
            <section className="mt-16">
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                What Engine did
              </div>
              <ol className="mt-5 divide-y divide-stone-200">
                {diff.files.map((f, i) => (
                  <li key={f.path} className="py-4 grid grid-cols-[40px_1fr] items-baseline gap-6">
                    <span className="font-mono text-xs text-stone-400">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="text-base font-medium text-stone-900">
                        {f.insertions > 0 && f.deletions === 0 ? "Added" : "Changed"}{" "}
                        <span className="font-mono text-sm text-stone-700">{f.path}</span>
                      </div>
                      <div className="mt-1 text-sm text-stone-500 leading-relaxed">
                        <span className="font-mono text-emerald-700">+{f.insertions}</span>{" "}
                        <span className="font-mono text-rose-600">−{f.deletions}</span> lines.
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* ENGINE OUTPUT (V:231–257) — the real tail */}
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
              <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4 font-mono text-[11px] text-stone-700 leading-relaxed space-y-0.5">
                {stdout.lines.map((line, i) => {
                  const isOk = line.text.includes("✓");
                  return (
                    <div key={i} className={isOk ? "text-emerald-700 font-medium" : ""}>
                      [{line.t}] {line.text}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-5 text-sm italic text-stone-500">No output was kept.</p>
            )}
          </section>
        </div>

        {/* RIGHT RAIL (V:261–396) */}
        <aside className="space-y-14">
          {/* STATE — emerald hero (V:263–326) */}
          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              State
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
                <span className="relative inline-block h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="relative text-2xl font-bold tracking-tight">
                Shipped
                <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-emerald-500" />
              </span>
            </div>

            <div className="mt-6">
              <StateMachineTrack steps={steps} tone={tone} />
            </div>

            <div className="mt-5 text-sm text-stone-500 leading-relaxed">
              The Engine&rsquo;s work landed. Ready for verification.
            </div>
          </section>

          {/* DID IT WORK — the honest follow-up card (V:328–349, see header) */}
          <FeaturedCard>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Did it work?
            </div>
            <p className="mt-3 text-sm text-stone-700 leading-relaxed">
              Try it. If something&rsquo;s off, the record stays honest — re-opening is a new
              Ticket.
            </p>
            <div className="mt-5">
              <Link
                href="/tickets/new"
                className="block w-full text-center font-mono text-xs uppercase tracking-widest text-stone-700 bg-white border border-stone-200 hover:border-rose-300 hover:text-rose-700 px-3 py-3 rounded-full transition cursor-pointer"
              >
                Still broken — file a follow-up
              </Link>
            </div>
          </FeaturedCard>

          {/* RUN INFO (V:351–378) */}
          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Run info
            </div>
            <div className="mt-5 space-y-2 text-sm">
              <Meta strong label="Started" value={timeAgo(run.createdAt)} />
              <Meta strong label="Shipped" value={timeAgo(shippedAt)} />
              {duration && <Meta strong label="Duration" value={duration} />}
              {bridge && <Meta strong label="Ran on" value={bridge.name} />}
              {diff && <Meta strong label="Files changed" value={diff.filesChanged} />}
            </div>
          </section>

          {/* LINKED (V:380–395) */}
          {ticket && <LinkedTicket ticket={ticket} line="the Ticket this shipped" />}
        </aside>
      </div>
    </main>
  );
}
