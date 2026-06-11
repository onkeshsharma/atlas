/**
 * M9 Session B — the diff viewer (KK; PRD #24–25).
 *
 * Ported from design/variants/variant-kk-diff.tsx:116–326 (canon §4 M9
 * row: text-4xl title, 320 rail, mono diff rows with bg-emerald-50 /
 * bg-rose-50 line washes — KK:189–224; emerald merge CTA §3.4). The
 * hunks are REAL: the Bridge uploads the run's unified diff at
 * review-ready (runs.diff_patch) and parseDiffPatch renders it.
 *
 * The emerald CTA is the REAL approve-and-ship (PRD #25): a durable
 * ship request the daemon lands from the run's kept worktree — local
 * merge or push/PR/squash when a remote is configured.
 *
 * Honest-data adaptations (flagged in HANDOFF-M9):
 * - KK:121 "open on GitHub ↗" renders only when a PR exists — at
 *   review-ready none does yet (the ship CREATES it); the footnote's
 *   GitHub line adapts the same way.
 * - KK:143–155 "Engine summary" quote is Engine-written in the mock —
 *   no summary contract exists; the quote composes from the run's real
 *   diff and says so in its attribution.
 * - KK:267–272 approve prose promised "notify carmen" (M13's email) and
 *   "quality gates passed" (untracked) — the card states what is true:
 *   where the change lands and what approving does.
 * - KK:285–307 "Checks" gate list is untracked — the rail carries the
 *   run's real meta instead (the M7/M8 honest-rail precedent).
 * - Rail file rows anchor-jump to their file sections (the variant drew
 *   the affordance cursor; the jump makes it real).
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LivePulse, PillButton } from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireOwner } from "@/src/domain/auth/guard";
import { latestCursor } from "@/src/domain/live/broker";
import { runDetailByRef, milestoneAt } from "@/src/domain/run/detail";
import { diffPatchTruncated, parseDiffPatch } from "@/src/domain/run/diff-patch";
import { parseRunDiffStats } from "@/src/domain/run/diff-stats";
import { shortAgo, timeAgo } from "@/src/lib/format";

import { approveShipAction, sendBackAction } from "../actions";
import { Meta, runBreadcrumb } from "../shared";

export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<string, string> = {
  new: "text-emerald-700",
  deleted: "text-rose-700",
  modified: "text-amber-700",
};

export default async function RunDiffPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  await requireOwner();
  const { ref } = await params;
  const detail = await runDetailByRef(decodeURIComponent(ref));
  if (!detail) notFound();
  // KK exists for the review moment; everything else is the run page's.
  if (detail.run.state !== "review-ready") redirect(`/runs/${detail.run.ref}`);

  const { run, ticket, bridge } = detail;
  const cursor = await latestCursor();
  const stats = parseRunDiffStats(run.diffStats);
  const files = parseDiffPatch(run.diffPatch as string | null);
  const truncated = diffPatchTruncated(run.diffPatch as string | null);
  const finishedAt = milestoneAt(detail.milestones, "review-ready") ?? run.updatedAt;
  const totalAdded = stats?.insertions ?? files.reduce((a, f) => a + f.added, 0);
  const totalRemoved = stats?.deletions ?? files.reduce((a, f) => a + f.removed, 0);
  const fileCount = stats?.filesChanged ?? files.length;
  const railFiles = stats?.files ?? files.map((f) => ({ path: f.path, insertions: f.added, deletions: f.removed }));
  const shipping = run.shipRequestedAt !== null;
  const firstFiles = railFiles.slice(0, 2).map((f) => f.path.split("/").pop()).join(", ");

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      {/* Top (KK:117–124) */}
      <div className="flex items-baseline justify-between gap-8">
        <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
          {runBreadcrumb(detail)} · Diff
        </div>
        {run.prUrl && (
          <a
            href={run.prUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
          >
            open on GitHub ↗
          </a>
        )}
      </div>

      <div className="mt-8 grid grid-cols-[1fr_320px] gap-16">
        <div className="max-w-3xl">
          {/* h1-dense — long technical title (KK:128, ledger E11) */}
          <h1 className="text-4xl font-bold tracking-tighter leading-tight">
            {ticket?.title ?? run.title}
          </h1>
          <div className="mt-4 font-mono text-xs uppercase tracking-widest text-stone-500">
            <span className="text-emerald-700">+{totalAdded}</span>
            <span className="mx-2 text-stone-300">·</span>
            <span className="text-rose-700">−{totalRemoved}</span>
            <span className="mx-2 text-stone-300">·</span>
            <span>
              {fileCount} file{fileCount === 1 ? "" : "s"} changed
            </span>
            <span className="mx-2 text-stone-300">·</span>
            <span>Engine finished · {shortAgo(finishedAt)}</span>
          </div>

          {/* Editorial summary above the code (KK:142–155 — honest source) */}
          <div className="mt-8 relative pl-6">
            <span className="absolute -left-1 -top-2 font-bold text-4xl text-emerald-400/80 leading-none select-none">
              &ldquo;
            </span>
            <p className="text-base italic text-stone-800 leading-relaxed">
              Touches{" "}
              <span className="not-italic font-mono text-sm">
                {fileCount} file{fileCount === 1 ? "" : "s"}
              </span>
              {firstFiles ? (
                <>
                  {" "}
                  — centred on <span className="not-italic font-mono text-sm">{firstFiles}</span>
                </>
              ) : null}{" "}
              — <span className="not-italic font-mono text-sm">+{totalAdded}</span> added,{" "}
              <span className="not-italic font-mono text-sm">−{totalRemoved}</span> removed,
              waiting in the run&rsquo;s own worktree.
            </p>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
              from the run&rsquo;s diff
            </div>
          </div>

          {/* Diff files (KK:158–229) */}
          <div className="mt-12 space-y-12">
            {files.map((file, fi) => (
              <section key={file.path} id={`file-${fi}`} className="scroll-mt-8">
                <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                  <div className="flex items-baseline gap-3">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-widest ${
                        STATUS_CLASS[file.status] ?? "text-amber-700"
                      }`}
                    >
                      {file.status}
                    </span>
                    <span className="font-mono text-sm text-stone-900">{file.path}</span>
                  </div>
                  <div className="flex items-baseline gap-3 font-mono text-[10px]">
                    <span className="text-emerald-700">+{file.added}</span>
                    <span className="text-rose-700">−{file.removed}</span>
                  </div>
                </div>

                {file.hunks.map((hunk, hi) => (
                  <div key={hi} className="mt-4">
                    <div className="font-mono text-[10px] text-stone-400 mb-2">{hunk.header}</div>
                    <div className="rounded-lg border border-stone-200 bg-stone-50 overflow-hidden font-mono text-xs leading-relaxed">
                      {hunk.lines.map((line, i) => (
                        <div
                          key={i}
                          className={`grid grid-cols-[40px_18px_1fr] gap-2 px-2 py-0.5 ${
                            line.kind === "add"
                              ? "bg-emerald-50"
                              : line.kind === "remove"
                                ? "bg-rose-50"
                                : ""
                          }`}
                        >
                          <span className="text-stone-400 text-right select-none">{line.n}</span>
                          <span
                            className={`select-none ${
                              line.kind === "add"
                                ? "text-emerald-700"
                                : line.kind === "remove"
                                  ? "text-rose-700"
                                  : "text-stone-300"
                            }`}
                          >
                            {line.kind === "add" ? "+" : line.kind === "remove" ? "−" : " "}
                          </span>
                          <span className="text-stone-700 whitespace-pre">{line.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ))}
            {files.length === 0 && (
              <p className="text-sm italic text-stone-500">
                The diff text didn&rsquo;t reach Atlas — the numstat above is real; the hunks
                live in the worktree on your machine.
              </p>
            )}
            {truncated && (
              <p className="text-xs italic text-stone-500">
                The diff was cut at the Bridge&rsquo;s upload cap — the worktree holds the
                rest.
              </p>
            )}
          </div>

          {/* Footnote (KK:231–238 — honest link target) */}
          <p className="mt-16 text-base italic text-stone-500 leading-relaxed">
            This is a peek. Atlas isn&rsquo;t a code-review tool — for thorough review,{" "}
            {run.prUrl ? (
              <a
                href={run.prUrl}
                target="_blank"
                rel="noreferrer"
                className="text-amber-600 hover:underline cursor-pointer not-italic"
              >
                open the PR on GitHub
              </a>
            ) : (
              <>
                open{" "}
                <span className="not-italic font-mono text-sm text-stone-700">{run.branch}</span>{" "}
                on your machine
              </>
            )}
            . What you see here is enough to sanity-check before approving.
          </p>
        </div>

        {/* RAIL (KK:242–315) */}
        <aside className="space-y-12">
          {/* Files (KK:243–265) — anchor-jumps, real stats */}
          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Files
            </div>
            <ol className="mt-5 divide-y divide-stone-200">
              {railFiles.map((f, i) => (
                <li key={f.path} className="group cursor-pointer">
                  <a href={`#file-${i}`} className="block py-3">
                    <div className="font-mono text-xs text-stone-700 group-hover:text-stone-900 truncate">
                      {f.path.split("/").pop()}
                    </div>
                    <div className="mt-0.5 flex items-baseline justify-between font-mono text-[10px]">
                      <span className="text-stone-400 truncate">{f.path}</span>
                      <span className="flex items-baseline gap-1.5">
                        <span className="text-emerald-700">+{f.insertions}</span>
                        <span className="text-rose-700">−{f.deletions}</span>
                      </span>
                    </div>
                  </a>
                </li>
              ))}
            </ol>
          </section>

          {/* Approve — THE emerald CTA (KK:267–283, §3.4) */}
          <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Approve
            </div>
            <p className="mt-3 text-sm text-stone-700 leading-relaxed">
              The Engine finished and kept its worktree on{" "}
              <span className="font-mono text-xs text-stone-900">
                {bridge?.name ?? "your machine"}
              </span>
              . Approving lands it — merge first, record second.
            </p>
            {shipping ? (
              <div className="mt-5 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-amber-700 py-3">
                <LivePulse color="amber" />
                shipping · approved {shortAgo(run.shipRequestedAt!)}
              </div>
            ) : (
              <form action={approveShipAction} className="mt-5">
                <input type="hidden" name="runId" value={run.id} />
                <input type="hidden" name="ref" value={run.ref} />
                <PillButton kind="ship" fullWidth type="submit">
                  Approve &amp; ship
                </PillButton>
              </form>
            )}
            {/* canon §3.6 — the send-back stays in Atlas: KK:281's `↗` reads → */}
            <form action={sendBackAction} className="mt-3">
              <input type="hidden" name="runId" value={run.id} />
              <button
                type="submit"
                className="block w-full text-center font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:underline cursor-pointer"
              >
                send back to Engine →
              </button>
            </form>
          </section>

          {/* Run meta (KK:285–307's slot — honest data, see header) */}
          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">Run</div>
            <div className="mt-5 space-y-2 text-sm">
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
              <Meta label="Finished" value={timeAgo(finishedAt)} />
              {run.branch && <Meta label="Branch" value={run.branch} />}
              {bridge && <Meta label="Worktree on" value={bridge.name} />}
            </div>
          </section>

          {/* Footnote (KK:309–314 — honest source line) */}
          <section className="pt-4 border-t border-stone-200/80">
            <p className="text-sm italic text-stone-500 leading-relaxed">
              Diff rendering is read-only ·{" "}
              {run.prUrl
                ? "comments and review live in GitHub."
                : "the worktree on your machine is the source."}
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
