// M5 — Welcome (post-signup Owner landing). Ported from
// design/variants/variant-gg-welcome.tsx:16–179 (fidelity protocol §5;
// canon §4-M5 row: no sidebar, centered max-w-2xl narrative, text-7xl
// hero, track-style progress per §2.8). Guarded — Owners only.
// Copy deltas from the variant (CONTEXT.md law): "Jobs" → "Runs",
// "dashboard" → "Today". Design-lab colophon not ported (§4 note).
import Link from "next/link";

import {
  NumberedSteps,
  PillButton,
  StateMachineTrack,
  type TrackStep,
} from "@/src/components/kit";
import { signOutAction } from "@/src/domain/auth/actions";
import { requireOwner } from "@/src/domain/auth/guard";
import { dayStamp } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await requireOwner();
  const firstName = (user.membership?.displayName ?? user.name).split(" ")[0];
  const signedInAt = user.membership ? dayStamp(user.membership.createdAt) : null;

  // GG:4–10 — the new-Owner arc. Welcome is step 1 of 5; Bridge steps stay
  // honestly pending until M9 ships the Bridge (charter: no fake greens).
  const steps: TrackStep[] = [
    { key: "sign-in", label: "Sign in", status: "done", at: signedInAt },
    { key: "welcome", label: "Welcome", status: "current", at: "now" },
    { key: "bridge", label: "Install Bridge", status: "pending" },
    { key: "project", label: "Add a Project", status: "pending" },
    { key: "ready", label: "File your first Ticket", status: "pending" },
  ];

  return (
    <div className="relative flex-1 text-stone-900 font-sans">
      {/* Top chrome (GG:17–23) */}
      <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
        Atlas · Setup
      </div>
      <div className="absolute top-8 right-8 font-mono text-xs uppercase tracking-widest text-stone-500">
        Step <span className="text-stone-900 font-medium">1</span>{" "}
        <span className="text-stone-400">of {steps.length}</span>
      </div>

      <main className="min-h-screen flex items-center justify-center px-8 py-24">
        <div className="w-full max-w-2xl">
          {/* Progress track (GG:28–72 → kit §2.8; kit adds canon tooltips,
              axis current label drops GG:63's font-bold per §2.8) */}
          <StateMachineTrack steps={steps} tone="amber" />

          {/* Day-stamp / personal greeting (GG:75) */}
          <div className="mt-16 text-xs font-mono uppercase tracking-widest text-stone-500">
            {dayStamp()}
          </div>

          {/* Hero (GG:80) */}
          <h1 className="mt-3 text-7xl font-bold tracking-tighter leading-none">
            Welcome, {firstName}.
          </h1>
          <p className="mt-7 text-2xl tracking-tight text-stone-700 leading-tight">
            In about ten minutes, Atlas will be running your code on your machine, with your
            trusted circle able to file requests in plain language.
          </p>

          {/* What we'll do (GG:90; §2.16 NumberedSteps — kit body text-sm
              stone-600 overrules GG:101's inherited text-base) */}
          <section className="mt-16">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              What&rsquo;s ahead
            </div>
            <div className="mt-7">
              <NumberedSteps
                start={2}
                steps={[
                  {
                    title: "Install your Bridge.",
                    body: (
                      <>
                        A small daemon on your computer. Atlas dispatches Runs to it; your
                        Engine runs locally.{" "}
                        <span className="font-mono text-stone-500">~3 min</span>
                      </>
                    ),
                  },
                  {
                    title: "Add a Project.",
                    body: (
                      <>
                        Paste a GitHub URL, or start something new. The Engine reads your
                        codebase and writes a CONTEXT document.{" "}
                        <span className="font-mono text-stone-500">~3 min</span>
                      </>
                    ),
                  },
                  {
                    title: "File your first Ticket.",
                    body: (
                      <>
                        Try it on yourself. You can invite Collaborators after.{" "}
                        <span className="font-mono text-stone-500">~2 min</span>
                      </>
                    ),
                  },
                ]}
              />
            </div>
          </section>

          {/* Trust line (GG:143) */}
          <p className="mt-16 text-base italic text-stone-500 leading-relaxed">
            Atlas only ever holds Brief text, Result summaries, and heartbeats. Your code
            stays on your machine, behind your Bridge — always.
          </p>

          {/* Actions (GG:149; canon §2.9 overrules GG:150–154's dotted
              inline pill — inline pills carry no dot; kit page size) */}
          <div className="mt-12 flex items-center gap-5">
            <form action="/setup">
              <PillButton kind="primary" size="page" arrow type="submit">
                Begin · install Bridge
              </PillButton>
            </form>
            {/* M14: /docs became a real internal page — <a>→<Link> (lint
                no-html-link-for-pages) and ↗→→ per §3.6 (↗ = leaves Atlas) */}
            <Link
              href="/docs"
              className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
            >
              or read the docs first →
            </Link>
          </div>

          {/* Skip line (GG:161; "dashboard"/"Job" → Today/Run per CONTEXT.md) */}
          <p className="mt-10 text-sm italic text-stone-500 leading-relaxed">
            In a hurry? You can{" "}
            <Link href="/" className="text-stone-700 hover:text-amber-600 cursor-pointer">
              skip ahead to Today
            </Link>{" "}
            — Atlas will just nudge you to finish setup when you try to dispatch a Run.
          </p>
        </div>
      </main>

      {/* Corner meta (GG:175) — sign out is a REAL action */}
      <div className="absolute bottom-8 right-8 flex items-baseline font-mono text-[10px] uppercase tracking-widest text-stone-400">
        {/* M14: <a>→<Link> — /docs is a real page now (lint) */}
        <Link href="/docs" className="hover:text-stone-700 cursor-pointer">
          need help?
        </Link>
        <span className="mx-2 text-stone-300">·</span>
        <form action={signOutAction}>
          <button
            type="submit"
            className="font-mono text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-700 cursor-pointer"
          >
            sign out
          </button>
        </form>
      </div>
    </div>
  );
}
