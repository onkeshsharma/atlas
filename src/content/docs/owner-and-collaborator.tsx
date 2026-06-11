/**
 * M14 — "Owner & Collaborator." — concepts article in the HH anatomy,
 * written from CONTEXT.md's normative glossary (the two personas) and the
 * M5 invite surfaces. Honesty: the unbuilt parts of the Collaborator
 * surface are said out loud, not implied shipped.
 */
import { DocSection, Term } from "./article-kit";
import type { DocArticle } from "./types";

export const ownerAndCollaborator: DocArticle = {
  slug: "owner-and-collaborator",
  title: "Owner & Collaborator.",
  indexTitle: "Owner & Collaborator",
  section: "Concepts",
  sub: "The engineer at the centre, the circle alongside",
  lede: "Atlas serves two people with very different relationships to code. Knowing which one you are tells you what every page will show you.",
  readMin: 3,
  audience: "Anyone",
  updated: "June 12, 2026",
  toc: [
    { id: "the-owner", label: "The Owner" },
    { id: "the-collaborator", label: "The Collaborator" },
    { id: "what-each-sees", label: "What each sees" },
    { id: "one-owner-by-design", label: "One Owner, by design" },
  ],
  related: ["welcome-to-atlas", "the-bridge-and-the-engine"],
  provenance: "CONTEXT.md — the v2 glossary, signed June 11, 2026",
  body: (
    <>
      <DocSection id="the-owner" label="The Owner">
        <p>
          The <Term>Owner</Term> is the engineer-orchestrator — exactly one
          per Atlas instance. They dispatch work to the Engine, steer live
          Runs (answer, cancel), review every diff, and decide what ships.
          The Bridge daemon runs on their machine, under their account, with
          their tools.
        </p>
        <p>
          Owner is a role, not a job title: it means &ldquo;the one human the
          system routes every decision through.&rdquo;
        </p>
      </DocSection>

      <DocSection id="the-collaborator" label="The Collaborator">
        <p>
          A <Term>Collaborator</Term> is a trusted, usually non-technical
          member of the circle. They join by a magic-link invite — a page
          that states, before they accept, exactly what they will and
          won&rsquo;t see — and they drive work by filing requests in plain
          language. No prompts, no diffs, no terminal. Ever.
        </p>
      </DocSection>

      <DocSection id="what-each-sees" label="What each sees">
        <p>
          The Owner sees everything: the cockpit, the board, every Run&rsquo;s
          stream and diff, the people surfaces, the Bridge&rsquo;s health.
        </p>
        <p>
          A Collaborator today files requests and follows the activity feed
          from their inbox. The rest of their surface — plain-English ticket
          states, ship summaries by email, a strictly per-person view — is on
          v2&rsquo;s build path and not yet shipped. These docs will say so
          plainly when it lands; until then, the honest summary is:
          Collaborators can already ask and watch, and the code side of Atlas
          is Owner-only.
        </p>
      </DocSection>

      <DocSection id="one-owner-by-design" label="One Owner, by design">
        <p>
          Every diff routes through one person&rsquo;s judgement. That is a
          deliberate bottleneck, not a missing feature — the same property
          that makes Atlas safe to point at a real codebase caps its
          throughput at one engineer&rsquo;s reading speed. Multi-Owner
          instances are explicitly out of scope for v2.
        </p>
      </DocSection>
    </>
  ),
};
