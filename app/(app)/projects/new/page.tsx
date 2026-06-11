/**
 * M7 — /projects/new, ported from
 * design/variants/variant-r-newproject.tsx:59–282 (two-path intake:
 * ingest existing · greenfield; What-to-expect rail + Your-projects
 * list + trust card + help footer). Canon: §2.2 routed header, §2.13
 * forms, §2.16 narrow steps, §2.4 rail card, §3.1 default 360 rail.
 *
 * Deviations (flagged for HANDOFF-M7):
 *  - R:126's "v1.4" badge → "v2.1" (PRD: greenfield grill is v2.1+);
 *    the grill textarea renders disabled + the CTA disabled with R's own
 *    honest italic callout (M5 onboarding File-Ticket precedent).
 *  - R:110–113's OAuth-scopes note → honest pre-Engine copy (form file).
 *  - R:260–278 help-footer rows: docs are M14 — rows render unlinked
 *    (M6 parked-arrows precedent).
 */
import Link from "next/link";

import {
  FeaturedCard,
  NumberedSteps,
  PageHeader,
  PillButton,
  PullQuote,
  UnderlineTextarea,
} from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireOwner } from "@/src/domain/auth/guard";
import { projectRows } from "@/src/domain/cockpit/queries";
import { latestCursor } from "@/src/domain/live/broker";
import { timeAgo } from "@/src/lib/format";

import { IngestForm } from "./ingest-form";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  await requireOwner();
  const [existing, cursor] = await Promise.all([projectRows(), latestCursor()]);

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      <PageHeader kind="routed" breadcrumb="Projects · New">
        <div className="grid grid-cols-[1fr_360px] gap-16">
          {/* MAIN COL (R:68–181) */}
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold tracking-tighter">Add a Project.</h1>
            <p className="mt-4 text-lg text-stone-700 leading-relaxed">
              Atlas can take over an existing codebase, or help you build something
              new from scratch.
            </p>

            {/* PATH 1 — Ingest existing (R:77–115) */}
            <section className="mt-20 pb-16 border-b border-stone-200">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  01
                </span>
                <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  Ingest an existing repo
                </h2>
              </div>
              <p className="mt-5 text-base text-stone-700 leading-relaxed">
                Already have a codebase? Paste its URL. The Engine reads it, writes
                an{" "}
                <span className="font-mono text-sm text-stone-600">
                  Ingest Summary
                </span>
                , scans for smells, and keeps a living{" "}
                <span className="font-mono text-sm text-stone-600">CONTEXT.md</span>{" "}
                of your project&rsquo;s language.
              </p>
              <IngestForm />
            </section>

            {/* PATH 2 — Greenfield (R:118–180; v2.1 per PRD out-of-scope) */}
            <section className="mt-16">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  02
                </span>
                <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  Start from scratch
                </h2>
                <span className="ml-3 font-mono text-[10px] uppercase tracking-widest text-amber-700">
                  v2.1
                </span>
              </div>
              <p className="mt-5 text-base text-stone-700 leading-relaxed">
                Have an idea but no code yet? Tell Atlas what you want to build. The
                Engine will run a <span className="italic">grill-me session</span> to
                sharpen the idea into a working brief, then scaffold the initial
                codebase with you.
              </p>

              {/* R:139–151 — example pull-quote (§2.15, amber default) */}
              <div className="mt-8">
                <PullQuote attribution="what one of these prompts looks like">
                  Want to build: a quiet weather app that just shows today and
                  tomorrow. No ads. No charts. Stone palette. Geist font. Deployable
                  to Vercel. Should remember my last location.
                </PullQuote>
              </div>

              <div className="mt-8 space-y-7">
                {/* §2.13 disabled — greenfield is v2.1; no fake intake. */}
                <UnderlineTextarea
                  rows={4}
                  label="Tell Atlas what you want to build"
                  placeholder="One paragraph is enough — be specific about the feel you want, not just the features."
                  validation="disabled"
                />
              </div>
              <div className="mt-8 flex items-center gap-4">
                <PillButton kind="primary" size="page" arrow disabled>
                  Begin grill
                </PillButton>
                <span className="italic font-sans text-sm text-stone-500">
                  ~15 minutes of back-and-forth · then your codebase exists
                </span>
              </div>

              {/* R:176–179 — the honest callout, version retargeted */}
              <p className="mt-10 text-sm italic text-stone-500 leading-relaxed">
                Greenfield lands in v2.1. For now, ingest something you&rsquo;ve
                already started.
              </p>
            </section>
          </div>

          {/* RIGHT RAIL (R:184–280) */}
          <aside className="space-y-14">
            {/* What to expect (R:186–219) — §2.16 narrow steps */}
            <section>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                What to expect
              </div>
              <div className="mt-5">
                <NumberedSteps
                  narrow
                  steps={[
                    {
                      body: (
                        <span className="text-sm text-stone-700 leading-relaxed">
                          Atlas records the repo and queues the ingest. ~2 minutes
                          for small codebases once the Engine runs.
                        </span>
                      ),
                    },
                    {
                      body: (
                        <span className="text-sm text-stone-700 leading-relaxed">
                          The Engine writes an{" "}
                          <span className="font-mono text-xs text-stone-600">
                            Ingest Summary
                          </span>{" "}
                          with stack, architecture, and smells.
                        </span>
                      ),
                    },
                    {
                      body: (
                        <span className="text-sm text-stone-700 leading-relaxed">
                          You review · edit{" "}
                          <span className="font-mono text-xs text-stone-600">
                            CONTEXT.md
                          </span>{" "}
                          · invite Collaborators · file the first Ticket.
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            </section>

            {/* Your projects (R:222–241) — real rows, real links */}
            {existing.length > 0 && (
              <section>
                <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  Your projects
                </div>
                <ul className="mt-5 divide-y divide-stone-200">
                  {existing.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/projects/${p.slug}`}
                        className="py-3 flex items-baseline justify-between group cursor-pointer"
                      >
                        <span className="font-mono text-sm text-stone-700 group-hover:text-stone-900">
                          {p.name}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          {timeAgo(p.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Trust card (R:244–257) — §2.4 rail card */}
            <FeaturedCard>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                What Atlas can&rsquo;t see
              </div>
              <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                Your code stays on{" "}
                <span className="font-mono text-stone-900">your Bridge</span>. Atlas
                only ever holds Brief text, Result summaries, and heartbeats.
              </p>
              {/* R:254 — docs article is M14; the ghost link renders unlinked. */}
              <span className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700">
                Why your code stays yours ↗
              </span>
            </FeaturedCard>

            {/* Help footer (R:260–279) — rows unlinked until M14 */}
            <section className="pt-4 border-t border-stone-200/80">
              <ul className="text-sm space-y-2">
                <li className="flex items-baseline justify-between group">
                  <span className="text-stone-700">Docs: getting started</span>
                  <span className="font-mono text-[10px] text-stone-400">→</span>
                </li>
                <li className="flex items-baseline justify-between group">
                  <span className="text-stone-700">Talk to a human</span>
                  <span className="font-mono text-[10px] text-stone-400">↗</span>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </PageHeader>
    </main>
  );
}
