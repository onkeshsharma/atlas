/**
 * M7 — /projects/[slug]/ingest, the Ingest Summary, ported from
 * design/variants/variant-j-ingest.tsx:112–556 (hero · Engine read ·
 * stack · architecture figure · smells · churn · health · commits ·
 * stats rail). Canon: §2.2 routed header, §2.5, §2.19 charts (E12
 * WeekBars geometry — definite-height track in the kit), §3.1 rail.
 *
 * HONEST PRE-ENGINE (charter §1): nothing can RUN an ingest until M9 —
 * `queued` and `none` render truthful waiting states; the full J render
 * proves itself over the Engine-written summary SHAPE (seeded example).
 *
 * Deviations (flagged for HANDOFF-M7):
 *  - J:128's bare title takes the canon period (§2.2: titles end with
 *    a period — canon wins over the variant).
 *  - J:316's "— the v1.3 design pass kicked off Tuesday" mock clause
 *    doesn't port; the comparator word is computed (churnComparator).
 *  - J:318 churn + J:502 mini sparkline render through kit WeekBars /
 *    Sparkline (§7.3 kit-only; E12 fixed geometry).
 *  - J:530 "Refresh from latest ↻" has no executor until M9 — the card
 *    states when the Engine last read and that refresh arrives with the
 *    Engine (M5 setup-honesty precedent). J:536 "Edit CONTEXT.md ↗" →
 *    real link to the Context viewer, `→` per §3.6 (stays in Atlas).
 *  - J:544–551 footer: "Ingest schema" is the real schemaVersion;
 *    "Auto-refresh · on commit" is not a real behavior — the row reads
 *    "refresh · with the Engine".
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  FeaturedCard,
  LivePulse,
  MonoSectionLabel,
  PageHeader,
  Sparkline,
  StateDot,
  WeekBars,
} from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireOwner } from "@/src/domain/auth/guard";
import { latestCursor } from "@/src/domain/live/broker";
import {
  churnComparator,
  type IngestSmell,
  type IngestSummary,
} from "@/src/domain/project/ingest-summary";
import { segmentProse } from "@/src/domain/project/prose";
import {
  projectBySlug,
  projectIngestSummary,
  ticketStateCounts,
} from "@/src/domain/project/queries";
import { activeProjectHelperRun } from "@/src/domain/dispatch/queries";
import type { Project, Run } from "@/src/db/schema";
import { shortAgo, timeAgo } from "@/src/lib/format";

import { refreshIngestAction } from "../actions";

export const dynamic = "force-dynamic";

/** J:284–288 — severity as inline mono prefix (canon §4-M7 severity colors). */
const SEVERITY_CLASS: Record<IngestSmell["severity"], string> = {
  high: "text-rose-700",
  medium: "text-amber-700",
  low: "text-stone-500",
};

/** Engine plain text → J's emphasis markup (strong names · mono paths). */
function Prose({
  text,
  strong,
  mono,
}: {
  text: string;
  strong: string[];
  mono: string[];
}) {
  return (
    <>
      {segmentProse(text, { strong, mono }).map((seg, i) =>
        seg.kind === "strong" ? (
          <span key={i} className="font-semibold text-stone-900">
            {seg.text}
          </span>
        ) : seg.kind === "mono" ? (
          <span key={i} className="font-mono text-sm text-stone-600">
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

/** queued / none — the truthful pre-Engine states (§2.17 page shape).
 * M9 Session B: the ingest is RUNNABLE now — the page offers the real
 * Helper Run instead of the M7 "when a Bridge is paired" promise. */
function WaitingState({ project, ingestRun }: { project: Project; ingestRun: Run | null }) {
  const queued = project.ingestStatus === "queued";
  return (
    <div className="max-w-2xl">
      <h1 className="text-5xl font-bold tracking-tighter">{project.name}.</h1>
      <p className="mt-4 text-xl text-stone-700 leading-relaxed">
        {project.description ?? "Registered with Atlas."}
      </p>
      <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
        {/* §3.3 — queued is static stone-400; nothing here is live yet. */}
        <StateDot tone={queued ? "stone" : "stone-soft"} />
        <span>{queued ? "ingest queued" : "not ingested"}</span>
      </div>
      <p className="mt-16 text-lg text-stone-700 leading-relaxed">
        {queued ? (
          <>
            The Engine reads this repo on its next Run — stack, architecture, smells,
            and baseline health land on this page.
          </>
        ) : (
          <>
            This project was registered without an ingest. When the Engine reads
            the repo, everything it learns lands on this page.
          </>
        )}
      </p>
      {ingestRun ? (
        <p className="mt-6 text-sm italic text-stone-500 leading-relaxed">
          The Engine is on it —{" "}
          <Link
            href={`/runs/${ingestRun.ref}`}
            className="not-italic font-mono text-xs text-stone-700 hover:text-amber-600"
          >
            {ingestRun.ref} →
          </Link>{" "}
          fills this page when it lands.
        </p>
      ) : (
        <form action={refreshIngestAction} className="mt-6">
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="slug" value={project.slug} />
          <input type="hidden" name="name" value={project.name} />
          <button
            type="submit"
            className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
          >
            Read it with the Engine →
          </button>
          {!project.localPath && (
            <p className="mt-2 text-xs italic text-stone-500">
              No local path is paired — the run will say so honestly.
            </p>
          )}
        </form>
      )}
      <p className="mt-4 text-sm italic text-stone-500 leading-relaxed">
        Nothing is cloned and nothing runs until you ask. That&rsquo;s a good thing.
      </p>
    </div>
  );
}

function ReadySummary({
  project,
  summary,
  openTickets,
  ingestRun,
}: {
  project: Project;
  summary: IngestSummary;
  openTickets: number;
  ingestRun: Run | null;
}) {
  const refreshed = project.ingestedAt ? timeAgo(project.ingestedAt) : "—";
  const healthy = summary.health.every((h) => h.ok);
  const archNames = summary.architecture.map((a) => a.name);
  const monoVocab = [
    project.name,
    ...summary.smells.map((s) => s.file),
    ...summary.smells.map((s) => s.file.split("/").pop() ?? s.file),
  ];
  const comparator = churnComparator(summary.churnWeeks);
  const repoHost = project.repoUrl?.replace(/^https?:\/\//, "").replace(/\.git$/, "");

  return (
    <div className="grid grid-cols-[1fr_360px] gap-16">
      {/* MAIN COL (J:126–454) */}
      <div className="max-w-2xl">
        {/* canon §2.2 — the title takes the period (J:128 lacked it). */}
        <h1 className="text-5xl font-bold tracking-tighter">{project.name}.</h1>
        <p className="mt-4 text-xl text-stone-700 leading-relaxed">
          {summary.tagline}
        </p>
        {healthy && (
          <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
            <LivePulse color="emerald" />
            <span>healthy</span>
            <span className="text-stone-300">·</span>
            <span>last ingest was clean</span>
          </div>
        )}

        {/* ENGINE READ (J:143–177) — real Engine prose, derived emphasis */}
        <section className="mt-16">
          <MonoSectionLabel dot="amber">Engine read</MonoSectionLabel>
          <div className="mt-5 space-y-4 text-base text-stone-700 leading-relaxed">
            {summary.engineRead.map((para, i) => (
              <p key={i}>
                <Prose
                  text={para}
                  strong={[...archNames, ...summary.stack]}
                  mono={monoVocab}
                />
              </p>
            ))}
          </div>
          <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-stone-400">
            enriched {refreshed}
          </div>
        </section>

        {/* STACK (J:180–197) — editorial prose, no pills, no chrome */}
        <section className="mt-16">
          <MonoSectionLabel>Stack</MonoSectionLabel>
          <p className="mt-5 text-base text-stone-700 leading-relaxed">
            <Prose text={summary.stackProse} strong={summary.stack} mono={[]} />
          </p>
        </section>

        {/* ARCHITECTURE (J:200–265) — figure + divided list */}
        <section className="mt-16">
          <MonoSectionLabel>Architecture</MonoSectionLabel>
          <p className="mt-5 text-base text-stone-700 leading-relaxed">
            <Prose text={summary.architectureProse} strong={archNames} mono={[]} />
          </p>

          {/* editorial figure — boxes + arrows, no card chrome (J:212–240) */}
          <figure className="mt-8">
            <div className="flex items-center justify-center gap-3">
              {summary.architecture.map((node, i) => (
                <div key={node.name} className="flex items-center">
                  <div className="text-center">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-1.5">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="px-4 py-3 border border-stone-300 rounded-md min-w-[130px]">
                      <div className="text-sm font-semibold text-stone-900">
                        {node.name}
                      </div>
                      <div className="mt-1 font-mono text-[9px] text-stone-500">
                        {node.sub}
                      </div>
                    </div>
                  </div>
                  {i < summary.architecture.length - 1 && (
                    <span className="mx-3 mt-5 font-mono text-stone-400 text-lg self-start">
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
            <figcaption className="mt-5 text-center font-mono text-[10px] uppercase tracking-widest italic text-stone-400">
              Fig. 1 — System flow · refreshed at each ingest
            </figcaption>
          </figure>

          <ol className="mt-10 divide-y divide-stone-200">
            {summary.architecture.map((node, i) => (
              <li
                key={node.name}
                className="py-5 grid grid-cols-[40px_1fr] items-baseline gap-6"
              >
                <span className="font-mono text-xs text-stone-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="text-lg tracking-tight font-medium">
                    {node.name}{" "}
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      {node.sub}
                    </span>
                  </div>
                  <div className="mt-1.5 text-sm text-stone-500 leading-relaxed">
                    {node.detail}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* SMELLS (J:268–304) — severity as inline mono prefix */}
        <section className="mt-16">
          <MonoSectionLabel rule count={summary.smells.length}>
            Smells
          </MonoSectionLabel>
          <ol className="divide-y divide-stone-200">
            {summary.smells.map((s, i) => (
              <li
                key={i}
                className="py-5 grid grid-cols-[40px_1fr] items-baseline gap-6"
              >
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${SEVERITY_CLASS[s.severity]}`}
                >
                  {s.severity}
                </span>
                <div>
                  <div className="text-lg tracking-tight font-medium">{s.title}</div>
                  <div className="mt-1 font-mono text-xs text-stone-500">
                    {s.file}
                  </div>
                  <div className="mt-2 text-sm text-stone-500 leading-relaxed">
                    {s.detail}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* CODE CHURN (J:307–347) — computed comparator, kit WeekBars */}
        <section className="mt-16">
          <MonoSectionLabel>Code churn</MonoSectionLabel>
          <p className="mt-5 text-base text-stone-700 leading-relaxed">
            Commits per week over the last {summary.churnWeeks.length} weeks. This
            week is{" "}
            <span className="font-mono text-amber-600 font-semibold">
              {comparator}
            </span>
            .
          </p>
          <div className="mt-7">
            <WeekBars
              bars={summary.churnWeeks.map((value, i) => ({
                label: `w${i + 1}`,
                value,
              }))}
              currentIndex={summary.churnWeeks.length - 1}
            />
          </div>
          <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest italic text-stone-400">
            Fig. 2 — {summary.churnWeeks.length}-week commit volume
          </div>
        </section>

        {/* HEALTH (J:350–413) — status line + coverage by area */}
        <section className="mt-16">
          <MonoSectionLabel>Baseline health</MonoSectionLabel>
          <div className="mt-5 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-stone-700 flex-wrap">
            <StateDot tone={healthy ? "emerald" : "rose"} />
            {summary.health.map((h, i) => (
              <span key={h.label} className="flex items-baseline gap-2">
                <span className="text-stone-500">{h.label}</span>
                <span className={h.ok ? "text-stone-900" : "text-rose-600"}>
                  {h.value}
                </span>
                {i < summary.health.length - 1 && (
                  <span className="text-stone-300">·</span>
                )}
              </span>
            ))}
          </div>

          <div className="mt-10">
            <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
              Coverage by area
            </div>
            <div className="mt-5 space-y-4">
              {summary.coverage.map((row) => (
                <div key={row.area}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span
                      className={
                        row.hero ? "text-stone-900 font-semibold" : "text-stone-700"
                      }
                    >
                      {row.area}
                    </span>
                    <span
                      className={`font-mono ${row.hero ? "text-stone-900 font-semibold" : "text-stone-900"}`}
                    >
                      {row.pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 w-full bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${row.hero ? "bg-amber-500" : "bg-amber-400/70"}`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest italic text-stone-400">
              Fig. 3 — Test coverage by area
            </div>
          </div>
        </section>

        {/* RECENT COMMITS (J:416–453) */}
        <section className="mt-16">
          <MonoSectionLabel
            rule
            count={`${summary.commits.length} of ${summary.commitsTotal}`}
          >
            Recent commits
          </MonoSectionLabel>
          <ol className="divide-y divide-stone-200">
            {summary.commits.map((commit, i) => (
              <li
                key={commit.sha}
                className="py-4 grid grid-cols-[40px_auto_1fr_auto] items-baseline gap-4 group"
              >
                <span className="font-mono text-xs text-stone-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-xs text-stone-700">
                  {commit.sha}
                </span>
                <span className="text-sm text-stone-700 truncate">
                  {commit.subject}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 whitespace-nowrap">
                  {shortAgo(new Date(commit.at))}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* RIGHT RAIL (J:457–553) */}
      <aside className="space-y-14">
        {/* Stats hero (J:459–486) */}
        <section>
          <MonoSectionLabel>Project stats</MonoSectionLabel>
          <div className="mt-3">
            <span className="relative text-2xl font-bold tracking-tight">
              {summary.stats.coveragePct}% coverage
              <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
            </span>
          </div>
          {summary.stats.prevCoveragePct !== null && (
            <p className="mt-3 text-sm text-stone-500 leading-relaxed">
              {summary.stats.coveragePct >= summary.stats.prevCoveragePct
                ? "Up from "
                : "Down from "}
              <span className="font-mono">{summary.stats.prevCoveragePct}%</span> at
              the last ingest.
            </p>
          )}
          <ul className="mt-5 space-y-2 text-sm">
            <li className="flex items-baseline justify-between">
              <span className="text-stone-700">Lines of code</span>
              <span className="font-mono text-stone-900">
                {summary.stats.linesOfCode}
              </span>
            </li>
            <li className="flex items-baseline justify-between">
              <span className="text-stone-700">Files</span>
              <span className="font-mono text-stone-900">{summary.stats.files}</span>
            </li>
            <li className="flex items-baseline justify-between">
              <span className="text-stone-700">Open Tickets</span>
              <span className="font-mono text-stone-900">{openTickets}</span>
            </li>
          </ul>
        </section>

        {/* Repository (J:489–516) */}
        {project.repoUrl && (
          <section>
            <MonoSectionLabel>Repository</MonoSectionLabel>
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 block font-mono text-sm text-stone-700 hover:text-amber-600 cursor-pointer"
            >
              {repoHost}
            </a>
            <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
              <span>{summary.repo.branch}</span>
              <span className="text-stone-300">·</span>
              <span>{summary.repo.commitsSinceIngest} commits ahead of last ingest</span>
            </div>
            {/* §7.3 — kit Sparkline carries J:502's 12-week strip */}
            <div className="mt-4">
              <Sparkline data={summary.churnWeeks} tag="12w" />
            </div>
          </section>
        )}

        {/* Ingest card (J:519–538) — honest pre-Engine, see header */}
        <FeaturedCard>
          <MonoSectionLabel>Ingest</MonoSectionLabel>
          <div className="mt-3 text-sm text-stone-700 leading-relaxed">
            The Engine last read this{" "}
            <span className="font-mono text-stone-900">{refreshed}</span>. Refreshing
            re-reads the repo and rewrites this page.
          </div>
          {/* M9 Session B — J:530 restored as a REAL Helper Run (HANDOFF-M7) */}
          {ingestRun ? (
            <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-stone-400">
              refreshing —{" "}
              <Link
                href={`/runs/${ingestRun.ref}`}
                className="text-stone-700 hover:text-amber-600"
              >
                {ingestRun.ref} →
              </Link>
            </div>
          ) : (
            <form action={refreshIngestAction} className="mt-4">
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="slug" value={project.slug} />
              <input type="hidden" name="name" value={project.name} />
              <button
                type="submit"
                className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
              >
                Refresh from latest ↻
              </button>
            </form>
          )}
          <Link
            href={`/projects/${project.slug}/context`}
            className="mt-3 block text-center font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:underline cursor-pointer"
          >
            Edit CONTEXT.md →
          </Link>
        </FeaturedCard>

        {/* Footer (J:541–552) — real metadata only */}
        <section className="pt-4 border-t border-stone-200/80">
          <ul className="text-sm space-y-2">
            <li className="flex items-baseline justify-between">
              <span className="text-stone-500">Ingest schema</span>
              <span className="font-mono text-stone-500">
                v{summary.schemaVersion}
              </span>
            </li>
            <li className="flex items-baseline justify-between">
              <span className="text-stone-500">Refresh</span>
              <span className="font-mono text-stone-500">with the Engine</span>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  );
}

export default async function IngestSummaryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireOwner();
  const { slug } = await params;
  const project = await projectBySlug(slug);
  if (!project) notFound();

  const [counts, cursor, ingestRun] = await Promise.all([
    ticketStateCounts(project.id),
    latestCursor(),
    // M9 Session B — the refresh CTA's honesty: an ingest already in
    // flight renders as its Run, not a second button.
    activeProjectHelperRun(project.id, "ingest-project"),
  ]);
  const summary = projectIngestSummary(project);

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      <PageHeader
        kind="routed"
        breadcrumb={`Projects · ${project.name} · Ingest`}
        nav={
          summary && project.ingestedAt ? (
            <span>refreshed {timeAgo(project.ingestedAt)}</span>
          ) : undefined
        }
      >
        {summary ? (
          <ReadySummary
            project={project}
            summary={summary}
            openTickets={counts.open}
            ingestRun={ingestRun}
          />
        ) : (
          <WaitingState project={project} ingestRun={ingestRun} />
        )}
      </PageHeader>
    </main>
  );
}
