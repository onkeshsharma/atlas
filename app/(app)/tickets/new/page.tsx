/**
 * M8 — File a Ticket. Capturing work in seconds (PRD #11).
 *
 * Ported from design/variants/variant-s-fileticket.tsx:59–280 (breadcrumb,
 * "What needs fixing?" hero + lede, title-composer + story textarea +
 * kind/priority segments + submit row; 360 rail: good-Ticket steps →
 * what-happens-next → recently filed → italic footer).
 *
 * Canon over variant:
 * - S:169's dotted standalone submit CTA is the dot-rule drift the §2.9
 *   strict-dot ruling names (U:151/GG:150 family) — the pill renders
 *   page-scale WITHOUT the dot.
 * - segments are the kit SegmentedControl (§2.13) via SegmentedField.
 * Honest adaptations (flagged in the handoff):
 * - a Project select (§2.13 underline select) joins the form — v2 files
 *   against real Projects; S mocked a single-project context.
 * - S:154–165's attachment drop-zone is dropped — no upload pipeline
 *   exists (the M5 SS:&ldquo;attach image&rdquo; precedent).
 * - the rail footer is Owner-adapted; M13 re-derives the Collaborator
 *   filing surface.
 */
import Link from "next/link";

import {
  EmptyState,
  PageHeader,
  UnderlineInput,
  UnderlineSelect,
  UnderlineTextarea,
} from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { SegmentedField } from "@/src/components/work/SegmentedField";
import { requireUser } from "@/src/domain/auth/guard";
import { projectRows } from "@/src/domain/cockpit/queries";
import { latestCursor } from "@/src/domain/live/broker";
import { recentlyFiled } from "@/src/domain/ticket/queries";
import { shortAgo } from "@/src/lib/format";

import { fileTicketAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function FileTicketPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const params = await searchParams;
  const titleError = params.error === "title";

  const [projects, recent, cursor] = await Promise.all([
    projectRows(),
    recentlyFiled(3),
    latestCursor(),
  ]);
  const defaultProject = projects.find((p) => p.pinned) ?? projects[0];

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      <PageHeader kind="routed" breadcrumb="Tickets · File a Ticket" />

      <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
        {/* MAIN COL (S:67–179) */}
        <div className="max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tighter">What needs fixing?</h1>
          <p className="mt-4 text-lg text-stone-700 leading-relaxed">
            Tell us what you ran into, or what you&rsquo;d love to see. Atlas shapes it
            into a Brief, the Engine takes it from there, and you&rsquo;ll see what
            shipped.
          </p>

          <form action={fileTicketAction}>
            <section className="mt-16 space-y-12">
              {/* PROJECT — honest v2 addition (real Projects exist; §2.13 select) */}
              <UnderlineSelect name="projectId" label="Project" defaultValue={defaultProject?.id}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </UnderlineSelect>

              {/* TITLE — the §2.13 title-composer scale (S:82–91) */}
              <UnderlineInput
                name="title"
                label="Title"
                scale="composer"
                placeholder="One short sentence — e.g. &lsquo;Export buttons feel buried&rsquo;"
                validation={titleError ? "error" : undefined}
                message={titleError ? "give it a title" : undefined}
              />

              {/* BODY (S:93–110) */}
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  What&rsquo;s the story?
                </label>
                <p className="mt-2 text-sm text-stone-500 italic leading-relaxed">
                  What did you try · what did you expect · what actually happened. Or
                  just: what you wish Atlas did instead.
                </p>
                <div className="mt-2">
                  <UnderlineTextarea
                    name="body"
                    rows={8}
                    placeholder={
                      "When I open the ticket list, I can't find any obvious way to export the data. I know we shipped JSON export but the buttons feel buried — they're in the overflow menu and the icon doesn't read as \"download\" to me.\n\nCould we surface the export options as primary affordances near the top of the toolbar?"
                    }
                    hint="Markdown OK · the Engine reads this verbatim"
                  />
                </div>
              </div>

              {/* KIND segmented (S:112–131) — optional; unset = Atlas guesses at enrichment */}
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  What kind?
                </label>
                <p className="mt-2 text-sm text-stone-500 italic leading-relaxed">
                  Pick one. Or leave it — Atlas will guess.
                </p>
                <div className="mt-4">
                  <SegmentedField
                    name="kind"
                    defaultValue=""
                    options={[
                      { value: "bug", label: "Bug" },
                      { value: "enhancement", label: "Enhancement" },
                      { value: "other", label: "Something else" },
                    ]}
                  />
                </div>
              </div>

              {/* PRIORITY segmented (S:133–152) */}
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  How urgent? <span className="text-stone-400">· optional</span>
                </label>
                <div className="mt-4">
                  <SegmentedField
                    name="priority"
                    defaultValue="whenever"
                    options={[
                      { value: "whenever", label: "Whenever" },
                      { value: "soon", label: "Soon" },
                      { value: "today", label: "Today" },
                      { value: "broken-now", label: "Broken now" },
                    ]}
                  />
                </div>
              </div>

              {/* SUBMIT (S:167–177) — §2.9 strict-dot: page-scale standalone pill, no dot */}
              <div className="pt-4 flex items-center gap-4">
                <button
                  type="submit"
                  className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-6 py-3.5 rounded-full shadow-sm inline-flex items-center gap-2 transition cursor-pointer"
                >
                  File this Ticket
                  <span className="text-stone-400">→</span>
                </button>
                <span className="italic font-sans text-sm text-stone-500">
                  it&rsquo;ll appear in Triage in a few seconds
                </span>
              </div>
            </section>
          </form>
        </div>

        {/* RIGHT RAIL (S:181–278) */}
        <aside className="space-y-14">
          {/* Tips (S:183–212) */}
          <section>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              What makes a good Ticket
            </div>
            <ol className="mt-5 space-y-4 text-sm text-stone-700 leading-relaxed">
              <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                <span className="font-mono text-xs text-stone-400">01</span>
                <div>
                  Tell the story, not the solution. The Engine is good at figuring out{" "}
                  <em>how</em>; tell it the <em>what</em>.
                </div>
              </li>
              <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                <span className="font-mono text-xs text-stone-400">02</span>
                <div>Mention the page, file, or moment in the app where you ran into it.</div>
              </li>
              <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                <span className="font-mono text-xs text-stone-400">03</span>
                <div>One thing per Ticket. If you have three asks, file three Tickets.</div>
              </li>
            </ol>
          </section>

          {/* What happens next (S:214–242) */}
          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              What happens next
            </div>
            <ol className="mt-5 space-y-3 text-sm text-stone-700 leading-relaxed">
              <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                <span className="font-mono text-xs text-stone-400">→</span>
                <span>It lands in Triage, enriched by a Helper Run.</span>
              </li>
              <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                <span className="font-mono text-xs text-stone-400">→</span>
                <span>You approve, park, or decline it there.</span>
              </li>
              <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                <span className="font-mono text-xs text-stone-400">→</span>
                <span>
                  Atlas drafts a <em>Brief</em>; the Engine ships a fix on your Bridge.
                </span>
              </li>
              <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                <span className="font-mono text-xs text-stone-400">→</span>
                <span>
                  The reporter gets a note with <em>how to verify</em> what changed.
                </span>
              </li>
            </ol>
          </section>

          {/* Recently filed (S:244–269) — real latest rows, project-agnostic */}
          <section>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Recently filed
            </div>
            {recent.length > 0 ? (
              <ul className="mt-5 divide-y divide-stone-200">
                {recent.map((t) => (
                  <li key={t.id} className="py-3 group">
                    <Link href={`/tickets/${t.ref}`} className="block cursor-pointer">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm text-stone-700 group-hover:text-stone-900 truncate">
                          {t.title}
                        </span>
                        <span className="font-mono text-[10px] text-stone-400 whitespace-nowrap">
                          {shortAgo(t.createdAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                        {t.ref} · {t.reporter}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5">
                <EmptyState shape="strip">Nothing filed yet — yours will be first.</EmptyState>
              </div>
            )}
          </section>

          {/* Footer (S:271–277) — Owner-adapted; M13 re-derives the Collaborator copy */}
          <section className="pt-4 border-t border-stone-200/80">
            <p className="text-sm italic text-stone-500 leading-relaxed">
              Everything you file lands in your own Triage — you decide what the Engine
              builds, and in what order.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
