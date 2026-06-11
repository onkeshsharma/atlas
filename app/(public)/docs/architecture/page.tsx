// M14 — the architecture deep-dive. Ported from
// design/variants/variant-pp-arch.tsx:44–632 (fidelity protocol §5):
// breadcrumb row, mono article header, text-5xl title, lane diagram in a
// doc figure, PlayerRow divided list, numbered dispatch steps, mono-label
// Held rows, ✕ list, FailureRow divided list, numbered security list,
// trade-off paragraphs, italic closing, 280 TOC rail (PP:54).
//
// Content is the REAL v2 architecture, told from intake ADR-0001
// (cloud Atlas + Bridge-as-orchestrator + worktree-per-Run) and repo
// ADR-0002 (outbox-as-command-log, sync-then-subscribe, hashed tokens) —
// nothing fictional (charter item 4). PP's v1.3 claims that did not
// survive the rewrite (mTLS, signed Briefs, ~/.atlas/queue.json, stdout
// only-on-failure, "Cloud Bridge fallback in v1.4") are recorded as
// deviations in M14-manual-test.md. The authed sidebar does not port
// (public page — see the docs index header note).
import type { Metadata } from "next";
import Link from "next/link";

import { DocFigure } from "@/src/components/kit";

export const metadata: Metadata = {
  title: "Atlas — how it actually works",
  description:
    "The v2 architecture: five players, one command log, one privacy stance.",
};

const TOC = [
  { id: "at-a-glance", label: "At a glance" },
  { id: "five-players", label: "The five players" },
  { id: "dispatch-path", label: "The dispatch path" },
  { id: "what-atlas-holds", label: "What Atlas holds" },
  { id: "what-stays-local", label: "What stays on your machine" },
  { id: "failure-modes", label: "Failure modes" },
  { id: "security", label: "Security model" },
  { id: "tradeoffs", label: "Trade-offs" },
];

const RELATED = [
  {
    href: "/docs/the-bridge-and-the-engine",
    label: "The Bridge & the Engine",
    meta: "concepts · 4 min",
  },
  {
    href: "/docs/tickets-briefs-and-runs",
    label: "Tickets, Briefs & Runs",
    meta: "concepts · 4 min",
  },
  {
    href: "/docs/needs-input-and-steering",
    label: "Needs Input & steering",
    meta: "concepts · 3 min",
  },
];

export default function ArchitecturePage() {
  return (
    <div className="relative flex-1 text-stone-900 font-sans">
      <main className="flex-1 px-16 pt-8 pb-24">
        {/* Top breadcrumb (PP:45–52 + public wordmark home link) */}
        <div className="flex items-baseline justify-between gap-8">
          <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
            <Link href="/" className="hover:text-stone-900 cursor-pointer">
              Atlas
            </Link>{" "}
            ·{" "}
            <Link href="/docs" className="hover:text-stone-900 cursor-pointer">
              Docs
            </Link>{" "}
            · Concepts · Architecture
          </div>
          <Link
            href="/docs"
            className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
          >
            all docs →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-[1fr_280px] gap-16">
          <article className="max-w-2xl">
            <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
              Concepts · ~9 min read · updated June 12, 2026
            </div>
            <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
              How Atlas actually works.
            </h1>
            <p className="mt-5 text-xl text-stone-700 leading-relaxed">
              Five players, one command log, one privacy stance. This page is
              for anyone deciding whether to trust Atlas with their circle or
              their codebase.
            </p>

            {/* AT A GLANCE */}
            <section id="at-a-glance" className="mt-16">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                At a glance
              </h2>
              <p className="mt-5 text-base text-stone-700 leading-relaxed">
                Atlas is a cloud-hosted cockpit in front of locally-running
                Claude Code. The Engine that writes your code{" "}
                <span className="italic">runs on the Owner&rsquo;s machine</span>,
                spawned by a daemon called the Bridge. Atlas&rsquo;s cloud
                holds the record — Tickets, Briefs, Run state, streamed
                stdout, each Run&rsquo;s diff. It does not hold your repo,
                your credentials, or your Claude Code session.
              </p>

              {/* Big diagram (PP:84–142, kit DocFigure per canon §2.4) */}
              <div className="mt-10">
                <DocFigure caption="Fig. 1 — the system, end to end">
                  <div className="flex items-center justify-between gap-4">
                    <Lane label="Owner" sub="drives the cockpit" color="emerald" />
                    <Arrow />
                    <Lane label="Atlas" sub="cloud · cockpit + record" color="amber" active />
                    <Arrow />
                    <Lane label="Bridge" sub="daemon on the Owner's machine" color="stone" />
                    <Arrow />
                    <Lane label="Engine" sub="Claude Code, locally" color="stone" />
                    <Arrow />
                    <Lane label="GitHub" sub="PR on ship · optional" color="stone" />
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-6 text-sm text-stone-600 leading-relaxed">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                        Cloud
                      </span>
                      <p className="mt-1">
                        The Next.js app and its Postgres. Holds Tickets,
                        Briefs, Run records, the activity feed, and hashed
                        Bridge tokens.
                      </p>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-700">
                        Your machine
                      </span>
                      <p className="mt-1">
                        The Bridge spawns the Engine in a per-Run git
                        worktree; it writes the change, streams its output,
                        and ships on your word.
                      </p>
                    </div>
                  </div>
                </DocFigure>
              </div>
            </section>

            {/* FIVE PLAYERS */}
            <section id="five-players" className="mt-20">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                The five players
              </h2>
              <ol className="mt-7 divide-y divide-stone-200">
                <PlayerRow
                  ord="01"
                  name="Owner"
                  sub="one human · reviews every diff"
                  desc="The engineer-orchestrator. Dispatches work, answers the Engine when it blocks, approves what ships. Owns the machine the Bridge runs on."
                />
                <PlayerRow
                  ord="02"
                  name="Collaborator"
                  sub="a trusted circle · file in plain language"
                  desc="Invited by magic link. They drive work through Atlas's UI in plain words; the code surfaces stay the Owner's."
                />
                <PlayerRow
                  ord="03"
                  name="Atlas"
                  sub="cloud · the cockpit you're reading"
                  desc="The Next.js app on this domain. Hosts the record — Tickets, Briefs, Runs, the live feed — and serves the cockpit. Executes nothing."
                />
                <PlayerRow
                  ord="04"
                  name="Bridge"
                  sub="daemon · the Owner's machine"
                  desc="The local orchestrator. Claims dispatched Runs, manages a git worktree per Run, runs N Engine sessions under a cap, streams everything back. The trust boundary between cloud and machine."
                />
                <PlayerRow
                  ord="05"
                  name="Engine"
                  sub="Claude Code · one session per Run"
                  desc="The thing that actually writes code, authorized through the Owner's own Claude Code account. Lives and dies inside its Run."
                />
              </ol>
            </section>

            {/* DISPATCH PATH */}
            <section id="dispatch-path" className="mt-20">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                The dispatch path
              </h2>
              <p className="mt-5 text-base text-stone-700 leading-relaxed">
                Eight steps from &ldquo;please fix this&rdquo; to
                &ldquo;shipped&rdquo; — every one of them recorded.
              </p>
              <ol className="mt-7 space-y-5 text-base text-stone-700 leading-relaxed">
                <Step
                  n="01"
                  title="A Ticket is filed"
                  body="Title and story land in Atlas's database. A Helper Run enriches it in the background — kind, priority, likely files."
                />
                <Step
                  n="02"
                  title="A Brief is drafted"
                  body="A Helper Run drafts the Brief from the Ticket and the project's context; the Owner edits it in a composer with real edit / preview / diff tabs."
                />
                <Step
                  n="03"
                  title="The Owner dispatches"
                  body="One database statement creates the queued Run AND its feed event. That feed is a transactional outbox — the command log and the activity history are the same rows."
                />
                <Step
                  n="04"
                  title="The Bridge picks it up"
                  body="The daemon subscribes to the feed cursor over SSE. On (re)connect it syncs the queue as it exists now, then listens — which is why Runs dispatched while the machine slept just start."
                />
                <Step
                  n="05"
                  title="The Engine runs in its own worktree"
                  body="The Bridge creates a git worktree and branch for the Run and spawns Claude Code in it. Parallel Runs on one project never share a working copy."
                />
                <Step
                  n="06"
                  title="The Run streams"
                  body="stdout batches up to Atlas on its own cursor; the browser streams it live. A question from the Engine flips the Run to needs-input; the Owner's answer flows back down and the Run resumes."
                />
                <Step
                  n="07"
                  title="Review"
                  body="The Run comes back review-ready with its diff. The Owner reads it in the diff viewer — review and ship are one motion on that page."
                />
                <Step
                  n="08"
                  title="Approve-and-ship"
                  body="The Bridge lands the change: a local merge into the checked-out branch, or push → PR → squash-merge when a remote is configured. The feed records what landed."
                />
              </ol>
            </section>

            {/* WHAT ATLAS HOLDS */}
            <section id="what-atlas-holds" className="mt-20">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                What Atlas holds
              </h2>
              <ul className="mt-5 space-y-3 text-base text-stone-700 leading-relaxed">
                <Held label="Accounts">
                  Email, display name, sessions — via Neon Auth. Membership
                  and role (the one Owner, the circle).
                </Held>
                <Held label="Tickets">
                  Title, long-form body, reporter, state, declared
                  dependencies, AI enrichment.
                </Held>
                <Held label="Briefs">
                  The text the Engine reads — the Helper draft and the
                  Owner&rsquo;s edit, kept apart.
                </Held>
                <Held label="Run records">
                  States and timestamps, streamed stdout, diff stats and the
                  unified diff for review, merge sha / PR reference.
                </Held>
                <Held label="The feed">
                  Every event the system ever wrote — the activity pages, the
                  live seam, and the Bridge&rsquo;s command log read the same rows.
                </Held>
                <Held label="Bridges">
                  Name, capabilities, last heartbeat — and the sha-256 hash
                  of the pairing token, never the token itself.
                </Held>
              </ul>
            </section>

            {/* WHAT STAYS LOCAL */}
            <section id="what-stays-local" className="mt-20">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                What stays on your machine
              </h2>
              <ul className="mt-5 space-y-3 text-base text-stone-700 leading-relaxed">
                <StaysLocal>The repo and its full history · ever, in any form.</StaysLocal>
                <StaysLocal>
                  Your git and GitHub credentials — the Bridge uses your
                  ambient <span className="font-mono text-sm">git</span>/
                  <span className="font-mono text-sm">gh</span> auth and never
                  uploads it.
                </StaysLocal>
                <StaysLocal>Your Claude Code session and account.</StaysLocal>
                <StaysLocal>
                  The worktrees themselves — including the ones kept around
                  after a failure so you can inspect them.
                </StaysLocal>
                <StaysLocal>
                  Anything the Engine read but didn&rsquo;t change — what
                  rides up is each Run&rsquo;s diff and stdout, not the tree.
                </StaysLocal>
              </ul>
              <p className="mt-7 text-base italic text-stone-500 leading-relaxed">
                The blast radius of an Atlas breach is{" "}
                <span className="not-italic font-semibold text-stone-900">
                  who can read your Tickets, Briefs, and Run diffs
                </span>{" "}
                — never push access to your repo, never your credentials.
              </p>
            </section>

            {/* FAILURE MODES */}
            <section id="failure-modes" className="mt-20">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Failure modes
              </h2>
              <ol className="mt-7 divide-y divide-stone-200">
                <FailureRow
                  kind="bridge-offline"
                  title="Your Bridge is offline"
                  body="Most common cause: the laptop is asleep. Dispatched Runs are simply queued rows; on reconnect the daemon syncs the queue first and starts exactly what accumulated. No data loss."
                />
                <FailureRow
                  kind="conflict"
                  title="The merge can't land"
                  body="The Run's branch diverged while it worked. The ship aborts cleanly with the conflicted file list, and the cockpit offers one-click send-back — the Engine gets a re-Brief with the conflict context."
                />
                <FailureRow
                  kind="not-mergeable"
                  title="Your checkout isn't ready"
                  body="A dirty tree or detached HEAD on the target repo. The Bridge refuses to merge into a state you'd lose work in, and says exactly why."
                />
                <FailureRow
                  kind="bridge-lost"
                  title="The daemon died mid-Run"
                  body="On restart, the Bridge fails any Run it was supposed to be executing but isn't — honestly, with this named reason — instead of leaving it 'running' forever."
                />
              </ol>
            </section>

            {/* SECURITY */}
            <section id="security" className="mt-20">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Security model
              </h2>
              <p className="mt-5 text-base text-stone-700 leading-relaxed">
                The trust boundary is the Bridge. Atlas can ask it to run an
                Engine; it cannot reach into your filesystem. Three things
                keep the boundary sharp:
              </p>
              <ol className="mt-5 space-y-3 text-base text-stone-700 leading-relaxed list-none">
                <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                  <span className="font-mono text-xs text-stone-400">01</span>
                  <span>
                    Pairing mints a bearer token shown exactly once; Atlas
                    stores only its{" "}
                    <span className="font-mono text-sm text-stone-700">sha-256</span>{" "}
                    hash. A rejected token stops the daemon dead — a revoked
                    Bridge never retries its way back in.
                  </span>
                </li>
                <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                  <span className="font-mono text-xs text-stone-400">02</span>
                  <span>
                    The Bridge only dials out. There is no listener on your
                    machine, nothing for the internet to find — Atlas
                    couldn&rsquo;t connect to it even if compromised.
                  </span>
                </li>
                <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                  <span className="font-mono text-xs text-stone-400">03</span>
                  <span>
                    Every state change is a single conditional statement that
                    writes its own feed event. Races lose cleanly — an Engine
                    finishing a Run you just cancelled finds the claim
                    already gone; nothing needs a distributed lock.
                  </span>
                </li>
              </ol>
            </section>

            {/* TRADE-OFFS */}
            <section id="tradeoffs" className="mt-20">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Trade-offs
              </h2>
              <div className="mt-5 space-y-5 text-base text-stone-700 leading-relaxed">
                <p>
                  <span className="font-semibold text-stone-900">Privacy over scale.</span>{" "}
                  Atlas can&rsquo;t auto-scale Engine compute, because the
                  Engine isn&rsquo;t in its cloud. The concurrency ceiling is
                  your machine and your cap. Cloud execution isn&rsquo;t a
                  roadmap item — it&rsquo;s permanently out, by decision.
                </p>
                <p>
                  <span className="font-semibold text-stone-900">Owner bottleneck.</span>{" "}
                  Every diff routes through one human. The property that
                  makes Atlas safe to trust caps its throughput at one
                  person&rsquo;s reading speed — deliberately.
                </p>
                <p>
                  <span className="font-semibold text-stone-900">
                    One machine, honestly handled.
                  </span>{" "}
                  If the Owner&rsquo;s machine dies, Runs queue until it
                  returns; orphaned work is failed with a named reason, not
                  left hanging. There is no failover tier to pretend
                  otherwise.
                </p>
              </div>
            </section>

            {/* Closing */}
            <p className="mt-20 text-base italic text-stone-500 leading-relaxed">
              This page is a snapshot of Atlas v2 as built. The architecture
              is deliberately conservative — boring primitives, one source of
              truth per concern, failure modes with names. We&rsquo;d rather
              the design surprise nobody.
            </p>
          </article>

          {/* RAIL (PP:418–503) */}
          <aside className="space-y-12">
            <section>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                On this page
              </div>
              <ol className="mt-5 space-y-2.5">
                {TOC.map((item, i) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="group flex items-baseline gap-3 text-sm cursor-pointer"
                    >
                      <span className="font-mono text-[10px] text-stone-400 w-5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-stone-700 group-hover:text-stone-900">
                        {item.label}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Meta
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-500">Section</span>
                  <span className="text-stone-700">Concepts</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-500">Read time</span>
                  <span className="font-mono text-stone-700">~9 min</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-500">Updated</span>
                  <span className="font-mono text-stone-700">June 12, 2026</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-500">Audience</span>
                  <span className="text-stone-700">Owners · Engineers</span>
                </li>
              </ul>
            </section>

            <section>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Related
              </div>
              <ul className="mt-5 space-y-3">
                {RELATED.map((r) => (
                  <li key={r.href} className="group cursor-pointer">
                    <Link href={r.href} className="block">
                      <div className="text-sm text-stone-700 group-hover:text-stone-900">
                        {r.label}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-stone-400">{r.meta}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="pt-4 border-t border-stone-200/80">
              <p className="text-sm italic text-stone-500 leading-relaxed">
                Source:{" "}
                <span className="not-italic font-mono text-xs text-stone-700">
                  ADR-0001 · ADR-0002
                </span>{" "}
                — the architecture decision records this page retells.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

// ── PP's local figure pieces (PP:516–632) ──────────────────────────────

function Lane({
  label,
  sub,
  color,
  active,
}: {
  label: string;
  sub: string;
  color: "emerald" | "amber" | "stone";
  active?: boolean;
}) {
  const ring =
    color === "emerald"
      ? "border-emerald-300"
      : color === "amber"
        ? "border-amber-300"
        : "border-stone-300";
  return (
    <div
      className={`text-center px-3 py-2 border-2 rounded-lg min-w-[90px] ${
        active ? `${ring} bg-amber-50` : "border-stone-200"
      }`}
    >
      <div className="text-xs font-semibold text-stone-900">{label}</div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-widest text-stone-500">
        {sub}
      </div>
    </div>
  );
}

function Arrow() {
  return <span className="font-mono text-stone-400 text-lg">→</span>;
}

function PlayerRow({
  ord,
  name,
  sub,
  desc,
}: {
  ord: string;
  name: string;
  sub: string;
  desc: string;
}) {
  return (
    <li className="py-5 grid grid-cols-[40px_1fr] items-baseline gap-6">
      <span className="font-mono text-xs text-stone-400">{ord}</span>
      <div>
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-tight text-stone-900">{name}</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
            {sub}
          </span>
        </div>
        <p className="mt-1.5 text-base text-stone-700 leading-relaxed">{desc}</p>
      </div>
    </li>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="grid grid-cols-[40px_1fr] gap-6 items-baseline">
      <span className="font-mono text-xs text-stone-400">{n}</span>
      <div>
        <div className="text-base font-semibold text-stone-900">{title}</div>
        <p className="mt-1 text-sm text-stone-600 leading-relaxed">{body}</p>
      </div>
    </li>
  );
}

function Held({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[120px_1fr] gap-6 items-baseline">
      <span className="font-mono text-xs uppercase tracking-widest text-stone-500">{label}</span>
      <span>{children}</span>
    </li>
  );
}

function StaysLocal({ children }: { children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
      <span className="text-rose-500 mt-1.5">✕</span>
      <span>{children}</span>
    </li>
  );
}

function FailureRow({
  kind,
  title,
  body,
}: {
  kind: string;
  title: string;
  body: string;
}) {
  return (
    <li className="py-5 grid grid-cols-[120px_1fr] items-baseline gap-6">
      <span className="font-mono text-[10px] uppercase tracking-widest text-amber-700">
        {kind}
      </span>
      <div>
        <div className="text-base font-semibold text-stone-900">{title}</div>
        <p className="mt-1.5 text-base text-stone-700 leading-relaxed">{body}</p>
      </div>
    </li>
  );
}
