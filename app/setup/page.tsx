// M5 — Setup wizard (install Bridge step). Ported from
// design/variants/variant-q-setup.tsx:19–194 (fidelity protocol §5; canon
// §4-M5 row; §2.8 track + §2.16 narrow checklist). Guarded — Owners only.
//
// HONESTY RULE (charter): the Bridge ships with M9 — the heartbeat wait
// renders as genuinely waiting (it is), nothing fakes green, and the
// install token is a display preview labelled as such (deviation noted
// in HANDOFF-M5). Copy deltas: "Jobs" → "Runs" (CONTEXT.md).
import { headers } from "next/headers";
import Link from "next/link";

import {
  Kbd,
  LivePulse,
  NumberedSteps,
  StateMachineTrack,
  type TrackStep,
} from "@/src/components/kit";
import { requireOwner } from "@/src/domain/auth/guard";
import { dayStamp } from "@/src/lib/format";

import { InstallOneLiner } from "@/app/(app)/settings/bridges/install-one-liner";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const user = await requireOwner();
  const signedInAt = user.membership ? dayStamp(user.membership.createdAt) : null;

  // Q:5–10 — four-step arc on this surface (GG's five-step arc includes
  // Welcome; the variants disagree and each surface keeps its own — noted
  // in HANDOFF-M5 as a canon-ledger candidate).
  const steps: TrackStep[] = [
    { key: "sign-in", label: "Sign in", status: "done", at: signedInAt },
    { key: "bridge", label: "Install Bridge", status: "current", at: "now" },
    { key: "project", label: "Add a Project", status: "pending" },
    { key: "ready", label: "File your first Ticket", status: "pending" },
  ];

  // The real install one-liner is served by THIS instance (BPI: /install.ps1
  // + /install.sh interpolate the origin). No token in the command — the
  // install script runs `atlas-bridge pair`, which gets the token via the
  // browser approve (ADR-0004 §4). Origin from the request (ATLAS_APP_URL
  // in prod; the forwarded host otherwise).
  const h = await headers();
  const origin =
    process.env.ATLAS_APP_URL ??
    `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "localhost:3000"}`;

  return (
    <div className="relative flex-1 text-stone-900 font-sans">
      {/* Top-left mini wordmark (Q:21) */}
      <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
        Atlas · Setup
      </div>

      {/* Top-right step counter (Q:26) */}
      <div className="absolute top-8 right-8 font-mono text-xs uppercase tracking-widest text-stone-500">
        Step <span className="text-stone-900 font-medium">2</span>{" "}
        <span className="text-stone-400">of {steps.length}</span>
      </div>

      {/* Centered editorial setup (Q:32) */}
      <main className="min-h-screen flex items-center justify-center px-8 py-24">
        <div className="w-full max-w-2xl">
          {/* Progress track (Q:34–86 → kit §2.8) */}
          <StateMachineTrack steps={steps} tone="amber" />

          {/* Hero (Q:89) */}
          <h1 className="mt-16 text-5xl font-bold tracking-tighter leading-tight">
            Install your Bridge.
          </h1>
          <p className="mt-5 text-lg text-stone-700 leading-relaxed">
            The Bridge is a small daemon that runs on your computer. Atlas dispatches Runs
            to it; your Engine runs them locally. Your code never leaves your machine.
          </p>

          {/* Install command — the real, instance-served one-liner (BPI).
              OS-aware; no token (the script pairs via the browser). */}
          <div className="mt-12">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Run this on the machine where you write code
            </div>
            <InstallOneLiner atlasUrl={origin} />
            {/* honest note — the binary isn't code-signed yet, so the OS will
                warn on first run; say so before they hit it. */}
            <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
              not yet code-signed ·{" "}
              <span className="text-stone-700">your OS will warn — choose “run anyway”</span>
            </div>
          </div>

          {/* Waiting state — live pulse (Q:115–124 → kit §2.7) */}
          <div className="mt-12 flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-stone-700">
            <LivePulse color="amber" />
            <span>Waiting for first heartbeat</span>
            <span className="italic normal-case tracking-normal font-sans text-sm text-stone-500">
              we&rsquo;ll detect it automatically
            </span>
          </div>

          {/* What this does (Q:127–162 → kit §2.16 narrow, body-only rows) */}
          <section className="mt-16">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              What this does
            </div>
            <div className="mt-5">
              <NumberedSteps
                narrow
                steps={[
                  {
                    body: (
                      <>
                        Downloads the{" "}
                        <span className="font-mono text-sm text-stone-600">atlas-bridge</span>{" "}
                        binary (~12 mb) into{" "}
                        <span className="font-mono text-sm text-stone-600">~/.atlas/</span>.
                      </>
                    ),
                  },
                  {
                    body: (
                      <>
                        Registers it to start on login, then opens your browser to{" "}
                        <span className="font-mono text-sm text-stone-600">approve</span>{" "}
                        the pairing — no token to copy.
                      </>
                    ),
                  },
                  { body: <>Connects with the token from that approval and registers this Bridge.</> },
                  {
                    body: (
                      <>
                        Sends a heartbeat — Atlas detects it and this page advances on its
                        own.
                      </>
                    ),
                  },
                ]}
              />
            </div>
          </section>

          {/* Trust line (Q:165) */}
          <p className="mt-12 text-base italic text-stone-500 leading-relaxed">
            The Bridge runs entirely on your machine. Atlas only ever sees heartbeats, Brief
            text, and Result summaries — never your code or your keys.
          </p>

          {/* Footer navigation (Q:172–182; back targets /welcome — this arc's
              real previous step; Q:180's `↗` becomes `→` per §3.6, Today is
              not "leaving Atlas") */}
          <div className="mt-16 flex items-center justify-between">
            <a
              href="/welcome"
              className="group flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-stone-900 cursor-pointer"
            >
              <Kbd>←</Kbd>
              <span>Back to welcome</span>
            </a>
            <Link
              href="/"
              className="font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-stone-900 cursor-pointer"
            >
              I&rsquo;ll do this later →
            </Link>
          </div>
        </div>
      </main>

      {/* Right-bottom quiet meta (Q:190) */}
      <div className="absolute bottom-8 right-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
        <a className="hover:text-stone-700 cursor-pointer">need help?</a>
        <span className="mx-2 text-stone-300">·</span>
        <a className="hover:text-stone-700 cursor-pointer">docs</a>
      </div>
    </div>
  );
}
