// M14 — public changelog. Ported from
// design/variants/variant-nn-changelog.tsx:86–255 (fidelity protocol §5):
// corner chrome, text-6xl hero, quiet meta row, the §4-M14 [120px_1fr]
// date-gutter timeline (kit DateGutterTimeline, NN:131–154), per-release
// Shipped/Fixed groups, italic archive footer. Design-lab colophon NOT
// ported (canon §4 footnote).
//
// Honesty pass (charter item 6 — recorded in notes/M14-manual-test.md):
//  - Entries are the REAL v2 build history, M0 master plan → M9 Engine &
//    Runs (master plan §8 + the module handoffs), written as a product
//    changelog, not a commit log. Dates are the real 2026-06-11/12.
//  - NN's RSS / "email me when something ships" links promise pipelines
//    that don't exist → the meta row keeps only the true count + dates.
//  - NN:226–228 "diff from previous ↗" needs a public repo → dropped;
//    "permalink" stays and is REAL (kit anchor-id axis).
//  - NN:96 "Status ↗" — status is an Atlas page, not an exit; §3.6 says
//    ↗ leaves Atlas → plain link (canon over variant).
import type { Metadata } from "next";
import Link from "next/link";

import { DateGutterTimeline, type DateGutterEntry } from "@/src/components/kit";
import { PublicTopNav, TopNavLink } from "@/src/components/public/PublicTopNav";

export const metadata: Metadata = {
  title: "Atlas — changelog",
  description: "The v2 build history, module by module, in plain language.",
};

type Drop = {
  anchor: string;
  id: string;
  date: string;
  title: string;
  intro: string;
  shipped: string[];
  fixed?: string[];
  current?: boolean;
};

/** the REAL v2 history — master plan §8, newest first. */
const DROPS: Drop[] = [
  {
    anchor: "M10 · M14",
    id: "m10-m14",
    date: "shipped June 12, 2026",
    title: "The daemon answers to the browser — and Atlas makes its own case.",
    current: true,
    intro:
      "Two modules built in parallel worktrees: the settings tier that governs the Bridge from the cockpit, and the public pages you are reading right now.",
    shipped: [
      "Pair a Bridge from the UI — a show-once token, guided install steps, rotate and revoke",
      "The Bridge doctor — seven honest checks (git, gh, repo paths, stale worktrees, lock, engine) run on the daemon and reported live",
      "The concurrency cap as a dial — the daemon echoes the cap it holds, so the page reports rather than guesses",
      "API tokens, account, notifications, profile — the full settings tier, with type-to-confirm on the one destructive action",
      "This site: the landing, seven docs, the architecture deep-dive, a real-probes status page, and this changelog",
    ],
  },
  {
    anchor: "M9",
    id: "m9",
    date: "shipped June 12, 2026",
    title: "The Engine takes orders.",
    intro:
      "The Bridge grew from an idea into the local orchestrator: a daemon on the Owner’s machine that runs Engine sessions in parallel, each Run in its own git worktree, streaming every line back to the cockpit — and taking orders from it.",
    shipped: [
      "The Bridge daemon — concurrency cap, priority lanes (your Runs always beat Helper Runs), offline queueing",
      "Live Run pages — streaming terminal, gate track, and honest per-state framing for queued, running, failed, shipped",
      "Needs Input, answered from the browser — the Engine’s question becomes the amber strip; your answer resumes the Run",
      "Cancel from the cockpit — runaway work stops without a terminal",
      "The diff viewer — review and ship are one motion; approve-and-ship lands a local merge or a squash-merged PR",
      "The Brief composer — edit, preview, and diff your Brief against the Engine’s draft before dispatch",
      "One-click conflict send-back — a failed merge re-Briefs the Engine with the conflict context",
    ],
    fixed: [
      "A half-open live stream could quietly stop refreshing pages — the cockpit now detects and rebuilds it",
    ],
  },
  {
    anchor: "M7 · M8",
    id: "m7-m8",
    date: "shipped June 11, 2026",
    title: "Projects, Tickets, and the board.",
    intro:
      "Two modules built the same day in parallel git worktrees — the same way Atlas runs its own Engine work.",
    shipped: [
      "Ingest an existing repo — an Engine-written Ingest Summary, project landing, and the living Context viewer",
      "The Kanban board — five Categories, real Sequence Hints on cards (blocked-by · recommended-after · parallel-safe-with)",
      "Ship Groups — review-ready work clustered into what can land together and what must wait",
      "Keyboard-first triage — approve, backlog, needs-info, decline without touching the mouse",
      "Ticket detail that tells the whole story — long-form body, activity, state-machine track, AI enrichment",
      "File a Ticket in seconds — a Helper Run enriches it before you even look",
    ],
  },
  {
    anchor: "M6",
    id: "m6",
    date: "shipped June 11, 2026",
    title: "The cockpit comes alive.",
    intro:
      "Today. — the front page that is also the live orchestration view. One typed live seam over a transactional outbox keeps every open page honest, without a reload anywhere.",
    shipped: [
      "Today. — day-stamp, hero sentence, pinned projects, and the activity feed as an editorial page",
      "The live seam — a state change on the server appears in open tabs within seconds",
      "The Run state machine — one legal-transition table the whole system obeys",
      "Inbox — the instance feed with real filters and mark-all-read",
    ],
  },
  {
    anchor: "M5",
    id: "m5",
    date: "shipped June 11, 2026",
    title: "Doors.",
    intro: "Auth and the six pre-auth surfaces — invite-only by design.",
    shipped: [
      "Sign-in and sign-up, gated by the Owner code — exactly one Owner per instance",
      "Magic-link invites with a welcome note — the invite page says exactly what a Collaborator will and won’t see",
      "Collaborator onboarding with a real profile step",
      "Session auth via Neon Auth, guarded at the edge and in every action",
    ],
  },
  {
    anchor: "M3 · M4",
    id: "m3-m4",
    date: "shipped June 11, 2026",
    title: "The kit before the pages.",
    intro:
      "No surface was allowed to exist before the design system did: the 52 prototype variants vendored byte-identical with a live render route, and 28 editorial primitives extracted from them.",
    shipped: [
      "The scaffold — Next.js App Router, Tailwind v4, typecheck/lint/test gates on every commit",
      "The component kit — 28 primitives, each rendered side-by-side with its prototype source",
      "The fidelity tripwire — design-canon rules checked mechanically before any commit lands",
    ],
  },
  {
    anchor: "M0 – M2",
    id: "m0-m2",
    date: "signed June 11, 2026",
    title: "Law before code.",
    intro:
      "v2 started as paper: a master plan, a re-derived product definition, and a design canon signed as law — every prototype inconsistency resolved once, with cited evidence, never re-argued per page.",
    shipped: [
      "The master plan — a fresh session per module, written charters and handoffs, no drift",
      "INTAKE — vision, glossary, and a 56-story PRD, signed",
      "The design canon — tokens, the 28-primitive inventory, and an exceptions ledger",
    ],
  },
];

export default function ChangelogPage() {
  const entries: DateGutterEntry[] = DROPS.map((drop) => ({
    anchor: drop.anchor,
    id: drop.id,
    date: drop.date,
    current: drop.current,
    children: <DropBody drop={drop} />,
  }));

  return (
    <div className="relative flex-1 text-stone-900 font-sans">
      <PublicTopNav
        surface="changelog"
        links={
          <>
            <TopNavLink href="/docs">Docs</TopNavLink>
            {/* NN:96 draws "Status ↗" — internal link, §3.6: no ↗ */}
            <TopNavLink href="/status">Status</TopNavLink>
            <TopNavLink href="/">Atlas →</TopNavLink>
          </>
        }
      />

      <main className="min-h-screen pt-28 pb-24 px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header (NN:103–112) */}
          <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
            Atlas · what shipped, when
          </div>
          <h1 className="mt-4 text-6xl font-bold tracking-tighter leading-[0.95]">
            What we shipped.
          </h1>
          <p className="mt-7 text-2xl tracking-tight text-stone-700 leading-tight max-w-2xl">
            v2 ships module by module — each drop one clean build session
            with a written charter and a written handoff. Small enough to
            read in a coffee. No marketing-speak — just what changed.
          </p>

          {/* Quiet meta row (NN:115–128, honest links only) */}
          <div className="mt-7 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
            <span className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              {DROPS.length} drops
            </span>
            <span className="text-stone-300">·</span>
            <span>June 11 – 12, 2026</span>
          </div>

          {/* Releases (kit DateGutterTimeline — NN:131–154) */}
          <div className="mt-20">
            <DateGutterTimeline entries={entries} />
          </div>

          {/* Footer (NN:239–245, adapted to the true v1 story) */}
          <p className="mt-20 text-sm italic text-stone-500 leading-relaxed">
            Atlas v1 — the Collaborator-first portal this rebuild supersedes
            — shipped April – May 2026. Its changelog retired with it;
            v2&rsquo;s history starts at M0.
          </p>
        </div>
      </main>
    </div>
  );
}

/** right column of one release (NN:157–233). */
function DropBody({ drop }: { drop: Drop }) {
  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tighter leading-tight">{drop.title}</h2>
      <p className="mt-4 text-base text-stone-700 leading-relaxed">{drop.intro}</p>

      <div className="mt-8">
        <div className="text-xs font-mono uppercase tracking-[0.25em] text-emerald-700">
          Shipped
        </div>
        <ul className="mt-3 space-y-2">
          {drop.shipped.map((item) => (
            <li
              key={item}
              className="grid grid-cols-[16px_1fr] gap-3 items-baseline text-base text-stone-700 leading-relaxed"
            >
              <span className="text-emerald-500 mt-1.5">●</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {drop.fixed && (
        <div className="mt-7">
          <div className="text-xs font-mono uppercase tracking-[0.25em] text-amber-700">
            Fixed
          </div>
          <ul className="mt-3 space-y-2">
            {drop.fixed.map((item) => (
              <li
                key={item}
                className="grid grid-cols-[16px_1fr] gap-3 items-baseline text-base text-stone-700 leading-relaxed"
              >
                <span className="text-amber-500 mt-1.5">●</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-7 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
        <Link href={`#${drop.id}`} className="text-stone-700 hover:text-amber-600 cursor-pointer">
          permalink
        </Link>
      </div>
    </div>
  );
}
