// M14 — public docs index. Ported from
// design/variants/variant-ee-docs.tsx:76–352 (fidelity protocol §5):
// in-flow top row, text-5xl hero + amber-linked lede, mono-section rule
// rows with page counts, numbered divided article rows with hover →,
// 360 rail (EE:127) with list sections + the featured ask-a-human card +
// italic footer. Design-lab colophon NOT ported (canon §4 footnote).
//
// Honest composition (charter items 1+3 — recorded in M14-manual-test.md):
//  - EE draws the AUTHED app sidebar (idle nav + Owner mark with a healthy
//    bridge dot) around a page that is now public and unauthenticated —
//    porting it would fake presence and leak instance chrome to visitors.
//    The docs pages wear the public tier's own chrome instead (the
//    FF/MM/NN corner idiom folded into EE:118–125's in-flow top row).
//  - EE's 26 mock articles trim to the 7 written + the architecture
//    deep-dive — every row resolves (no dead rows). popular/"updated"
//    badges and read-count rails need analytics nobody has → not ported;
//    the "Most read this week" shape becomes an honest "Start here".
//  - EE:215–235 search input + ⌘K hint → M12 owns search; a dead input
//    lies → not ported.
//  - EE:333–338 "docs live in atlas/docs on GitHub, PRs welcome" → the
//    repo is private → reworded to the true provenance.
import type { Metadata } from "next";
import Link from "next/link";

import { FeaturedCard, MonoSectionLabel } from "@/src/components/kit";
import { DOCS_INDEX, docMeta } from "@/src/content/docs";

export const metadata: Metadata = {
  title: "Atlas — docs",
  description: "A short pile of pages that cover the system honestly.",
};

const ASK_A_HUMAN = "mailto:onkesh19@gmail.com?subject=Atlas%20docs";

export default function DocsIndexPage() {
  return (
    <div className="relative flex-1 text-stone-900 font-sans">
      <main className="flex-1 px-16 pt-8 pb-24">
        {/* Top row (EE:118–125 + the public wordmark home link) */}
        <div className="flex items-baseline justify-between gap-8">
          <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
            <Link href="/" className="hover:text-stone-900 cursor-pointer">
              Atlas
            </Link>{" "}
            · Docs
          </div>
          <a
            href={ASK_A_HUMAN}
            className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
          >
            Ask a human ↗
          </a>
        </div>

        <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
          {/* MAIN COL */}
          <div className="max-w-2xl">
            {/* Hero (EE:131–141) */}
            <h1 className="text-5xl font-bold tracking-tighter">Atlas, explained.</h1>
            <p className="mt-4 text-lg text-stone-700 leading-relaxed">
              A short pile of pages that cover the system honestly. Start
              with{" "}
              <Link
                href="/docs/welcome-to-atlas"
                className="text-amber-600 hover:underline cursor-pointer"
              >
                Welcome to Atlas
              </Link>
              .
            </p>

            {/* Sections (EE:144–199) */}
            <div className="mt-16 space-y-16">
              {DOCS_INDEX.map((sec) => (
                <section key={sec.label}>
                  <MonoSectionLabel
                    rule
                    count={`${sec.slugs.length} ${sec.slugs.length === 1 ? "page" : "pages"}`}
                  >
                    {sec.label}
                  </MonoSectionLabel>
                  <p className="mt-4 text-base italic text-stone-500 leading-relaxed">
                    {sec.intro}
                  </p>
                  <ol className="mt-5 divide-y divide-stone-200">
                    {sec.slugs.map((slug, i) => {
                      const meta = docMeta(slug)!;
                      return (
                        <li key={slug}>
                          <Link
                            href={meta.href}
                            className="py-4 grid grid-cols-[40px_1fr_auto] items-baseline gap-6 group cursor-pointer"
                          >
                            <span className="font-mono text-xs text-stone-400">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span>
                              <span className="text-base font-medium text-stone-900 group-hover:text-stone-700">
                                {meta.indexTitle}
                              </span>
                              <span className="mt-1 block text-sm text-stone-500 leading-relaxed">
                                {meta.sub}
                              </span>
                            </span>
                            <span className="font-mono text-xs text-stone-400 group-hover:text-amber-600 transition whitespace-nowrap">
                              →
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>

            {/* Closing line (EE:202–209) */}
            <p className="mt-20 text-base italic text-stone-500 leading-relaxed">
              Most of these are short. If a page took longer than 5 minutes
              to read, we wrote it badly — please{" "}
              <a
                href={ASK_A_HUMAN}
                className="text-amber-600 hover:underline cursor-pointer"
              >
                tell us
              </a>
              .
            </p>
          </div>

          {/* RIGHT RAIL (EE:213–340, honest sections only) */}
          <aside className="space-y-14">
            {/* Start here — EE:239–285's list shape with true meta */}
            <section>
              <MonoSectionLabel>Start here</MonoSectionLabel>
              <ol className="mt-5 space-y-3">
                {["welcome-to-atlas", "the-bridge-and-the-engine", "architecture"].map(
                  (slug) => {
                    const meta = docMeta(slug)!;
                    return (
                      <li key={slug} className="group cursor-pointer">
                        <Link
                          href={meta.href}
                          className="flex items-baseline justify-between gap-4"
                        >
                          <span className="text-sm text-stone-700 group-hover:text-stone-900">
                            {meta.indexTitle}
                          </span>
                          <span className="font-mono text-[10px] text-stone-400 whitespace-nowrap">
                            ~{meta.readMin} min
                          </span>
                        </Link>
                      </li>
                    );
                  },
                )}
              </ol>
            </section>

            {/* Ask a human card (EE:313–328) */}
            <FeaturedCard>
              <MonoSectionLabel dot="amber">Can&rsquo;t find it?</MonoSectionLabel>
              <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                Send a question — a human reads it. Atlas is small; the
                person who built it answers the docs mail.
              </p>
              <a
                href={ASK_A_HUMAN}
                className="mt-5 block w-full text-center font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3 rounded-full shadow-sm cursor-pointer"
              >
                Ask a human →
              </a>
            </FeaturedCard>

            {/* Footer (EE:331–339, true provenance) */}
            <section className="pt-4 border-t border-stone-200/80">
              <p className="text-sm italic text-stone-500 leading-relaxed">
                These docs ship inside Atlas itself, written from the same
                signed documents the build was held to — the intake, the PRD,
                and the design canon.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
