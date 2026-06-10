// THROWAWAY — Editorial Setup Wizard prototype.
// First-time Owner onboarding: install Bridge step.
// No sidebar (single-focus pre-app shell like sign-in).

const STEPS = [
  { key: "sign-in", label: "Sign in", done: true },
  { key: "bridge", label: "Install Bridge", here: true },
  { key: "project", label: "Add a Project" },
  { key: "ready", label: "File your first Ticket" },
];

const INSTALL_CMD =
  "curl -fsSL https://atlas.com/bridge/install.sh | sh -s -- --token=at_8f3a2b1c";

export function VariantQSetup() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        {/* Top-left mini wordmark */}
        <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          Atlas · Setup
        </div>

        {/* Top-right step counter */}
        <div className="absolute top-8 right-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          Step <span className="text-stone-900 font-medium">2</span>{" "}
          <span className="text-stone-400">of {STEPS.length}</span>
        </div>

        {/* Centered editorial setup */}
        <main className="min-h-screen flex items-center justify-center px-8 py-24">
          <div className="w-full max-w-2xl">
            {/* Progress track */}
            <div>
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, i, arr) => (
                  <div
                    key={s.key}
                    className="flex items-center gap-1.5 flex-1"
                  >
                    <div className="relative">
                      {s.here && (
                        <span className="absolute inset-[-4px] rounded-full bg-amber-400/40 animate-ping" />
                      )}
                      <span
                        className={`relative h-1.5 w-1.5 rounded-full block ${
                          s.here
                            ? "bg-amber-500"
                            : s.done
                            ? "bg-stone-900"
                            : "bg-stone-300"
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

            {/* Hero */}
            <h1 className="mt-16 text-5xl font-bold tracking-tighter leading-tight">
              Install your Bridge.
            </h1>
            <p className="mt-5 text-lg text-stone-700 leading-relaxed">
              The Bridge is a small daemon that runs on your computer. Atlas dispatches
              Jobs to it; your Engine runs them locally. Your code never leaves your
              machine.
            </p>

            {/* Install command — mono block, the one chrome'd moment */}
            <div className="mt-12">
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Run this on the machine where you write code
              </div>
              <div className="mt-5 group relative rounded-lg border border-stone-300 bg-stone-50 p-5 font-mono text-sm text-stone-800 break-all">
                {INSTALL_CMD}
                <button className="absolute top-3 right-3 font-mono text-[10px] uppercase tracking-widest text-stone-500 bg-white border border-stone-200 hover:border-stone-300 hover:text-stone-900 px-2 py-1 rounded-md transition opacity-0 group-hover:opacity-100">
                  copy ↗
                </button>
              </div>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                token expires in <span className="text-stone-700">9 min 42 sec</span>
              </div>
            </div>

            {/* Waiting state — live pulse */}
            <div className="mt-12 flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-stone-700">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-60" />
                <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              </span>
              <span>Waiting for first heartbeat</span>
              <span className="italic normal-case tracking-normal font-sans text-sm text-stone-500">
                we&rsquo;ll detect it automatically
              </span>
            </div>

            {/* What this does — editorial reading list */}
            <section className="mt-16">
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                What this does
              </div>
              <ol className="mt-5 space-y-4 text-base text-stone-700 leading-relaxed">
                <li className="grid grid-cols-[24px_1fr] gap-4 items-baseline">
                  <span className="font-mono text-xs text-stone-400">01</span>
                  <div>
                    Downloads the{" "}
                    <span className="font-mono text-sm text-stone-600">atlas-bridge</span>{" "}
                    binary (~12 mb) into{" "}
                    <span className="font-mono text-sm text-stone-600">~/.atlas/</span>.
                  </div>
                </li>
                <li className="grid grid-cols-[24px_1fr] gap-4 items-baseline">
                  <span className="font-mono text-xs text-stone-400">02</span>
                  <div>
                    Prompts you to authorize with your Claude Code account, the same
                    one your Engine will use.
                  </div>
                </li>
                <li className="grid grid-cols-[24px_1fr] gap-4 items-baseline">
                  <span className="font-mono text-xs text-stone-400">03</span>
                  <div>
                    Registers this Bridge with Atlas using the token above.
                  </div>
                </li>
                <li className="grid grid-cols-[24px_1fr] gap-4 items-baseline">
                  <span className="font-mono text-xs text-stone-400">04</span>
                  <div>
                    Sends a heartbeat — Atlas detects it and this page advances on
                    its own.
                  </div>
                </li>
              </ol>
            </section>

            {/* Trust line */}
            <p className="mt-12 text-base italic text-stone-500 leading-relaxed">
              The Bridge runs entirely on your machine. Atlas only ever sees
              heartbeats, Brief text, and Result summaries — never your code or your
              keys.
            </p>

            {/* Footer navigation */}
            <div className="mt-16 flex items-center justify-between">
              <a className="group flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-stone-900 cursor-pointer">
                <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded font-mono text-[10px] uppercase bg-stone-100 text-stone-700 border border-stone-200">
                  ←
                </kbd>
                <span>Back to sign in</span>
              </a>
              <a className="font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-stone-900 cursor-pointer">
                I&rsquo;ll do this later ↗
              </a>
            </div>
          </div>
        </main>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant Q · editorial setup wizard
        </div>
        <div className="absolute bottom-8 right-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          <a className="hover:text-stone-700 cursor-pointer">need help?</a>
          <span className="mx-2 text-stone-300">·</span>
          <a className="hover:text-stone-700 cursor-pointer">docs</a>
        </div>
      </div>
    </>
  );
}
