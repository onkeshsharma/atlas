/**
 * M14 — "The Bridge & the Engine." — the local-execution story, written
 * from intake ADR-0001 (cloud Atlas + local orchestrator) and repo
 * ADR-0002 (token auth, sync-then-subscribe, what rides up) as built in M9.
 */
import { DocSection, Term } from "./article-kit";
import type { DocArticle } from "./types";

export const theBridgeAndTheEngine: DocArticle = {
  slug: "the-bridge-and-the-engine",
  title: "The Bridge & the Engine.",
  indexTitle: "The Bridge & the Engine",
  section: "Concepts",
  sub: "The daemon on your machine, and what it spawns",
  lede: "Atlas is cloud-hosted; your code is not. The Bridge is the daemon that makes both true at once — it runs on the Owner's machine and is the only thing that ever touches the repo.",
  readMin: 4,
  audience: "Owners",
  updated: "June 12, 2026",
  toc: [
    { id: "the-bridge", label: "The Bridge" },
    { id: "worktree-per-run", label: "A worktree per Run" },
    { id: "the-engine", label: "The Engine" },
    { id: "offline", label: "When your machine is off" },
    { id: "what-stays-local", label: "What stays local" },
  ],
  related: ["architecture", "needs-input-and-steering"],
  provenance: "ADR-0001 (intake) + ADR-0002 — the architecture decision records",
  body: (
    <>
      <DocSection id="the-bridge" label="The Bridge">
        <p>
          The <Term>Bridge</Term> is a small daemon you pair once with your
          instance. Pairing mints a bearer token that is printed exactly once
          — Atlas stores only its hash. From then on the Bridge dials out to
          Atlas (never the other way around; there is no listener on your
          machine), claims dispatched Runs, and reports back.
        </p>
        <p>
          It is the local <em>orchestrator</em>, not a one-job runner: it
          executes several Engine sessions at once under a concurrency cap
          you set, and your dispatched Runs always outrank background Helper
          Runs in its queue.
        </p>
      </DocSection>

      <DocSection id="worktree-per-run" label="A worktree per Run">
        <p>
          Every Run executes in its own Bridge-managed git worktree, on its
          own branch. Two Runs on the same project can&rsquo;t collide in a
          working copy — parallelism is structurally safe until merge time,
          where Ship Groups take over. The Bridge owns the worktree
          lifecycle: created at claim, pruned after a clean landing, kept for
          inspection when a failure is worth your eyes.
        </p>
      </DocSection>

      <DocSection id="the-engine" label="The Engine">
        <p>
          The <Term>Engine</Term> is Claude Code, spawned by the Bridge,
          authorized through the Owner&rsquo;s own account. It reads the
          Brief, works in the Run&rsquo;s worktree, and streams its output
          line by line up to the cockpit. It never runs in Atlas&rsquo;s
          cloud — that is a permanent architectural stance, not a current
          limitation.
        </p>
      </DocSection>

      <DocSection id="offline" label="When your machine is off">
        <p>
          Dispatching never depends on the Bridge being awake. A Run
          dispatched while your laptop sleeps is simply a queued row; when
          the Bridge reconnects it syncs the queue as it exists <em>now</em>,
          then subscribes for new commands. Work you filed from your phone at
          midnight starts the moment the machine wakes.
        </p>
        <p>
          The honest edge case is handled honestly too: if the daemon
          restarts and finds Runs it was supposed to be executing, it fails
          them with a named reason instead of pretending.
        </p>
      </DocSection>

      <DocSection id="what-stays-local" label="What stays local">
        <p>
          On your machine, always: the repo and its history, your git and
          GitHub credentials (the Bridge uses your ambient{" "}
          <span className="font-mono text-sm">git</span>/
          <span className="font-mono text-sm">gh</span> auth and never
          uploads it), your Claude Code session, and the worktrees
          themselves.
        </p>
        <p>
          What rides up to Atlas: run state, streamed stdout, and the diff of
          each Run&rsquo;s changes — exactly enough to review and steer from
          any browser, never the codebase.
        </p>
      </DocSection>
    </>
  ),
};
