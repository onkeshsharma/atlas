/**
 * M14 — "Tickets, Briefs & Runs." — the core nouns, written from
 * CONTEXT.md + the M6/M8/M9 modules as actually built (state vocabularies
 * are quoted from the real domain tables).
 */
import { PullQuote } from "@/src/components/kit";

import { DocSection, Term } from "./article-kit";
import type { DocArticle } from "./types";

export const ticketsBriefsAndRuns: DocArticle = {
  slug: "tickets-briefs-and-runs",
  title: "Tickets, Briefs & Runs.",
  indexTitle: "Tickets, Briefs & Runs",
  section: "Concepts",
  sub: "The durable record, the instruction, the execution",
  lede: "Three nouns carry the whole system: the Ticket records what should happen, the Brief tells the Engine exactly what to do, and the Run is one execution of that intent.",
  readMin: 4,
  audience: "Owners",
  updated: "June 12, 2026",
  toc: [
    { id: "the-ticket", label: "The Ticket" },
    { id: "the-brief", label: "The Brief" },
    { id: "the-run", label: "The Run" },
    { id: "the-feed", label: "The feed" },
  ],
  related: ["needs-input-and-steering", "sequence-hints-and-ship-groups"],
  provenance: "CONTEXT.md + the M6 / M8 / M9 module handoffs",
  body: (
    <>
      <DocSection id="the-ticket" label="The Ticket">
        <p>
          A <Term>Ticket</Term> is the durable unit of record — a thing that
          should happen to a project, with state. Filing one takes seconds:
          title, story, kind, priority. A <Term>Helper Run</Term> enriches it
          in the background — summary, affected areas, likely files — so
          triage starts from substance, not fragments.
        </p>
        <p>
          Tickets move through a nine-state lifecycle (from{" "}
          <span className="font-mono text-sm">triage</span> through{" "}
          <span className="font-mono text-sm">approved</span>,{" "}
          <span className="font-mono text-sm">in-progress</span>,{" "}
          <span className="font-mono text-sm">review-ready</span> to{" "}
          <span className="font-mono text-sm">shipped</span> — or honestly
          sideways into{" "}
          <span className="font-mono text-sm">needs-info</span>,{" "}
          <span className="font-mono text-sm">backlog</span>,{" "}
          <span className="font-mono text-sm">declined</span>,{" "}
          <span className="font-mono text-sm">failed</span>). The board groups
          those states into five readable <Term>Categories</Term>; cards keep
          the raw state visible.
        </p>
      </DocSection>

      <DocSection id="the-brief" label="The Brief">
        <p>
          The <Term>Brief</Term> is what the Engine actually reads — a
          structured instruction drafted by a Helper Run from the Ticket and
          the project&rsquo;s context, then edited by you. The composer has
          three honest tabs: edit, preview, and a diff against the
          Engine&rsquo;s draft, so you always know what you changed.
        </p>
        <p>
          Once a Brief is dispatched it becomes read-only. The record
          doesn&rsquo;t revise — a re-dispatch writes a new Brief.
        </p>
      </DocSection>

      <DocSection id="the-run" label="The Run">
        <p>
          A <Term>Run</Term> is one Engine execution: a single Claude Code
          session in its own Bridge-managed git worktree. Its states are{" "}
          <span className="font-mono text-sm">
            queued → running → needs-input → review-ready | shipped | failed |
            cancelled
          </span>
          , and every transition the system makes obeys one legal-transition
          table. Everything a Run does is recorded — state changes, streamed
          stdout, and the diff of what it changed — so the page that shows it
          never has to guess.
        </p>
      </DocSection>

      <DocSection id="the-feed" label="The feed">
        <p>
          Every mutation in Atlas writes its feed event in the same database
          statement that makes the change. That feed is what the activity
          pages render, what keeps open tabs live, and what the Bridge reads
          as its command log — one history, three readers.
        </p>
        <div className="pt-3">
          <PullQuote scale="article" attribution="the outbox rule · M6">
            If it didn&rsquo;t write a feed event, it didn&rsquo;t happen.
          </PullQuote>
        </div>
      </DocSection>
    </>
  ),
};
