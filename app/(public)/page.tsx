// M14 — the public landing at `/`. Ported from
// design/variants/variant-ff-landing.tsx:8–326 (fidelity protocol §5):
// top corner chrome, 5.5rem hero, two-audiences grid, three NumberedSteps-
// scale rows, privacy PullQuote, FAQ divided list, closing CTA, 4-column
// footer. The variant's bottom-left design-lab colophon is NOT ported
// (canon §4 footnote).
//
// Honesty pass (charter item 2 — every claim TRUE of v2 today; all
// deviations recorded in notes/M14-manual-test.md):
//  - FF's copy was the v1.3 Collaborator-first story; the prose is
//    re-derived from VISION.md/CONTEXT.md under the engineer-first persona.
//  - "Request an Owner invite" / "watch a 2-min tour" / Pricing / About /
//    Legal links promise machinery that doesn't exist → real CTAs only
//    (/sign-in, /docs, /changelog, /status, mailto).
//  - FF:46's leading dot on the standalone hero CTA is the exact §2.9
//    strict-dot drift (U:151/GG:150 ruling) — the dot does not port.
//  - The privacy quote is rewritten to ADR-0002's real boundary: run
//    diffs/stdout DO ride up for review; the repo and credentials never do.
//
// Signed-in visitors keep landing on their role surface — the same
// landingFor mapping as app/sign-in/actions.ts:20–24 (M6); duplicated here
// because "use server" modules only export actions (flagged in HANDOFF-M14).
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PublicTopNav, TopNavLink } from "@/src/components/public/PublicTopNav";
import { getCurrentUser } from "@/src/domain/auth/current-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Atlas — a quiet place for the work your AI does",
  description:
    "An engineer's orchestration cockpit: dispatch Runs, answer the Engine when it blocks, review and ship what it produces — with the code never leaving your machine.",
};

/** the landing's pill-link recipe (FF:45–49 minus the §2.9 strict-dot drift). */
const HERO_PILL =
  "font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-6 py-4 rounded-full shadow-sm inline-flex items-center gap-2 cursor-pointer";

export default async function LandingPage() {
  // M6's landingFor: signed-in users never see the marketing page.
  const user = await getCurrentUser();
  if (user?.role === "owner") redirect("/today");
  if (user?.role === "collaborator") redirect("/inbox");

  return (
    <div className="relative flex-1 text-stone-900 font-sans">
      <PublicTopNav
        links={
          <>
            <TopNavLink href="/docs">Docs</TopNavLink>
            <TopNavLink href="/changelog">Changelog</TopNavLink>
            <TopNavLink href="/status">Status</TopNavLink>
            <TopNavLink href="/sign-in" emphasis>
              Sign in
            </TopNavLink>
          </>
        }
      />

      {/* Page content */}
      <main className="min-h-screen pt-32 pb-32 px-8">
        {/* HERO */}
        <section className="max-w-3xl mx-auto">
          <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
            Atlas · v2
          </div>
          <h1 className="mt-4 text-[5.5rem] font-bold tracking-tighter leading-[0.9]">
            A quiet place
            <br />
            for the work
            <br />
            your AI does.
          </h1>
          <p className="mt-10 text-2xl tracking-tight leading-snug text-stone-700 max-w-2xl">
            Atlas is the calm cockpit where an engineer orchestrates
            AI-engineered work across their projects — dispatching Runs,
            answering the Engine when it blocks, reviewing and shipping what
            it produces. Your trusted circle files{" "}
            <span className="italic">&ldquo;please fix this&rdquo;</span> in
            plain language alongside.
          </p>
          <div className="mt-12 flex items-center gap-5">
            <Link href="/sign-in" className={HERO_PILL}>
              Sign in
              <span className="text-stone-400">→</span>
            </Link>
            <Link
              href="/docs"
              className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
            >
              or read the docs →
            </Link>
          </div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-stone-400">
            Invite-only · one Owner per instance · Collaborators join by magic link
          </p>
        </section>

        {/* TWO AUDIENCES */}
        <section className="mt-40 max-w-4xl mx-auto">
          <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
            Two ways in
          </div>
          <h2 className="mt-3 text-5xl font-bold tracking-tighter">
            Atlas serves two people.
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-12">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-amber-700">
                the Owner
              </div>
              <p className="mt-3 text-2xl tracking-tight leading-tight">
                The one human reviewing every diff.
              </p>
              <p className="mt-4 text-base text-stone-700 leading-relaxed">
                You sign in, pair a Bridge, ingest a repo. The Engine runs on
                your machine through your own Claude Code account — in
                parallel git worktrees, streaming live to the cockpit. You
                approve what ships.
              </p>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                the Collaborator
              </div>
              <p className="mt-3 text-2xl tracking-tight leading-tight">
                The people who file in plain language.
              </p>
              <p className="mt-4 text-base text-stone-700 leading-relaxed">
                Invited by a magic link that says exactly what they will and
                won&rsquo;t see. They file requests in plain words and follow
                what happens from their inbox — the code surfaces, diffs and
                Runs and stdout, stay the Owner&rsquo;s.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mt-40 max-w-3xl mx-auto">
          <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
            How it works
          </div>
          <h2 className="mt-3 text-5xl font-bold tracking-tighter">
            Three steps. No magic.
          </h2>

          <ol className="mt-12 space-y-14">
            <li className="grid grid-cols-[48px_1fr] gap-8 items-baseline">
              <span className="font-mono text-3xl text-stone-300 font-bold">
                01
              </span>
              <div>
                <h3 className="text-2xl tracking-tight font-semibold">
                  Someone files a Ticket.
                </h3>
                <p className="mt-3 text-base text-stone-700 leading-relaxed">
                  Plain language. &ldquo;The export buttons feel buried&rdquo;
                  or &ldquo;this typo bugs me.&rdquo; A Helper Run enriches it
                  — kind, priority, likely files — before you even look.
                </p>
              </div>
            </li>
            <li className="grid grid-cols-[48px_1fr] gap-8 items-baseline">
              <span className="font-mono text-3xl text-stone-300 font-bold">
                02
              </span>
              <div>
                <h3 className="text-2xl tracking-tight font-semibold">
                  You review and dispatch.
                </h3>
                <p className="mt-3 text-base text-stone-700 leading-relaxed">
                  Glance at the Brief. Edit it if you want. Click Dispatch.
                  The Engine runs on your computer, in its own git worktree,
                  streaming every line to the cockpit — and comes back ready
                  for review.
                </p>
              </div>
            </li>
            <li className="grid grid-cols-[48px_1fr] gap-8 items-baseline">
              <span className="font-mono text-3xl text-stone-300 font-bold">
                03
              </span>
              <div>
                <h3 className="text-2xl tracking-tight font-semibold">
                  You ship. Atlas keeps the record.
                </h3>
                <p className="mt-3 text-base text-stone-700 leading-relaxed">
                  Review and ship are one motion: approve from the diff
                  viewer and the Bridge lands it — a local merge or a
                  squash-merged PR. The feed records what shipped, when, and
                  why.
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* PRIVACY PULL-QUOTE — rewritten to the ADR-0002 boundary */}
        <section className="mt-40 max-w-3xl mx-auto">
          <div className="relative pl-8">
            <span className="absolute -left-2 -top-4 font-bold text-7xl text-emerald-400/80 leading-none select-none">
              &ldquo;
            </span>
            <p className="text-3xl italic text-stone-800 leading-tight tracking-tight">
              Your repo never leaves your machine. The Engine runs locally,
              through{" "}
              <span className="not-italic font-semibold">your own Claude Code account</span>
              . What reaches Atlas&rsquo;s cloud is the record — Briefs, run
              states, stdout, each Run&rsquo;s diff for review. Never the
              codebase. Never your credentials.
            </p>
            <div className="mt-5 font-mono text-[10px] uppercase tracking-widest text-stone-500">
              The privacy stance · &nbsp;
              <Link
                href="/docs/architecture"
                className="text-stone-700 hover:text-amber-600 cursor-pointer"
              >
                read the full architecture →
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-40 max-w-3xl mx-auto">
          <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
            Common questions
          </div>
          <h2 className="mt-3 text-5xl font-bold tracking-tighter">
            You probably want to ask.
          </h2>
          <ol className="mt-12 divide-y divide-stone-200">
            <FaqRow q="Where does the Engine actually run?">
              On your machine, always. The Bridge — a small daemon you pair
              once — claims dispatched Runs, gives each one its own git
              worktree, and spawns Claude Code locally. Atlas&rsquo;s cloud
              never executes your code; it orchestrates and records.
            </FaqRow>
            <FaqRow q="What lands on Atlas's servers?">
              Tickets, Briefs, run state, streamed stdout, and each
              Run&rsquo;s diff so you can review from any browser. Not the
              repo. Not your git or GitHub credentials. Not your Claude Code
              session — those stay with the Bridge, on your machine.
            </FaqRow>
            <FaqRow q="Can my Collaborators see my code?">
              No. Collaborators are a trusted circle you invite by magic
              link. They file and follow work in plain language; diffs, Runs,
              and Engine output are Owner-only surfaces.
            </FaqRow>
            <FaqRow q="What if my laptop is off when I dispatch?">
              Runs queue. When the Bridge reconnects it syncs first and picks
              up exactly the work orders that accumulated — filing and
              dispatching never depend on your machine being awake.
            </FaqRow>
            <FaqRow q="Can two Runs touch the same project at once?">
              Yes — that&rsquo;s the point. Every Run executes in its own git
              worktree, so parallel Runs never collide in a working copy.
              Sequence Hints and Ship Groups tell you what&rsquo;s
              parallel-safe and what has to wait.
            </FaqRow>
          </ol>
        </section>

        {/* CLOSING CTA */}
        <section className="mt-40 max-w-3xl mx-auto text-center">
          <p className="text-3xl tracking-tight leading-tight text-stone-700">
            Atlas runs one Owner per instance,
            <br />
            with a trusted circle filing work alongside.
            <br />
            If that Owner is you, the cockpit is waiting.
          </p>
          <div className="mt-12 flex items-center justify-center gap-5">
            <Link href="/sign-in" className={HERO_PILL}>
              Sign in
              <span className="text-stone-400">→</span>
            </Link>
            <Link
              href="/docs/welcome-to-atlas"
              className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
            >
              or start with what Atlas is →
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-40 max-w-5xl mx-auto pt-12 border-t border-stone-200">
          <div className="grid grid-cols-4 gap-12">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                Atlas
              </div>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link
                    href="/docs/welcome-to-atlas"
                    className="text-stone-700 hover:text-amber-600 cursor-pointer"
                  >
                    What it is
                  </Link>
                </li>
                <li>
                  <Link
                    href="/changelog"
                    className="text-stone-700 hover:text-amber-600 cursor-pointer"
                  >
                    Changelog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/status"
                    className="text-stone-700 hover:text-amber-600 cursor-pointer"
                  >
                    Status
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                Learn
              </div>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link
                    href="/docs"
                    className="text-stone-700 hover:text-amber-600 cursor-pointer"
                  >
                    Docs
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/architecture"
                    className="text-stone-700 hover:text-amber-600 cursor-pointer"
                  >
                    Architecture
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/the-editorial-register"
                    className="text-stone-700 hover:text-amber-600 cursor-pointer"
                  >
                    The design language
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                Concepts
              </div>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link
                    href="/docs/tickets-briefs-and-runs"
                    className="text-stone-700 hover:text-amber-600 cursor-pointer"
                  >
                    Tickets, Briefs &amp; Runs
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/the-bridge-and-the-engine"
                    className="text-stone-700 hover:text-amber-600 cursor-pointer"
                  >
                    The Bridge &amp; the Engine
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/sequence-hints-and-ship-groups"
                    className="text-stone-700 hover:text-amber-600 cursor-pointer"
                  >
                    Hints &amp; Ship Groups
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                Made by
              </div>
              <p className="mt-4 text-sm text-stone-700 leading-relaxed">
                Onkesh, solo. Built patient and audited, module by module.
              </p>
              <a
                href="mailto:onkesh19@gmail.com"
                className="mt-3 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
              >
                Say hi ↗
              </a>
            </div>
          </div>
          <div className="mt-12 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-stone-400">
            <span>atlas · MMXXVI</span>
            <span>Built with Next, Tailwind, Geist · data on Neon</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

/**
 * FF:329–345's FaqRow drew a `+` affordance over an always-open answer —
 * the drawn affordance made real (the M8 filter-chip precedent): a native
 * details/summary accordion, `+` ↔ `−` via group-open. Content stays in
 * the DOM either way.
 */
function FaqRow({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <li className="py-6">
      <details className="group">
        <summary className="flex items-baseline justify-between gap-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <h3 className="text-xl tracking-tight font-medium text-stone-900 group-hover:text-stone-700">
            {q}
          </h3>
          <span className="font-mono text-stone-400 group-hover:text-stone-900 transition text-xl">
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
          </span>
        </summary>
        <p className="mt-3 text-base text-stone-700 leading-relaxed max-w-xl">
          {children}
        </p>
      </details>
    </li>
  );
}
