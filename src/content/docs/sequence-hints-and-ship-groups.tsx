/**
 * M14 — "Sequence Hints & Ship Groups." — parallel-work coordination,
 * written from the M8 hints engine as built (derivation inputs, the
 * no-bluff rule) and CONTEXT.md's dispatch decision.
 */
import { PullQuote } from "@/src/components/kit";

import { DocSection, Term } from "./article-kit";
import type { DocArticle } from "./types";

export const sequenceHintsAndShipGroups: DocArticle = {
  slug: "sequence-hints-and-ship-groups",
  title: "Sequence Hints & Ship Groups.",
  indexTitle: "Sequence Hints & Ship Groups",
  section: "Concepts",
  sub: "How parallel work stays coordinated",
  lede: "Worktrees make parallel Runs safe while they execute. The remaining problem is order — what to dispatch together, and what can land together. Atlas answers both with derived, honest hints.",
  readMin: 3,
  audience: "Owners",
  updated: "June 12, 2026",
  toc: [
    { id: "the-problem", label: "The problem" },
    { id: "sequence-hints", label: "Sequence Hints" },
    { id: "ship-groups", label: "Ship Groups" },
    { id: "hints-never-bluff", label: "Hints never bluff" },
  ],
  related: ["tickets-briefs-and-runs", "architecture"],
  provenance: "the M8 hints engine + CONTEXT.md's concurrency decision",
  body: (
    <>
      <DocSection id="the-problem" label="The problem">
        <p>
          Two agents editing one project don&rsquo;t collide while they work —
          each Run has its own worktree — they collide when their changes
          try to land. So coordination in Atlas lives where the risk lives:
          at dispatch (advice) and at review (grouping), never as a lock.
        </p>
      </DocSection>

      <DocSection id="sequence-hints" label="Sequence Hints">
        <p>
          Every board card can carry one <Term>Sequence Hint</Term>, derived
          from two real inputs: dependency edges you declare
          (blocks/blocked-by) and file-overlap between Tickets. Hard beats
          soft:{" "}
          <span className="font-mono text-sm">blocked-by</span> ▸{" "}
          <span className="font-mono text-sm">recommended-after</span> ▸{" "}
          <span className="font-mono text-sm">parallel-safe-with</span>. A
          glance at the column tells you what to dispatch now and what to
          hold.
        </p>
      </DocSection>

      <DocSection id="ship-groups" label="Ship Groups">
        <p>
          When Runs come back review-ready, Atlas clusters them into{" "}
          <Term>Ship Groups</Term>: <em>independent</em> (file-sets disjoint —
          land them together), <em>sequenced</em> (same files — land in
          order), <em>blocked</em> (a dependency isn&rsquo;t shipped yet).
          The board draws the independent cluster with one ship action for
          the whole batch.
        </p>
      </DocSection>

      <DocSection id="hints-never-bluff" label="Hints never bluff">
        <p>
          Where file-sets are unknown — a Ticket not yet enriched, a Run
          without a diff — the engine produces <em>no</em> soft claims and{" "}
          <em>no</em> groups, rather than guessing. And the hints are advice
          with a place to stand, not automation with a veto:
        </p>
        <div className="pt-3">
          <PullQuote scale="article" attribution="the dispatch rule">
            Hints advise; the Owner decides.
          </PullQuote>
        </div>
      </DocSection>
    </>
  ),
};
