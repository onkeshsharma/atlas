// THROWAWAY — Editorial Engine Run prototype.
// The mid-Job live view: streaming Engine stdout + quality-gate progress.
// Watch-it-think experience. Distinct from K (Job summary, post-mortem).

import { NAV } from "./mock-data";

const STREAM = [
  { t: "09:42:01", kind: "info" as const, line: "Engine spawned · pid 8472" },
  { t: "09:42:01", kind: "info" as const, line: "→ checkout main, branch atlas/auto/fix-timezone-leak" },
  { t: "09:42:03", kind: "claude" as const, line: 'I\'ll read CONTEXT.md and the brief before touching code.' },
  { t: "09:42:04", kind: "tool" as const, line: "Read CONTEXT.md" },
  { t: "09:42:04", kind: "tool" as const, line: "Read intake/atlas-v1.3/PRD.md" },
  { t: "09:42:07", kind: "claude" as const, line: "The bug is in lib/time/zoneFromHeader.ts — a 1-line fallback miss." },
  { t: "09:42:09", kind: "tool" as const, line: "Grep zoneFromHeader.ts → 1 match" },
  { t: "09:42:10", kind: "tool" as const, line: "Edit lib/time/zoneFromHeader.ts (lines 14–17)" },
  { t: "09:42:11", kind: "claude" as const, line: "Adding a focused test before the green run." },
  { t: "09:42:12", kind: "tool" as const, line: "Write lib/time/zoneFromHeader.test.ts" },
  { t: "09:42:14", kind: "info" as const, line: "Running quality gates…" },
  { t: "09:42:14", kind: "tool" as const, line: "pnpm typecheck" },
  { t: "09:42:23", kind: "ok" as const, line: "✓ pnpm typecheck — 0 errors" },
  { t: "09:42:23", kind: "tool" as const, line: "pnpm lint" },
  { t: "09:42:28", kind: "ok" as const, line: "✓ pnpm lint — clean" },
  { t: "09:42:28", kind: "tool" as const, line: "pnpm test --filter @atlas/time" },
  { t: "09:42:34", kind: "ok" as const, line: "✓ pnpm test — 12 passed, 1 added" },
  { t: "09:42:34", kind: "tool" as const, line: "pnpm build" },
  { t: "09:42:38", kind: "active" as const, line: "› compiling .next/server… 18% (62/342 modules)" },
];

const GATES = [
  { name: "Read brief", state: "done" as const },
  { name: "Diff code", state: "done" as const },
  { name: "Typecheck", state: "done" as const },
  { name: "Lint", state: "done" as const },
  { name: "Tests", state: "done" as const },
  { name: "Build", state: "active" as const },
  { name: "Open PR", state: "pending" as const },
];

function streamColor(kind: (typeof STREAM)[number]["kind"]): string {
  switch (kind) {
    case "info":
      return "text-stone-500";
    case "claude":
      return "text-amber-700";
    case "tool":
      return "text-stone-700";
    case "ok":
      return "text-emerald-700";
    case "active":
      return "text-stone-900 font-medium";
  }
}

function streamPrefix(kind: (typeof STREAM)[number]["kind"]): string {
  switch (kind) {
    case "info":
      return "·";
    case "claude":
      return "◆";
    case "tool":
      return "›";
    case "ok":
      return "✓";
    case "active":
      return "▶";
  }
}

function gateDot(state: "done" | "active" | "pending"): string {
  if (state === "done") return "bg-emerald-500";
  if (state === "active") return "bg-amber-500";
  return "bg-stone-300";
}

export function VariantRREngineRun() {
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
                Projects · atlas-internal · Jobs · #142 · running
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-amber-700">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-60" />
                  <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                </span>
                live · streaming
              </div>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_320px] gap-16">
              <div className="max-w-[680px]">
                {/* Hero */}
                <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
                  Engine
                </div>
                <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
                  <span className="relative">
                    Working
                    <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-amber-500" />
                  </span>{" "}
                  on it.
                </h1>
                <p className="mt-5 text-xl text-stone-700 leading-relaxed">
                  Fix the timezone fallback in <span className="font-mono text-base">lib/time/zoneFromHeader.ts</span> — your Brief, 37 seconds old.
                </p>

                {/* Status sentence */}
                <div className="mt-6 flex items-center gap-3 font-mono text-xs text-stone-500">
                  <span>started 37s ago</span>
                  <span className="text-stone-300">·</span>
                  <span>Bridge on this machine</span>
                  <span className="text-stone-300">·</span>
                  <span>claude-3-5-sonnet</span>
                  <span className="text-stone-300">·</span>
                  <span className="text-amber-700">est. 1m left</span>
                </div>

                {/* GATES */}
                <section className="mt-12">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Quality gates
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      5 of 7 passed
                    </span>
                  </div>
                  <ol className="mt-5 grid grid-cols-7 gap-2">
                    {GATES.map((g, i) => (
                      <li key={g.name} className="flex flex-col items-start gap-2">
                        <div className="flex items-center gap-2 w-full">
                          <span
                            className={`relative inline-block h-1.5 w-1.5 rounded-full shrink-0 ${gateDot(
                              g.state,
                            )}`}
                          >
                            {g.state === "active" && (
                              <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-60" />
                            )}
                          </span>
                          <div className="flex-1 h-px bg-stone-200 relative">
                            <div
                              className={
                                g.state === "done"
                                  ? "absolute inset-0 bg-emerald-500"
                                  : g.state === "active"
                                  ? "absolute inset-y-0 left-0 w-1/3 bg-amber-500"
                                  : ""
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
                            {String(i + 1).padStart(2, "0")}
                          </div>
                          <div className="text-xs text-stone-900 font-medium leading-tight">
                            {g.name}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                {/* STREAM */}
                <section className="mt-12">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Engine stream
                    </h2>
                    <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      <span>tail</span>
                      <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                        copy ↗
                      </a>
                      <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                        download .log ↗
                      </a>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl bg-white/80 border border-stone-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-stone-200/80 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-500 bg-stone-50/60">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      <span>~/work/atlas-internal · claude --resume job-142</span>
                      <span className="ml-auto text-stone-400">{STREAM.length} lines</span>
                    </div>
                    <ol className="px-5 py-4 font-mono text-[12px] leading-[1.7] divide-y divide-stone-100">
                      {STREAM.map((line, i) => (
                        <li
                          key={i}
                          className="py-1.5 grid grid-cols-[55px_18px_1fr] gap-3 items-baseline"
                        >
                          <span className="text-stone-400">{line.t}</span>
                          <span className={`${streamColor(line.kind)} shrink-0`}>
                            {streamPrefix(line.kind)}
                          </span>
                          <span className={streamColor(line.kind)}>
                            {line.line}
                          </span>
                        </li>
                      ))}
                      <li className="py-1.5 grid grid-cols-[55px_18px_1fr] gap-3 items-baseline">
                        <span className="text-stone-400">09:42:38</span>
                        <span className="text-stone-900">▍</span>
                        <span className="text-stone-400 italic">cursor</span>
                      </li>
                    </ol>
                  </div>
                  <p className="mt-4 text-xs italic text-stone-500 leading-relaxed">
                    The full transcript stays on your machine; only the last 200
                    lines reach Atlas if this Job fails.
                  </p>
                </section>

                {/* BRIEF preview (collapsed) */}
                <section className="mt-12">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      The Brief
                    </h2>
                    <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                      expand ↗
                    </a>
                  </div>
                  <div className="mt-5 rounded-2xl bg-white/70 border border-stone-200 p-6">
                    <p className="text-base text-stone-800 leading-relaxed">
                      Fix the timezone fallback in{" "}
                      <span className="font-mono text-sm">
                        lib/time/zoneFromHeader.ts
                      </span>{" "}
                      so that a missing{" "}
                      <span className="font-mono text-sm">x-tz</span> header
                      doesn&rsquo;t crash the request. Default to{" "}
                      <span className="font-mono text-sm">UTC</span>. Add a focused
                      test in the same package.
                    </p>
                    <div className="mt-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      <span>drafted from</span>
                      <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                        Ticket #142 — &ldquo;Timezone crash on signup&rdquo; →
                      </a>
                    </div>
                  </div>
                </section>

                <p className="mt-16 text-base italic text-stone-500 leading-relaxed">
                  No diff yet — Atlas will only show the diff once the PR opens.
                  You can{" "}
                  <a className="not-italic font-mono text-xs text-stone-700 hover:text-amber-600 cursor-pointer">
                    cancel the run →
                  </a>{" "}
                  any time before the PR is created.
                </p>
              </div>

              {/* RAIL */}
              <aside className="space-y-12">
                {/* Big timer */}
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-6 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                    Elapsed
                  </div>
                  <div className="mt-3 font-mono text-5xl font-bold tracking-tighter text-stone-900 leading-none">
                    00:37
                  </div>
                  <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-amber-700">
                    ▶ running
                  </div>
                  <p className="mt-4 text-xs text-stone-500 leading-relaxed">
                    Atlas Jobs typically ship in 1–4 minutes. Anything over 30
                    minutes hits the timeout.
                  </p>
                </section>

                {/* Job meta */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Job
                  </div>
                  <dl className="mt-5 space-y-3 text-sm">
                    <Meta label="Job" value="#142" />
                    <Meta label="Ticket" value="#142 →" />
                    <Meta label="Project" value="atlas-internal" />
                    <Meta label="Bridge" value="this-machine" />
                    <Meta label="Engine" value="claude-3-5-sonnet" />
                    <Meta label="Branch" value="atlas/auto/fix-timezone" />
                    <Meta label="Dispatched by" value="Onkesh" />
                  </dl>
                </section>

                {/* Controls */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Controls
                  </div>
                  <div className="mt-5 space-y-2.5">
                    <a className="block rounded-xl border border-stone-200 bg-white/60 px-4 py-3 font-mono text-xs uppercase tracking-widest text-stone-700 hover:border-stone-300 cursor-pointer">
                      Pin to top of feed →
                    </a>
                    <a className="block rounded-xl border border-stone-200 bg-white/60 px-4 py-3 font-mono text-xs uppercase tracking-widest text-stone-700 hover:border-stone-300 cursor-pointer">
                      Mute notifications →
                    </a>
                    <a className="block rounded-xl border border-rose-200 bg-rose-50/40 px-4 py-3 font-mono text-xs uppercase tracking-widest text-rose-700 hover:bg-rose-50/70 cursor-pointer">
                      Cancel run →
                    </a>
                  </div>
                </section>

                {/* Next-up */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Queue after this
                  </div>
                  <ul className="mt-4 divide-y divide-stone-200/60">
                    <li className="py-3">
                      <div className="text-sm text-stone-900">
                        Refactor brief drafter
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                        Ticket #138 · queued 2m ago
                      </div>
                    </li>
                    <li className="py-3">
                      <div className="text-sm text-stone-900">
                        Add OG image for landing
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                        Ticket #141 · queued just now
                      </div>
                    </li>
                  </ul>
                </section>

                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    When the PR opens, the Engine&rsquo;s stream stops here and
                    the page swaps to the Job summary (variant K).
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant RR · editorial engine run
        </div>
      </div>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-stone-500">{label}</span>
      <span className="font-mono text-stone-700">{value}</span>
    </div>
  );
}
