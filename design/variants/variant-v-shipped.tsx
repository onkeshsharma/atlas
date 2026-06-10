// THROWAWAY — Editorial Job Detail · Shipped success prototype.
// Success counterpart to K (failed conflict). Same shell, emerald not rose.

import { NAV } from "./mock-data";

const JOB = {
  id: "j-502",
  ticketId: "T-249",
  ticketTitle: "Add JSON export endpoint",
  reporter: "carmen@acme.io",
  state: "shipped" as const,
  startedAt: "1 hour ago",
  shippedAt: "8 minutes ago",
  duration: "5m 47s",
  bridge: "macbook-pro-2024",
  prUrl: "github.com/acme/website/pull/892",
  prNumber: 892,
  previewUrl: "acme-deploy-892.vercel.app",
  prodUrl: "acme.com",
};

const STDOUT_TAIL = [
  "[14:18:42] running pnpm typecheck — passed",
  "[14:18:51] running pnpm lint — passed",
  "[14:19:02] running pnpm test — 142 passing, 0 failing",
  "[14:19:09] running pnpm build — passed",
  "[14:19:13] git commit · git push · opening PR #892",
  "[14:19:18] ✓ PR merged · main updated",
  "[14:19:18]   files changed: src/lib/ticket-export.ts, app/api/tickets/export/route.ts",
];

export function VariantVShipped() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          {/* SIDEBAR — P active */}
          <aside className="w-[56px] shrink-0 sticky top-0 h-screen self-start flex flex-col items-center justify-between py-8 border-r border-stone-200/60 z-10">
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none">a</div>
            </div>
            <nav className="flex flex-col items-center gap-5">
              {NAV.map((n) => {
                const initial = n.short.charAt(0);
                const isActive = n.key === "projects";
                return (
                  <a
                    key={n.key}
                    className={`relative h-7 w-7 flex items-center justify-center cursor-pointer transition group ${
                      isActive ? "text-stone-900" : "text-stone-400 hover:text-stone-900"
                    }`}
                  >
                    <span className={`text-base ${isActive ? "font-semibold" : "font-medium"}`}>
                      {initial}
                    </span>
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-3 bg-amber-500" />
                    )}
                    {n.badge !== undefined && (
                      <span className="absolute -top-1 -right-1 font-mono text-[9px] leading-none text-stone-600 bg-amber-50 px-0.5">
                        {n.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
            <div className="relative group">
              <div className="relative h-6 w-6 flex items-center justify-center cursor-pointer">
                <div className="text-xl font-bold tracking-tighter leading-none text-stone-900 group-hover:text-amber-600 transition">
                  o
                </div>
                <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </aside>

          {/* MAIN */}
          <main className="flex-1 px-16 pt-8 pb-24">
            {/* Top */}
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Projects · acme-website · {JOB.ticketId} · Job {JOB.id}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-700 flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                  <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                shipped {JOB.shippedAt}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
              {/* MAIN COL */}
              <div className="max-w-2xl">
                {/* Hero */}
                <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
                  <span className="text-emerald-700 font-medium">shipped</span>
                  <span className="mx-2 text-stone-300">·</span>
                  <span>PR #{JOB.prNumber} merged into main</span>
                  <span className="mx-2 text-stone-300">·</span>
                  <span>filed by {JOB.reporter}</span>
                </div>
                <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
                  Atlas shipped {JOB.ticketId}.
                </h1>
                <p className="mt-4 text-lg text-stone-700 leading-relaxed">
                  The Engine added a JSON export endpoint to the ticket API. All
                  quality gates passed; the PR merged cleanly into main in{" "}
                  <span className="font-mono text-stone-900">{JOB.duration}</span>.
                </p>

                {/* WHAT HAPPENED — featured shipped card */}
                <section className="mt-12 rounded-2xl bg-white/70 border border-stone-200/80 p-6">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                      live
                    </span>
                    <span className="font-mono text-xs uppercase tracking-widest text-stone-500">
                      what&rsquo;s deployed
                    </span>
                  </div>
                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-stone-700">Production</span>
                      <a className="font-mono text-stone-700 hover:text-amber-600 cursor-pointer truncate">
                        {JOB.prodUrl} ↗
                      </a>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-stone-700">Preview deploy</span>
                      <a className="font-mono text-stone-700 hover:text-amber-600 cursor-pointer truncate">
                        {JOB.previewUrl} ↗
                      </a>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-stone-700">Pull Request</span>
                      <a className="font-mono text-stone-700 hover:text-amber-600 cursor-pointer truncate">
                        #{JOB.prNumber} ↗
                      </a>
                    </div>
                  </div>
                </section>

                {/* HOW TO VERIFY */}
                <section className="mt-16">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    How to verify
                  </div>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    The Engine wrote this for{" "}
                    <span className="font-semibold text-stone-900">
                      carmen
                    </span>{" "}
                    (the reporter). She&rsquo;ll get this in her email along with the
                    preview URL:
                  </p>
                  <div className="relative mt-7 pl-6">
                    <span className="absolute -left-1 -top-2 font-bold text-4xl text-emerald-400/80 leading-none select-none">
                      &ldquo;
                    </span>
                    <p className="text-base italic text-stone-800 leading-relaxed">
                      To check this works: open the ticket list at{" "}
                      <span className="font-mono text-sm not-italic text-stone-700">
                        /projects/acme/tickets
                      </span>
                      , click <span className="not-italic">Export ▾</span>, and pick{" "}
                      <span className="not-italic">JSON</span>. You should get a
                      file with every visible ticket, including its state and
                      reporter. Archived tickets are excluded by default — toggle
                      &ldquo;include archived&rdquo; to see them too.
                    </p>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                      Collaborator summary
                    </div>
                  </div>
                </section>

                {/* WHAT ENGINE DID */}
                <section className="mt-16">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    What Engine did
                  </div>
                  <ol className="mt-5 divide-y divide-stone-200">
                    <li className="py-4 grid grid-cols-[40px_1fr] items-baseline gap-6">
                      <span className="font-mono text-xs text-stone-400">01</span>
                      <div>
                        <div className="text-base font-medium text-stone-900">
                          Added{" "}
                          <span className="font-mono text-sm text-stone-700">
                            src/lib/ticket-export.ts
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-stone-500 leading-relaxed">
                          New serializer that takes the filtered ticket list and
                          produces JSON (with `state`, `reporter`, `age`).
                        </div>
                      </div>
                    </li>
                    <li className="py-4 grid grid-cols-[40px_1fr] items-baseline gap-6">
                      <span className="font-mono text-xs text-stone-400">02</span>
                      <div>
                        <div className="text-base font-medium text-stone-900">
                          Added{" "}
                          <span className="font-mono text-sm text-stone-700">
                            app/api/tickets/export/route.ts
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-stone-500 leading-relaxed">
                          GET endpoint that streams the JSON response with the
                          right Content-Disposition headers for download.
                        </div>
                      </div>
                    </li>
                    <li className="py-4 grid grid-cols-[40px_1fr] items-baseline gap-6">
                      <span className="font-mono text-xs text-stone-400">03</span>
                      <div>
                        <div className="text-base font-medium text-stone-900">
                          Wired the toolbar dropdown
                        </div>
                        <div className="mt-1 text-sm text-stone-500 leading-relaxed">
                          Export menu now offers CSV (existing) and JSON (new).
                        </div>
                      </div>
                    </li>
                  </ol>
                </section>

                {/* ENGINE OUTPUT */}
                <section className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Engine output
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      stdout · last 7 lines
                    </span>
                  </div>
                  <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4 font-mono text-[11px] text-stone-700 leading-relaxed space-y-0.5">
                    {STDOUT_TAIL.map((line, i) => {
                      const isOk = line.includes("✓");
                      return (
                        <div
                          key={i}
                          className={isOk ? "text-emerald-700 font-medium" : ""}
                        >
                          {line}
                        </div>
                      );
                    })}
                  </div>
                  <a className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    full log ↗
                  </a>
                </section>
              </div>

              {/* RIGHT RAIL */}
              <aside className="space-y-14">
                {/* STATE — emerald hero */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    State
                  </div>
                  <div className="mt-3 flex items-baseline gap-2.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
                      <span className="relative inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="relative text-2xl font-bold tracking-tight">
                      Shipped
                      <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-emerald-500" />
                    </span>
                  </div>

                  {/* State-machine track — all-done */}
                  <div className="mt-6 flex items-center gap-1.5">
                    {[
                      { label: "Queued", at: "1h ago", done: true },
                      { label: "Running", at: "1h ago", done: true },
                      { label: "Shipped", at: JOB.shippedAt, here: true },
                    ].map((s, i, arr) => (
                      <div key={s.label} className="flex items-center gap-1.5 flex-1">
                        <div className="relative group">
                          {s.here && (
                            <span className="absolute inset-[-4px] rounded-full bg-emerald-400/40 animate-ping" />
                          )}
                          <span
                            className={`relative h-1.5 w-1.5 rounded-full block ${
                              s.here
                                ? "bg-emerald-500"
                                : s.done
                                ? "bg-stone-900"
                                : "bg-stone-300"
                            }`}
                          >
                            {s.here && (
                              <span className="absolute inset-[-3px] rounded-full border border-emerald-500/50" />
                            )}
                          </span>
                          <span className="absolute left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-stone-50 opacity-0 group-hover:opacity-100 pointer-events-none transition shadow-md z-20">
                            {s.label} · {s.at}
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
                    <span>queued</span>
                    <span>running</span>
                    <span className="text-emerald-600">shipped</span>
                  </div>

                  <div className="mt-5 text-sm text-stone-500 leading-relaxed">
                    Engine&rsquo;s work is live on production. Ready for verification.
                  </div>
                </section>

                {/* VERIFY card — featured action */}
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Did it work?
                  </div>
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                    Try it on production. If carmen confirms it works, close this
                    out — otherwise, send it back to the Engine.
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-emerald-600 hover:bg-emerald-700 px-3 py-3 rounded-full shadow-sm inline-flex items-center justify-center gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      Looks good
                    </button>
                    <button className="font-mono text-xs uppercase tracking-widest text-stone-700 bg-white border border-stone-200 hover:border-rose-300 hover:text-rose-700 px-3 py-3 rounded-full transition">
                      Still broken
                    </button>
                  </div>
                  <a className="mt-3 block text-center font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:underline cursor-pointer">
                    notify carmen ↗
                  </a>
                </section>

                {/* RUN INFO */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Run info
                  </div>
                  <ul className="mt-5 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Started</span>
                      <span className="font-mono text-stone-900">{JOB.startedAt}</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Shipped</span>
                      <span className="font-mono text-stone-900">{JOB.shippedAt}</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Duration</span>
                      <span className="font-mono text-stone-900">{JOB.duration}</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Ran on</span>
                      <span className="font-mono text-stone-900">{JOB.bridge}</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Files changed</span>
                      <span className="font-mono text-stone-900">3</span>
                    </li>
                  </ul>
                </section>

                {/* LINKED */}
                <section className="pt-4 border-t border-stone-200/80">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Linked
                  </div>
                  <ul className="mt-4 space-y-3">
                    <li className="group cursor-pointer">
                      <div className="text-sm text-stone-700 group-hover:text-stone-900 leading-snug">
                        {JOB.ticketTitle}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                        {JOB.ticketId} · the Ticket this shipped
                      </div>
                    </li>
                  </ul>
                </section>
              </aside>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant V · editorial shipped
        </div>
      </div>
    </>
  );
}
