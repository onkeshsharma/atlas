/**
 * M7 — /projects/[slug]/context, the Context viewer, ported from
 * design/variants/variant-p-context.tsx:63–364 (provenance header ·
 * Language dl · "Words the Engine noticed" · quiet outro · TOC rail ·
 * linked + footer). Canon: §2.2 routed header, §2.5 rule-rows, §3.1
 * default 360 rail, §3.8 editorial voice. P:88's "before every Job" is
 * "before every Run" (CONTEXT.md: Job retired with v1).
 *
 * Deviations (flagged for HANDOFF-M7):
 *  - P:92–211 Overview/Conventions/Decisions are free-form CONTEXT.md
 *    prose with no storage yet (PRD #31 scopes v2.0 to domain language
 *    + Engine suggestions) — those sections and their TOC entries don't
 *    render; the term sections are real.
 *  - P:70 "Edit ↗" + P:292–308 Edit card (browser editor / pull-from-
 *    repo) have no editor behind them — dropped, no fake affordances.
 *  - P:241 add/dismiss are REAL actions (confirm/dismiss mutations with
 *    feed-outbox rows); they render always-visible (not hover-revealed)
 *    so the affordance is reachable without a pointer.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState, MonoSectionLabel, PageHeader } from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireOwner } from "@/src/domain/auth/guard";
import { latestCursor } from "@/src/domain/live/broker";
import { contextTermsFor, projectBySlug } from "@/src/domain/project/queries";
import { timeAgo } from "@/src/lib/format";

import { confirmTermAction, dismissTermAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function ContextViewerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireOwner();
  const { slug } = await params;
  const project = await projectBySlug(slug);
  if (!project) notFound();

  const [terms, cursor] = await Promise.all([
    contextTermsFor(project.id),
    latestCursor(),
  ]);

  const enrichedAt = terms.suggested.length
    ? terms.suggested
        .map((t) => t.createdAt)
        .reduce((a, b) => (a > b ? a : b))
    : null;

  const toc = [
    { id: "language", label: "Language" },
    { id: "ai-suggestions", label: "Words the Engine noticed" },
  ];

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      <PageHeader kind="routed" breadcrumb={`Projects · ${project.name} · Context`}>
        <div className="grid grid-cols-[1fr_360px] gap-16">
          {/* MAIN COL (P:77–265) */}
          <div className="max-w-2xl">
            {/* Document header — quiet provenance (P:79–82) */}
            <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
              {terms.updatedAt ? (
                <>
                  Last edited by{" "}
                  <span className="italic normal-case tracking-normal font-sans">
                    you
                  </span>{" "}
                  · {timeAgo(terms.updatedAt)}
                </>
              ) : (
                <>Not written yet</>
              )}
            </div>
            <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
              {project.name}.
            </h1>
            <p className="mt-4 text-lg text-stone-700 leading-relaxed italic">
              The way I think about this codebase — written by hand, read by the
              Engine before every Run.
            </p>

            {/* Language (P:106–138) */}
            <section id="language" className="mt-16">
              <MonoSectionLabel
                rule
                count={`${terms.confirmed.length} term${terms.confirmed.length === 1 ? "" : "s"}`}
              >
                Language
              </MonoSectionLabel>
              {terms.confirmed.length > 0 ? (
                <dl className="divide-y divide-stone-200">
                  {terms.confirmed.map((t) => (
                    <div
                      key={t.id}
                      className="py-5 grid grid-cols-[110px_1fr] items-baseline gap-6"
                    >
                      <dt className="font-mono text-sm font-medium text-stone-900">
                        {t.term}
                        {t.avoid && (
                          <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-rose-700">
                            avoid
                          </span>
                        )}
                      </dt>
                      <dd className="text-base text-stone-700 leading-relaxed">
                        {t.meaning}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="py-10">
                  <EmptyState
                    shape="column"
                    note="No terms yet."
                    goodNews="Confirm the Engine's suggestions below, or wait for the first ingest."
                  />
                </div>
              )}
            </section>

            {/* Words the Engine noticed (P:214–255) — real add/dismiss */}
            <section id="ai-suggestions" className="mt-16">
              <MonoSectionLabel dot="amber">
                Words the Engine noticed
              </MonoSectionLabel>
              <p className="mt-5 text-base text-stone-700 leading-relaxed italic">
                The Engine found these terms in the code but couldn&rsquo;t find them
                here. Add the ones that matter; dismiss the rest.
              </p>
              {terms.suggested.length > 0 ? (
                <>
                  <ul className="mt-5 divide-y divide-stone-200">
                    {terms.suggested.map((t) => (
                      <li
                        key={t.id}
                        className="py-3 flex items-baseline justify-between group"
                      >
                        <span className="flex items-baseline gap-3">
                          <span className="font-mono text-base text-stone-900">
                            {t.term}
                          </span>
                          {t.uses !== null && (
                            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                              {t.uses} uses
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-3">
                          <form action={confirmTermAction}>
                            <input type="hidden" name="termId" value={t.id} />
                            <input type="hidden" name="slug" value={project.slug} />
                            <button
                              type="submit"
                              className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
                            >
                              add →
                            </button>
                          </form>
                          <form action={dismissTermAction}>
                            <input type="hidden" name="termId" value={t.id} />
                            <input type="hidden" name="slug" value={project.slug} />
                            <button
                              type="submit"
                              className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-rose-600 cursor-pointer"
                            >
                              dismiss ✕
                            </button>
                          </form>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    {enrichedAt && <>enriched {timeAgo(enrichedAt)} · </>}
                    these are suggestions, not edits
                  </div>
                </>
              ) : (
                <div className="mt-5">
                  <EmptyState shape="strip">
                    Nothing noticed yet. The Engine reads the codebase at every Run
                    and leaves new words here.
                  </EmptyState>
                </div>
              )}
            </section>

            {/* Quiet outro (P:258–265) */}
            <p className="mt-20 text-base italic text-stone-500 leading-relaxed">
              For everything else — the codebase&rsquo;s actual shape, smells, test
              coverage, and recent commits —{" "}
              <Link
                href={`/projects/${project.slug}/ingest`}
                className="text-amber-600 hover:underline cursor-pointer"
              >
                see the Ingest summary
              </Link>
              . That one Atlas writes for you; this one you write for Atlas.
            </p>
          </div>

          {/* RIGHT RAIL (P:269–353) */}
          <aside className="space-y-14">
            {/* Contents (P:271–289) — real sections only */}
            <section>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Contents
              </div>
              <ol className="mt-5 space-y-2.5">
                {toc.map((item, i) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="group flex items-baseline gap-3 text-sm cursor-pointer"
                    >
                      <span className="font-mono text-[10px] text-stone-400 w-5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-stone-700 group-hover:text-stone-900">
                        {item.label}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </section>

            {/* Linked (P:311–343) */}
            <section>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Linked
              </div>
              <ul className="mt-4 space-y-3">
                <li className="group">
                  <Link
                    href={`/projects/${project.slug}/ingest`}
                    className="block cursor-pointer"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-stone-700 group-hover:text-stone-900">
                        Ingest summary
                      </span>
                      <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                        →
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      the codebase&rsquo;s actual shape
                    </div>
                  </Link>
                </li>
                {project.repoUrl && (
                  <li className="group">
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block cursor-pointer"
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-stone-700 group-hover:text-stone-900">
                          Repository
                        </span>
                        <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                          ↗
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                        where this file lives
                      </div>
                    </a>
                  </li>
                )}
              </ul>
            </section>

            {/* Quiet footer (P:346–352) */}
            <section className="pt-4 border-t border-stone-200/80">
              <p className="text-sm italic text-stone-500 leading-relaxed">
                The Engine reads this verbatim before every Run. The closer it is to
                how you actually think about your project, the better the
                Engine&rsquo;s output.
              </p>
            </section>
          </aside>
        </div>
      </PageHeader>
    </main>
  );
}
