// THROWAWAY — Editorial Onboarding Welcome prototype.
// Step 1 of the new-Owner arc (DD Sign-up → GG Welcome → Q Install → first Project).

const STEPS = [
  { key: "sign-in", label: "Sign in", done: true },
  { key: "welcome", label: "Welcome", here: true },
  { key: "bridge", label: "Install Bridge" },
  { key: "project", label: "Add a Project" },
  { key: "ready", label: "File your first Ticket" },
];

export function VariantGGWelcome() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          Atlas · Setup
        </div>
        <div className="absolute top-8 right-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          Step <span className="text-stone-900 font-medium">1</span>{" "}
          <span className="text-stone-400">of {STEPS.length}</span>
        </div>

        <main className="min-h-screen flex items-center justify-center px-8 py-24">
          <div className="w-full max-w-2xl">
            {/* Progress track */}
            <div>
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, i, arr) => (
                  <div key={s.key} className="flex items-center gap-1.5 flex-1">
                    <div className="relative">
                      {s.here && (
                        <span className="absolute inset-[-4px] rounded-full bg-amber-400/40 animate-ping" />
                      )}
                      <span
                        className={`relative h-1.5 w-1.5 rounded-full block ${
                          s.here ? "bg-amber-500" : s.done ? "bg-stone-900" : "bg-stone-300"
                        }`}
                      >
                        {s.here && (
                          <span className="absolute inset-[-3px] rounded-full border border-amber-500/50" />
                        )}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <span
                        className={`h-px flex-1 ${
                          s.done ? "bg-stone-900" : "bg-stone-300"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-widest text-stone-400">
                {STEPS.map((s) => (
                  <span
                    key={s.key}
                    className={
                      s.here
                        ? "text-amber-600 font-bold"
                        : s.done
                        ? "text-stone-700"
                        : ""
                    }
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Day-stamp / personal greeting */}
            <div className="mt-16 text-xs font-mono uppercase tracking-widest text-stone-500">
              Tuesday · May 13
            </div>

            {/* Hero */}
            <h1 className="mt-3 text-7xl font-bold tracking-tighter leading-none">
              Welcome, Onkesh.
            </h1>
            <p className="mt-7 text-2xl tracking-tight text-stone-700 leading-tight">
              In about ten minutes, Atlas will be running your code on your
              machine, with two Collaborators able to file requests in plain
              language.
            </p>

            {/* What we'll do */}
            <section className="mt-16">
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                What&rsquo;s ahead
              </div>
              <ol className="mt-7 space-y-7 text-base text-stone-700 leading-relaxed">
                <li className="grid grid-cols-[40px_1fr] gap-6 items-baseline">
                  <span className="font-mono text-xs text-stone-400">02</span>
                  <div>
                    <div className="text-lg font-semibold text-stone-900">
                      Install your Bridge.
                    </div>
                    <div className="mt-1">
                      A small daemon on your computer. Atlas dispatches Jobs to
                      it; your Engine runs locally.{" "}
                      <span className="font-mono text-sm text-stone-500">
                        ~3 min
                      </span>
                    </div>
                  </div>
                </li>
                <li className="grid grid-cols-[40px_1fr] gap-6 items-baseline">
                  <span className="font-mono text-xs text-stone-400">03</span>
                  <div>
                    <div className="text-lg font-semibold text-stone-900">
                      Add a Project.
                    </div>
                    <div className="mt-1">
                      Paste a GitHub URL, or start something new. The Engine reads
                      your codebase and writes a CONTEXT document.{" "}
                      <span className="font-mono text-sm text-stone-500">
                        ~3 min
                      </span>
                    </div>
                  </div>
                </li>
                <li className="grid grid-cols-[40px_1fr] gap-6 items-baseline">
                  <span className="font-mono text-xs text-stone-400">04</span>
                  <div>
                    <div className="text-lg font-semibold text-stone-900">
                      File your first Ticket.
                    </div>
                    <div className="mt-1">
                      Try it on yourself. You can invite Collaborators after.{" "}
                      <span className="font-mono text-sm text-stone-500">
                        ~2 min
                      </span>
                    </div>
                  </div>
                </li>
              </ol>
            </section>

            {/* Trust line */}
            <p className="mt-16 text-base italic text-stone-500 leading-relaxed">
              Atlas only ever holds Brief text, Result summaries, and heartbeats.
              Your code stays on your machine, behind your Bridge — always.
            </p>

            {/* Actions */}
            <div className="mt-12 flex items-center gap-5">
              <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-6 py-3.5 rounded-full shadow-sm inline-flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                Begin · install Bridge
                <span className="text-stone-400">→</span>
              </button>
              <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                or read the docs first ↗
              </a>
            </div>

            {/* Skip line */}
            <p className="mt-10 text-sm italic text-stone-500 leading-relaxed">
              In a hurry? You can{" "}
              <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                skip ahead to the dashboard
              </a>{" "}
              — Atlas will just nudge you to finish setup when you try to dispatch
              a Job.
            </p>
          </div>
        </main>

        <div className="absolute bottom-8 left-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant GG · editorial welcome
        </div>
        <div className="absolute bottom-8 right-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          <a className="hover:text-stone-700 cursor-pointer">need help?</a>
          <span className="mx-2 text-stone-300">·</span>
          <a className="hover:text-stone-700 cursor-pointer">sign out</a>
        </div>
      </div>
    </>
  );
}
