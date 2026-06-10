// THROWAWAY — Editorial Architecture deep-dive prototype.
// Long-form explainer for how Atlas actually works. The page engineers AND
// Owners both read before they trust the system.

import { NAV } from "./mock-data";

const TOC = [
  { id: "at-a-glance", label: "At a glance" },
  { id: "five-players", label: "The five players" },
  { id: "dispatch-path", label: "The dispatch path" },
  { id: "what-atlas-holds", label: "What Atlas holds" },
  { id: "what-atlas-never-sees", label: "What Atlas never sees" },
  { id: "failure-modes", label: "Failure modes" },
  { id: "security", label: "Security model" },
  { id: "tradeoffs", label: "Trade-offs" },
];

export function VariantPPArch() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          <aside className="w-[56px] shrink-0 sticky top-0 h-screen self-start flex flex-col items-center justify-between py-8 border-r border-stone-200/60 z-10">
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none">a</div>
            </div>
            <nav className="flex flex-col items-center gap-5">
              {NAV.map((n) => (
                <a
                  key={n.key}
                  className="relative h-7 w-7 flex items-center justify-center cursor-pointer transition text-stone-400 hover:text-stone-900"
                >
                  <span className="text-base font-medium">{n.short.charAt(0)}</span>
                </a>
              ))}
            </nav>
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none text-stone-900">o</div>
              <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
          </aside>

          <main className="flex-1 px-16 pt-8 pb-24">
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Docs · Concepts · Architecture
              </div>
              <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                edit this page ↗
              </a>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_280px] gap-16">
              <article className="max-w-2xl">
                <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
                  Concepts · ~9 min read · updated yesterday
                </div>
                <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
                  How Atlas actually works.
                </h1>
                <p className="mt-5 text-xl text-stone-700 leading-relaxed">
                  Five players, one dispatch path, one privacy promise. This page
                  is for anyone deciding whether to trust Atlas with their team or
                  their codebase.
                </p>

                {/* AT A GLANCE */}
                <section id="at-a-glance" className="mt-16">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    At a glance
                  </h2>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    Atlas is a thin portal in front of Claude Code. The Engine
                    that writes your code{" "}
                    <span className="italic">runs on your machine</span>, through
                    a daemon called the Bridge. Atlas hosts: account metadata,
                    Tickets, Briefs, Job records, and outbound email. Atlas does
                    not host: your code, your diffs, your GitHub tokens, your
                    Claude Code session.
                  </p>

                  {/* Big diagram */}
                  <figure className="mt-10">
                    <div className="rounded-2xl border border-stone-200 bg-white p-8">
                      <div className="flex items-center justify-between gap-4">
                        <Lane
                          label="Collaborator"
                          sub="files Tickets"
                          color="emerald"
                        />
                        <Arrow />
                        <Lane
                          label="Atlas"
                          sub="portal + DB"
                          color="amber"
                          active
                        />
                        <Arrow />
                        <Lane
                          label="Bridge"
                          sub="daemon on your machine"
                          color="stone"
                        />
                        <Arrow />
                        <Lane
                          label="Engine"
                          sub="Claude Code locally"
                          color="stone"
                        />
                        <Arrow />
                        <Lane
                          label="GitHub"
                          sub="PR opens here"
                          color="stone"
                        />
                      </div>
                      <div className="mt-8 grid grid-cols-2 gap-6 text-sm text-stone-600 leading-relaxed">
                        <div>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                            Cloud
                          </span>
                          <p className="mt-1">
                            Atlas runs on Vercel + Neon. Holds account
                            metadata, Briefs, Result summaries, heartbeats.
                          </p>
                        </div>
                        <div>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-700">
                            Your machine
                          </span>
                          <p className="mt-1">
                            Bridge daemon spawns the Engine, which checks out
                            your repo, writes the change, opens a PR.
                          </p>
                        </div>
                      </div>
                    </div>
                    <figcaption className="mt-5 text-center font-mono text-[10px] uppercase tracking-widest italic text-stone-400">
                      Fig. 1 — the system, end to end
                    </figcaption>
                  </figure>
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
                      desc="You. The sole reviewer of everything the Engine produces. Approves what ships. Owns the Bridge that runs on their computer."
                    />
                    <PlayerRow
                      ord="02"
                      name="Collaborator"
                      sub="many · file in plain language"
                      desc="The non-technical members of the trusted circle. Drive work through Atlas's UI. Never see code or diffs."
                    />
                    <PlayerRow
                      ord="03"
                      name="Atlas Portal"
                      sub="cloud · the website you're looking at"
                      desc="The Next.js app you're on right now. Hosts metadata: Tickets, Briefs, Job records, account auth. Does not host code."
                    />
                    <PlayerRow
                      ord="04"
                      name="Bridge"
                      sub="daemon · runs on the Owner's machine"
                      desc="A small process the Owner installs once. Receives Job dispatches from Atlas, spawns the Engine, ships results back. The trust boundary between cloud and machine."
                    />
                    <PlayerRow
                      ord="05"
                      name="Engine"
                      sub="Claude Code · runs once per Job"
                      desc="The thing that actually writes code, runs tests, opens PRs. Authorized via the Owner's Claude Code account."
                    />
                  </ol>
                </section>

                {/* DISPATCH PATH */}
                <section id="dispatch-path" className="mt-20">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    The dispatch path
                  </h2>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    Eight steps from Collaborator-clicks-File-Ticket to
                    PR-merges-into-main.
                  </p>
                  <ol className="mt-7 space-y-5 text-base text-stone-700 leading-relaxed">
                    <Step
                      n="01"
                      title="Collaborator files a Ticket"
                      body="Title + body markdown lands in Atlas's DB. The enrich-ticket Helper Job is dispatched."
                    />
                    <Step
                      n="02"
                      title="Atlas drafts a Brief"
                      body="Helper Job reads Ticket + CONTEXT.md, writes a structured Brief. Owner reviews."
                    />
                    <Step
                      n="03"
                      title="Owner dispatches"
                      body="The Brief lands in a Job record (state=queued). Atlas pushes a dispatch event on the user's pg_notify channel."
                    />
                    <Step
                      n="04"
                      title="Bridge picks it up"
                      body="The Bridge subscribes to SSE from Atlas. On dispatch, it pulls the Brief and spawns the Engine."
                    />
                    <Step
                      n="05"
                      title="Engine runs locally"
                      body="claude-code launches with the Brief as the user prompt. The Engine has full read/write on the Owner's checkout — no sandbox."
                    />
                    <Step
                      n="06"
                      title="Quality gates run"
                      body="typecheck, lint, test, build — all on the Owner's machine. The Bridge only ships if every gate is green."
                    />
                    <Step
                      n="07"
                      title="PR opens on GitHub"
                      body="The Engine creates a branch, pushes, opens a PR. The PR URL flows back to Atlas as part of the Result."
                    />
                    <Step
                      n="08"
                      title="Atlas writes the email"
                      body="Owner reviews, approves, the PR auto-merges. Atlas drafts the Collaborator Summary and Resend ships the notification."
                    />
                  </ol>
                </section>

                {/* WHAT ATLAS HOLDS */}
                <section id="what-atlas-holds" className="mt-20">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    What Atlas holds
                  </h2>
                  <ul className="mt-5 space-y-3 text-base text-stone-700 leading-relaxed">
                    <Held label="Account metadata">
                      Email, hashed password, display name, 2FA secret.
                    </Held>
                    <Held label="Tickets">
                      Title, body markdown, reporter, state, AI hints.
                    </Held>
                    <Held label="Briefs">
                      The text the Engine reads before each Job. Owner-edited.
                    </Held>
                    <Held label="Job records">
                      Start/end times, exit code, Result summary, stdout tail
                      (last 200 lines), PR URL.
                    </Held>
                    <Held label="CONTEXT.md">
                      The hand-maintained domain glossary, in Atlas&rsquo;s DB
                      and in your repo.
                    </Held>
                    <Held label="Heartbeats">
                      Periodic ping from your Bridge so Atlas knows it&rsquo;s
                      reachable.
                    </Held>
                  </ul>
                </section>

                {/* WHAT ATLAS NEVER SEES */}
                <section id="what-atlas-never-sees" className="mt-20">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    What Atlas never sees
                  </h2>
                  <ul className="mt-5 space-y-3 text-base text-stone-700 leading-relaxed">
                    <NeverSeen>
                      Your source code · ever, in any form.
                    </NeverSeen>
                    <NeverSeen>
                      Diffs between your branches.
                    </NeverSeen>
                    <NeverSeen>
                      Your GitHub Personal Access Token (lives on the Bridge).
                    </NeverSeen>
                    <NeverSeen>
                      Your Claude Code session (also on the Bridge).
                    </NeverSeen>
                    <NeverSeen>
                      Full Engine stdout — only the last 200 lines and only when
                      a Job fails.
                    </NeverSeen>
                    <NeverSeen>
                      Anything in <span className="font-mono text-sm">.env</span>{" "}
                      files anywhere in your repo.
                    </NeverSeen>
                  </ul>
                  <p className="mt-7 text-base italic text-stone-500 leading-relaxed">
                    The blast radius of an Atlas breach is{" "}
                    <span className="not-italic font-semibold text-stone-900">
                      who can read your Tickets
                    </span>{" "}
                    — never &ldquo;who can read your code.&rdquo;
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
                      body="Most common cause: your laptop is asleep. Dispatched Jobs queue on Atlas&rsquo;s side until the Bridge heartbeats again. No data loss."
                    />
                    <FailureRow
                      kind="conflict"
                      title="The PR can't merge"
                      body="Engine&rsquo;s branch diverged from main while it ran. Atlas surfaces the failure with `Send back to Engine with conflict context` — a rebase-and-replay."
                    />
                    <FailureRow
                      kind="engine-timeout"
                      title="Engine timed out"
                      body="Job hit the configured timeout (default 30 min). Bridge kills the process, ships an `engine-timeout` Result back to Atlas. You can dispatch again with a tighter Brief."
                    />
                    <FailureRow
                      kind="atlas-down"
                      title="Atlas itself is down"
                      body="Your Bridge keeps the last dispatched Job state in `~/.atlas/queue.json`. On reconnect, it sends any pending Results. Tickets you filed during the outage land when the page comes back."
                    />
                  </ol>
                </section>

                {/* SECURITY */}
                <section id="security" className="mt-20">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Security model
                  </h2>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    The trust boundary is the Bridge. Atlas can ask your Bridge
                    to run an Engine, but it can&rsquo;t reach into your
                    filesystem. Three things keep the boundary sharp:
                  </p>
                  <ol className="mt-5 space-y-3 text-base text-stone-700 leading-relaxed list-none">
                    <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                      <span className="font-mono text-xs text-stone-400">01</span>
                      <span>
                        Bridge auth is{" "}
                        <span className="font-mono text-sm text-stone-700">
                          mTLS + bearer token
                        </span>
                        . Compromising Atlas alone doesn&rsquo;t let an attacker
                        dispatch to your Bridge.
                      </span>
                    </li>
                    <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                      <span className="font-mono text-xs text-stone-400">02</span>
                      <span>
                        Brief text is signed by the Owner&rsquo;s session. The
                        Bridge refuses unsigned dispatches.
                      </span>
                    </li>
                    <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                      <span className="font-mono text-xs text-stone-400">03</span>
                      <span>
                        Bridge config (Claude Code session, GitHub PAT) lives in{" "}
                        <span className="font-mono text-sm text-stone-700">
                          ~/.atlas/config.json
                        </span>{" "}
                        at file mode 0600. v1.4 will move it to OS keychain.
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
                      <span className="font-semibold text-stone-900">
                        Privacy over scale.
                      </span>{" "}
                      Atlas can&rsquo;t auto-scale Engine compute because the
                      Engine isn&rsquo;t in our cloud. If your laptop is offline,
                      Jobs queue. That&rsquo;s the cost of code never leaving
                      your machine.
                    </p>
                    <p>
                      <span className="font-semibold text-stone-900">
                        Owner bottleneck.
                      </span>{" "}
                      Every diff routes through one human. The same reason
                      Atlas feels safe is the reason it caps team throughput at
                      one person&rsquo;s reading speed.
                    </p>
                    <p>
                      <span className="font-semibold text-stone-900">
                        Bridge as a single point of failure.
                      </span>{" "}
                      One Owner-machine; if that machine dies, Jobs stall.
                      Cloud Bridge fallback (Pro feature, v1.4) will let you
                      lease compute when your laptop&rsquo;s out of commission.
                    </p>
                  </div>
                </section>

                {/* Closing */}
                <p className="mt-20 text-base italic text-stone-500 leading-relaxed">
                  This page is a snapshot of what Atlas does as of v1.3. The
                  architecture has been deliberately conservative — boring
                  primitives, well-understood failure modes. We&rsquo;d rather
                  the design surprise nobody.
                </p>
              </article>

              {/* RAIL */}
              <aside className="space-y-12">
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    On this page
                  </div>
                  <ol className="mt-5 space-y-2.5">
                    {TOC.map((item, i) => (
                      <li key={item.id}>
                        <a className="group flex items-baseline gap-3 text-sm cursor-pointer">
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
                      <span className="font-mono text-stone-700">yesterday</span>
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
                    <li className="group cursor-pointer">
                      <div className="text-sm text-stone-700 group-hover:text-stone-900">
                        Where the Engine runs
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-stone-400">
                        concepts · 2 min
                      </div>
                    </li>
                    <li className="group cursor-pointer">
                      <div className="text-sm text-stone-700 group-hover:text-stone-900">
                        Bridge auth &amp; tokens
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-stone-400">
                        concepts · 4 min
                      </div>
                    </li>
                    <li className="group cursor-pointer">
                      <div className="text-sm text-stone-700 group-hover:text-stone-900">
                        Conflict-recovery flow
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-stone-400">
                        troubleshooting · 3 min
                      </div>
                    </li>
                  </ul>
                </section>

                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    Source:{" "}
                    <a className="font-mono not-italic text-xs text-stone-700 hover:text-amber-600 cursor-pointer">
                      docs/concepts/architecture.md
                    </a>
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant PP · editorial architecture
        </div>
      </div>
    </>
  );
}

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
          <span className="text-lg font-semibold tracking-tight text-stone-900">
            {name}
          </span>
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
      <span className="font-mono text-xs uppercase tracking-widest text-stone-500">
        {label}
      </span>
      <span>{children}</span>
    </li>
  );
}

function NeverSeen({ children }: { children: React.ReactNode }) {
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
