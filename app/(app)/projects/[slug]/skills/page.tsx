/**
 * ADR-0008 Phase 2 — /projects/[slug]/skills, the capabilities facet of the
 * Project Brain: the skills this project ships (`.claude/skills`), harvested by
 * the Bridge from the live worktree on each Run. Read-only inventory; the
 * constitution hash in the rail is the freshness signal.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState, MonoSectionLabel, PageHeader } from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireOwner } from "@/src/domain/auth/guard";
import { latestCursor } from "@/src/domain/live/broker";
import { projectSkillsList, skillUsageCounts } from "@/src/domain/project/brain";
import { projectBySlug } from "@/src/domain/project/queries";
import { timeAgo } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectSkillsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireOwner();
  const { slug } = await params;
  const project = await projectBySlug(slug);
  if (!project) notFound();

  const [skills, usage, cursor] = await Promise.all([
    projectSkillsList(project.id),
    skillUsageCounts(project.id),
    latestCursor(),
  ]);
  const lastSeen = skills.length
    ? skills.map((s) => s.lastSeenAt).reduce((a, b) => (a > b ? a : b))
    : null;
  // usage of skills NOT in the live inventory (bundled/global skills, or ones
  // since removed from the repo) — surfaced honestly rather than dropped.
  const inventoryNames = new Set(skills.map((s) => s.name));
  const otherUsed = [...usage.entries()].filter(([name]) => !inventoryNames.has(name));

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      <PageHeader kind="routed" breadcrumb={`Projects · ${project.name} · Skills`}>
        <div className="grid grid-cols-[1fr_360px] gap-16">
          {/* MAIN */}
          <div className="max-w-2xl">
            <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
              {lastSeen ? <>Harvested from the worktree · {timeAgo(lastSeen)}</> : <>Not harvested yet</>}
            </div>
            <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">Skills.</h1>
            <p className="mt-4 text-lg text-stone-700 leading-relaxed italic">
              The capabilities this project ships — its <span className="not-italic font-mono text-base">.claude/skills</span>,
              read by the Engine (and Athena) when they work here.
            </p>

            <section className="mt-16">
              <MonoSectionLabel
                rule
                count={`${skills.length} skill${skills.length === 1 ? "" : "s"}`}
              >
                Inventory
              </MonoSectionLabel>
              {skills.length > 0 ? (
                <ul className="divide-y divide-stone-200">
                  {skills.map((s) => (
                    <li key={s.name} className="py-5">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="font-mono text-base font-medium text-stone-900">/{s.name}</span>
                        <span className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-widest whitespace-nowrap">
                          {usage.get(s.name) ? (
                            <span className="text-amber-600">used {usage.get(s.name)}×</span>
                          ) : (
                            <span className="text-stone-300">unused</span>
                          )}
                          {!s.modelInvocable && <span className="text-stone-400">manual-only</span>}
                          {!s.userInvocable && <span className="text-stone-400">model-only</span>}
                          {s.modelInvocable && s.userInvocable && (
                            <span className="text-stone-400">model · user</span>
                          )}
                        </span>
                      </div>
                      {s.description && (
                        <p className="mt-1 text-base text-stone-700 leading-relaxed">{s.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-10">
                  <EmptyState
                    shape="column"
                    note="No skills found yet."
                    goodNews="The Bridge harvests .claude/skills on the next Run in this project."
                  />
                </div>
              )}
              {otherUsed.length > 0 && (
                <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  also invoked:{" "}
                  {otherUsed.map(([name, n], i) => (
                    <span key={name}>
                      {i > 0 && " · "}
                      <span className="text-stone-600">/{name}</span> {n}×
                    </span>
                  ))}
                </p>
              )}
            </section>
          </div>

          {/* RIGHT RAIL */}
          <aside className="space-y-14">
            <section>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">Constitution</div>
              <div className="mt-4 text-sm text-stone-700 leading-relaxed">
                {project.constitutionHash ? (
                  <>
                    The Brain is tracking this project&rsquo;s{" "}
                    <span className="font-mono text-stone-900">CLAUDE.md</span> + skills.
                    <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      hash {project.constitutionHash.slice(0, 12)}
                    </div>
                  </>
                ) : (
                  <span className="italic text-stone-500">Not harvested yet — runs a project Run to capture it.</span>
                )}
              </div>
            </section>

            <section>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">Linked</div>
              <ul className="mt-4 space-y-3">
                <li className="group">
                  <Link href={`/projects/${project.slug}/context`} className="block cursor-pointer">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-stone-700 group-hover:text-stone-900">Context</span>
                      <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">→</span>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      the project&rsquo;s language
                    </div>
                  </Link>
                </li>
                <li className="group">
                  <Link href={`/projects/${project.slug}/ingest`} className="block cursor-pointer">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-stone-700 group-hover:text-stone-900">Ingest summary</span>
                      <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">→</span>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      the codebase&rsquo;s actual shape
                    </div>
                  </Link>
                </li>
              </ul>
            </section>

            <section className="pt-4 border-t border-stone-200/80">
              <p className="text-sm italic text-stone-500 leading-relaxed">
                Skills are harvested from the live worktree on every Run — what you see here is what the
                Engine and Athena actually have to work with.
              </p>
            </section>
          </aside>
        </div>
      </PageHeader>
    </main>
  );
}
