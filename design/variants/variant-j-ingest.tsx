// THROWAWAY — Editorial Ingest Summary prototype.
// Project introduction page: stack · architecture · smells · health,
// presented as editorial reading flow with a centred diagram figure.

import { NAV } from "./mock-data";

const PROJECT = {
  name: "acme-website",
  tagline: "Online ordering for ACME's storefront.",
  refreshedAt: "2 hours ago",
  health: "healthy" as const,
};

const _STACK = [
  "Next.js 15",
  "TypeScript 5.7",
  "Tailwind v4",
  "Prisma",
  "PostgreSQL",
  "Stripe",
  "Resend",
];

const ARCHITECTURE = [
  {
    name: "Storefront",
    sub: "Next.js · page tier · marketing",
    detail: "Server-rendered marketing + product pages. Caching via Vercel.",
  },
  {
    name: "Cart",
    sub: "Server actions · session-backed",
    detail: "Per-session cart state with optimistic UI. Server-action mutations.",
  },
  {
    name: "Fulfillment",
    sub: "Stripe · DB · email",
    detail: "Stripe webhooks → DB orders → Resend email confirmations.",
  },
];

const SMELLS = [
  {
    severity: "high" as const,
    title: "page.tsx is 1,247 lines long",
    file: "app/(shop)/[handle]/page.tsx",
    detail: "Mixed concerns: layout, data fetching, and 3 inline components. Suggest extracting.",
  },
  {
    severity: "medium" as const,
    title: "Missing test coverage on payment flows",
    file: "src/lib/payment-actions.ts",
    detail: "Critical path; only happy-path covered. Add failure-case tests.",
  },
];

const HEALTH = [
  { label: "Tests", value: "142 passing, 0 failing", ok: true },
  { label: "Lint", value: "clean", ok: true },
  { label: "Typecheck", value: "clean", ok: true },
  { label: "Dep audit", value: "0 high · 0 critical", ok: true },
  { label: "Build", value: "passing", ok: true },
];

export function VariantJIngest() {
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
            {/* Top: breadcrumb + last-ingested timestamp */}
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Projects · acme-website · Ingest
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                refreshed {PROJECT.refreshedAt}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
              {/* MAIN COL — editorial reading */}
              <div className="max-w-2xl">
                {/* Hero */}
                <h1 className="text-5xl font-bold tracking-tighter">{PROJECT.name}</h1>
                <p className="mt-4 text-xl text-stone-700 leading-relaxed">
                  {PROJECT.tagline}
                </p>
                <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                    <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <span>{PROJECT.health}</span>
                  <span className="text-stone-300">·</span>
                  <span>last engine run was clean</span>
                </div>

                {/* ENGINE READ — editorial commentary from the AI */}
                <section className="mt-16">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Engine read
                  </div>
                  <div className="mt-5 space-y-4 text-base text-stone-700 leading-relaxed">
                    <p>
                      <span className="font-mono text-stone-900">acme-website</span> is a
                      well-organised modern Next stack. The{" "}
                      <span className="font-semibold text-stone-900">Storefront</span>{" "}
                      tier is conventional and unsurprising; the{" "}
                      <span className="font-semibold text-stone-900">Cart</span> layer is
                      the most active codebase with optimistic UI patterns;{" "}
                      <span className="font-semibold text-stone-900">Fulfillment</span>{" "}
                      is the riskiest area because Stripe webhooks, DB orders, and
                      Resend emails compose into a critical path the test suite
                      doesn&rsquo;t fully cover.
                    </p>
                    <p>
                      <span className="italic text-stone-600">
                        Suggested priorities:
                      </span>{" "}
                      extract the long{" "}
                      <span className="font-mono text-sm text-stone-600">page.tsx</span>{" "}
                      into its three obvious components, then backfill{" "}
                      <span className="font-mono text-sm text-stone-600">
                        payment-actions.ts
                      </span>{" "}
                      tests. After that, the codebase is in good shape for v1.4 work.
                    </p>
                  </div>
                  <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    enriched {PROJECT.refreshedAt}
                  </div>
                </section>

                {/* STACK — editorial prose, no pills, no chrome */}
                <section className="mt-16">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Stack
                  </div>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    Server-rendered with{" "}
                    <span className="font-semibold text-stone-900">Next.js 15</span> and{" "}
                    <span className="font-semibold text-stone-900">Tailwind v4</span>{" "}
                    for the UI layer. Persistence via{" "}
                    <span className="font-semibold text-stone-900">Prisma</span> over{" "}
                    <span className="font-semibold text-stone-900">PostgreSQL</span>.{" "}
                    <span className="font-semibold text-stone-900">Stripe</span>{" "}
                    handles checkout;{" "}
                    <span className="font-semibold text-stone-900">Resend</span>{" "}
                    handles transactional email. A standard modern Next stack — no
                    surprises.
                  </p>
                </section>

                {/* ARCHITECTURE — editorial figure + divided list */}
                <section className="mt-16">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Architecture
                  </div>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    Three subsystems flow end-to-end —{" "}
                    <span className="font-semibold text-stone-900">Storefront</span> →{" "}
                    <span className="font-semibold text-stone-900">Cart</span> →{" "}
                    <span className="font-semibold text-stone-900">Fulfillment</span>.
                  </p>

                  {/* Editorial figure — boxes + arrows, no card chrome */}
                  <figure className="mt-8">
                    <div className="flex items-center justify-center gap-3">
                      {ARCHITECTURE.map((node, i) => (
                        <div key={node.name} className="flex items-center">
                          <div className="text-center">
                            <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-1.5">
                              {String(i + 1).padStart(2, "0")}
                            </div>
                            <div className="px-4 py-3 border border-stone-300 rounded-md min-w-[130px]">
                              <div className="text-sm font-semibold text-stone-900">
                                {node.name}
                              </div>
                              <div className="mt-1 font-mono text-[9px] text-stone-500">
                                {node.sub}
                              </div>
                            </div>
                          </div>
                          {i < ARCHITECTURE.length - 1 && (
                            <span className="mx-3 mt-5 font-mono text-stone-400 text-lg self-start">
                              →
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <figcaption className="mt-5 text-center font-mono text-[10px] uppercase tracking-widest italic text-stone-400">
                      Fig. 1 — System flow · auto-refreshes on commit
                    </figcaption>
                  </figure>

                  <ol className="mt-10 divide-y divide-stone-200">
                    {ARCHITECTURE.map((node, i) => (
                      <li
                        key={node.name}
                        className="py-5 grid grid-cols-[40px_1fr] items-baseline gap-6"
                      >
                        <span className="font-mono text-xs text-stone-400">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <div className="text-lg tracking-tight font-medium">
                            {node.name}{" "}
                            <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                              {node.sub}
                            </span>
                          </div>
                          <div className="mt-1.5 text-sm text-stone-500 leading-relaxed">
                            {node.detail}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                {/* SMELLS — same divided-list register, severity as inline mono prefix */}
                <section className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Smells
                    </h2>
                    <span className="font-mono text-xs text-stone-400">
                      {SMELLS.length}
                    </span>
                  </div>
                  <ol className="divide-y divide-stone-200">
                    {SMELLS.map((s, i) => (
                      <li
                        key={i}
                        className="py-5 grid grid-cols-[40px_1fr] items-baseline gap-6 group cursor-pointer"
                      >
                        <span
                          className={`font-mono text-[10px] uppercase tracking-widest ${
                            s.severity === "high" ? "text-rose-700" : "text-amber-700"
                          }`}
                        >
                          {s.severity}
                        </span>
                        <div>
                          <div className="text-lg tracking-tight font-medium">
                            {s.title}
                          </div>
                          <div className="mt-1 font-mono text-xs text-stone-500">
                            {s.file}
                          </div>
                          <div className="mt-2 text-sm text-stone-500 leading-relaxed">
                            {s.detail}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                {/* CODE CHURN — editorial bar chart */}
                <section className="mt-16">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Code churn
                  </div>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed">
                    Commits per week over the last 12 weeks. This week is{" "}
                    <span className="font-mono text-amber-600 font-semibold">
                      busier than usual
                    </span>{" "}
                    — the v1.3 design pass kicked off Tuesday.
                  </p>
                  <div className="mt-7 flex items-end gap-1.5 h-24">
                    {[3, 7, 4, 6, 2, 5, 8, 4, 6, 5, 9, 11].map((h, i) => {
                      const max = 11;
                      const isThis = i === 11;
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-2"
                        >
                          <div
                            className={`w-full rounded-t-sm ${
                              isThis ? "bg-amber-500" : "bg-amber-400/50"
                            }`}
                            style={{ height: `${Math.max((h / max) * 100, 6)}%` }}
                          />
                          <span
                            className={`font-mono text-[9px] uppercase tracking-widest ${
                              isThis ? "text-amber-600 font-bold" : "text-stone-400"
                            }`}
                          >
                            w{i + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest italic text-stone-400">
                    Fig. 2 — 12-week commit volume
                  </div>
                </section>

                {/* HEALTH — inline status line + coverage-by-area breakdown */}
                <section className="mt-16">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Baseline health
                  </div>
                  <div className="mt-5 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-stone-700 flex-wrap">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    {HEALTH.map((h, i) => (
                      <span key={h.label} className="flex items-baseline gap-2">
                        <span className="text-stone-500">{h.label}</span>
                        <span className="text-stone-900">{h.value}</span>
                        {i < HEALTH.length - 1 && (
                          <span className="text-stone-300">·</span>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Coverage by area — small horizontal bars */}
                  <div className="mt-10">
                    <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
                      Coverage by area
                    </div>
                    <div className="mt-5 space-y-4">
                      {[
                        { area: "Backend", pct: 82 },
                        { area: "Frontend", pct: 64 },
                        { area: "Utilities", pct: 91 },
                        { area: "Overall", pct: 73, hero: true },
                      ].map((row) => (
                        <div key={row.area}>
                          <div className="flex items-baseline justify-between text-sm">
                            <span
                              className={
                                row.hero
                                  ? "text-stone-900 font-semibold"
                                  : "text-stone-700"
                              }
                            >
                              {row.area}
                            </span>
                            <span
                              className={`font-mono ${
                                row.hero ? "text-stone-900 font-semibold" : "text-stone-900"
                              }`}
                            >
                              {row.pct}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-1 w-full bg-stone-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                row.hero ? "bg-amber-500" : "bg-amber-400/70"
                              }`}
                              style={{ width: `${row.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest italic text-stone-400">
                      Fig. 3 — Test coverage by area
                    </div>
                  </div>
                </section>

                {/* RECENT COMMITS — editorial reading list */}
                <section className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Recent commits
                    </h2>
                    <span className="font-mono text-xs text-stone-400">5 of 247</span>
                  </div>
                  <ol className="divide-y divide-stone-200">
                    {[
                      { sha: "ab05f49", age: "2h", subject: "fix(ui): disable system-following dark mode pending v1.3 toggle" },
                      { sha: "658bfb8", age: "5h", subject: "fix(build): extract pure helpers to unblock client bundle" },
                      { sha: "8445322", age: "1d", subject: "merge: T68 — System-following dark mode (v1.2 FINAL)" },
                      { sha: "7c1c32e", age: "1d", subject: "feat(ui): system-following dark mode across every surface (T68)" },
                      { sha: "1659f00", age: "2d", subject: "merge: T65 — Ingest Summary cards + Mermaid diagrams" },
                    ].map((commit, i) => (
                      <li
                        key={commit.sha}
                        className="py-4 grid grid-cols-[40px_auto_1fr_auto] items-baseline gap-4 group cursor-pointer"
                      >
                        <span className="font-mono text-xs text-stone-400">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <a className="font-mono text-xs text-stone-700 hover:text-amber-600">
                          {commit.sha}
                        </a>
                        <span className="text-sm text-stone-700 group-hover:text-stone-900 truncate">
                          {commit.subject}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 whitespace-nowrap">
                          {commit.age}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <a className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    all commits →
                  </a>
                </section>
              </div>

              {/* RIGHT RAIL — same rhythm as E/F: hero stat + sections + featured action card + footer */}
              <aside className="space-y-14">
                {/* Coverage hero (mirrors F's State hero / E's THIS WEEK hero) */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Project stats
                  </div>
                  <div className="mt-3">
                    <span className="relative text-2xl font-bold tracking-tight">
                      73% coverage
                      <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                    Up from <span className="font-mono">68%</span> last month.
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Lines of code</span>
                      <span className="font-mono text-stone-900">~18,300</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Files</span>
                      <span className="font-mono text-stone-900">412</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Open Tickets</span>
                      <span className="font-mono text-stone-900">7</span>
                    </li>
                  </ul>
                </section>

                {/* Repository — quiet, divider-led, with tiny commit sparkline */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Repository
                  </div>
                  <a className="mt-5 block font-mono text-sm text-stone-700 hover:text-amber-600 cursor-pointer">
                    github.com/acme/website
                  </a>
                  <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    <span>main</span>
                    <span className="text-stone-300">·</span>
                    <span>247 commits ahead of last ingest</span>
                  </div>
                  {/* Tiny commit-activity sparkline (12 weeks) */}
                  <div className="mt-4 flex items-end gap-px h-4">
                    {[3, 7, 4, 6, 2, 5, 8, 4, 6, 5, 9, 11].map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm ${
                          i === 11 ? "bg-amber-500" : "bg-amber-400/50"
                        }`}
                        style={{ height: `${Math.max((h / 11) * 100, 8)}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 font-mono text-[9px] uppercase tracking-widest text-stone-400">
                    12 weeks of activity
                  </div>
                </section>

                {/* Ingest action card — featured chrome (matches F's IF DISPATCHED / E's READY TO SHIP) */}
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Ingest
                  </div>
                  <div className="mt-3 text-sm text-stone-700 leading-relaxed">
                    Engine last read this{" "}
                    <span className="font-mono text-stone-900">
                      {PROJECT.refreshedAt}
                    </span>
                    . If commits have landed since, refresh to re-scan.
                  </div>
                  <button className="mt-5 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3 rounded-full inline-flex items-center justify-center gap-2 shadow-sm transition">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Refresh from latest
                    <span className="text-stone-400">↻</span>
                  </button>
                  <a className="mt-3 block text-center font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:underline cursor-pointer">
                    Edit CONTEXT.md ↗
                  </a>
                </section>

                {/* Footer — quiet metadata line (matches F's NOTES footer) */}
                <section className="pt-4 border-t border-stone-200/80">
                  <ul className="text-sm space-y-2">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-500">Ingest schema</span>
                      <span className="font-mono text-stone-500">v3</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-500">Auto-refresh</span>
                      <span className="font-mono text-stone-500">on commit</span>
                    </li>
                  </ul>
                </section>
              </aside>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant J · editorial ingest summary
        </div>
      </div>
    </>
  );
}
