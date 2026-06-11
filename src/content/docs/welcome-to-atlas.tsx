/**
 * M14 — "Welcome to Atlas." — the article variant HH prototypes
 * (HH:69–259 is this page's anatomy: header, anchored sections, article
 * PullQuote, DocFigure path diagram). Content REWRITTEN for v2's
 * engineer-first persona from VISION.md + CONTEXT.md (HH's copy was the
 * v1.3 Collaborator-first story — recorded deviation).
 */
import Link from "next/link";

import { DocFigure, PullQuote } from "@/src/components/kit";

import { DocSection, PathArrow, PathBox, Term } from "./article-kit";
import type { DocArticle } from "./types";

export const welcomeToAtlas: DocArticle = {
  slug: "welcome-to-atlas",
  title: "Welcome to Atlas.",
  indexTitle: "Welcome to Atlas",
  section: "Getting started",
  sub: "What it is, what it isn’t",
  lede: "Atlas is an engineer’s orchestration cockpit — a calm, editorial place to drive AI-engineered work across your projects. This page is three minutes of context before anything else.",
  readMin: 3,
  audience: "Anyone",
  updated: "June 12, 2026",
  toc: [
    { id: "what-it-is", label: "What it is" },
    { id: "what-it-isnt", label: "What it isn’t" },
    { id: "the-two-people", label: "The two people" },
    { id: "where-the-engine-runs", label: "Where the Engine runs" },
  ],
  related: ["the-bridge-and-the-engine", "tickets-briefs-and-runs"],
  provenance: "the v2 intake — VISION + CONTEXT, signed June 11, 2026",
  body: (
    <>
      <DocSection id="what-it-is" label="What it is">
        <p>
          Atlas wraps AI-engineered work in a durable record. You file{" "}
          <Term>Tickets</Term> — what should happen to a project — and
          dispatch the <Term>Engine</Term> (Claude Code, on your own machine)
          to do the work. Each <Term>Run</Term> streams back live: you answer
          when it blocks, review the diff when it finishes, and ship from the
          browser.
        </p>
        <p>
          The front page, <Term>Today.</Term>, is the cockpit: every live Run
          pulsing with state, anything that needs you pinned at the top, and
          the activity feed below — reading like a magazine page, not a
          dashboard.
        </p>
      </DocSection>

      <DocSection id="what-it-isnt" label="What it isn’t">
        <p>
          Atlas isn&rsquo;t a no-code tool. The Engine writes real code, and a
          real engineer reviews every diff before it lands. Atlas removes the
          babysitting, not the judgement.
        </p>
        <p>
          It isn&rsquo;t a project-management suite either. Tickets exist to
          dispatch and record work — there are no sprints, story points,
          burndown charts, or epics.
        </p>
        <p>
          And it isn&rsquo;t a cloud development platform: the Engine never
          runs in Atlas&rsquo;s cloud. Only on the Owner&rsquo;s machine,
          through the Bridge.
        </p>
      </DocSection>

      {/* Pull-quote moment (HH:124–133) — CONTEXT.md's own sentence */}
      <div className="mt-16">
        <PullQuote scale="article">
          Atlas is the eyes and hands; the Bridge is the muscle.
        </PullQuote>
      </div>

      <DocSection id="the-two-people" label="The two people">
        <p>
          Each Atlas instance has exactly one <Term>Owner</Term> — the
          engineer-orchestrator who dispatches Runs, steers them, and reviews
          everything before it ships — and a trusted circle of{" "}
          <Term>Collaborators</Term>, invited by magic link, who file requests
          in plain language and never need to read code. Their roles are
          drawn out in{" "}
          <Link
            href="/docs/owner-and-collaborator"
            className="text-amber-600 hover:underline cursor-pointer"
          >
            Owner &amp; Collaborator
          </Link>
          .
        </p>
      </DocSection>

      <DocSection id="where-the-engine-runs" label="Where the Engine runs">
        <p>
          Not in Atlas&rsquo;s cloud — on <em>your computer</em>, through a
          small daemon called the <Term>Bridge</Term>. Atlas records a
          dispatched Run; your Bridge claims it, gives it its own git
          worktree, and spawns the Engine. State, stdout, and the finished
          diff stream back up for review. The repo itself never moves.
        </p>
        <div className="mt-7">
          <DocFigure caption="Fig. 1 — the dispatch path">
            <div className="flex items-center justify-center gap-3">
              <PathBox label="Ticket" sub="filed in plain language" />
              <PathArrow />
              <PathBox label="Atlas" sub="shapes a Brief" active />
              <PathArrow />
              <PathBox label="Bridge" sub="on your machine" />
              <PathArrow />
              <PathBox label="Engine" sub="writes code · streams back" />
            </div>
          </DocFigure>
        </div>
      </DocSection>
    </>
  ),
};
