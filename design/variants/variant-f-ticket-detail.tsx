// THROWAWAY — editorial ticket-detail layout spike.
// Mounted on /dashboard?variant=F as a sub-shape-A stretch (the ticket
// detail page is the natural home but it's gated behind real ticket
// existence in dev; this faux mount lets Onkesh react to the layout
// without seeding data). Will be folded into a real
// /projects/<id>/tickets/<tid> variant once the design lands.

import { NAV } from "./mock-data";

// Bridge status — toggle to preview the other dot states ("unhealthy" → amber, "offline" → rose).
type BridgeStatus = "healthy" | "unhealthy" | "offline";
const BRIDGE_STATUS: BridgeStatus = "healthy";

function bridgeDotColour(s: BridgeStatus): string {
  if (s === "healthy") return "bg-emerald-500";
  if (s === "unhealthy") return "bg-amber-500";
  return "bg-rose-500";
}
function bridgeStatusLabel(s: BridgeStatus): string {
  if (s === "healthy") return "Bridge · online · healthy";
  if (s === "unhealthy") return "Bridge · online · unhealthy";
  return "Bridge · offline";
}

const TICKET = {
  id: "T-247",
  project: "acme-website",
  title: "Add CSV export to the ticket list",
  kind: "ENHANCEMENT",
  reporter: "ada@acme.io",
  age: "2 days ago",
  state: "backlog" as const,
  bodyMd: `Owner needs to export the full ticket list from acme-website as a CSV for sharing with non-Atlas stakeholders during the upcoming launch review.

The export should include: ticket ID, title, current state, reporter, age, and the linked PR URL if shipped.

Edge case: archived tickets (state=closed for >90 days) should be excluded by default but available via a checkbox.`,
  aiHints: {
    kind: "enhancement",
    severity: "low",
    similarTo: "#574e9115",
    question: "Should export include archived (>90d closed) tickets?",
    likelyFiles: [
      "app/(authed)/projects/[id]/tickets/page.tsx",
      "src/lib/ticket-export.ts",
    ],
    enrichedAt: "2026-05-13",
  },
  related: [
    { id: "#574e9115", title: "Add JSON export" },
    { id: "#a8bc2f01", title: "Export buttons UX redesign" },
  ],
  activity: [
    { who: "Ada", what: "filed this", at: "2d ago" },
    { who: "You", what: "moved to Backlog", at: "2d ago" },
  ],
};

export function VariantFTicketDetail() {
  return (
    <>
      {/* Hide the production (authed) Header — its backdrop-filter promotes
          it above sibling z-indexes in Chrome, so z-[80] alone isn't enough. */}
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
      <div className="flex min-h-screen">
        {/* COLLAPSED rail — three zones: brand top · nav middle · user bottom */}
        <aside className="w-[56px] shrink-0 flex flex-col items-center justify-between py-8 border-r border-stone-200/60">
          {/* Brand mark — pure typographic letter, no dot.
              Bridge status indicator moved to the user `o` at the bottom
              (semantically: the Bridge belongs to the Owner). */}
          <div className="relative h-6 w-6 flex items-center justify-center">
            <div className="text-xl font-bold tracking-tighter leading-none">a</div>
          </div>
          <nav className="flex flex-col items-center gap-5">
            {NAV.map((n) => {
              const initial = n.short.charAt(0);
              const isHere = n.key === "projects"; // simulated "viewing a Project's Ticket"
              return (
                <a
                  key={n.key}
                  className={`relative h-7 w-7 flex items-center justify-center cursor-pointer transition group ${
                    isHere ? "text-stone-900" : "text-stone-400 hover:text-stone-900"
                  }`}
                >
                  <span className={`text-base ${isHere ? "font-semibold" : "font-medium"}`}>
                    {initial}
                  </span>
                  {isHere && (
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
          {/* User mark — mirrors brand `a` typographically; status dot
              carries Bridge health (green=healthy, amber=unhealthy,
              rose=offline). Toggle BRIDGE_STATUS at top of file to preview. */}
          <div className="relative group">
            <div className="relative h-6 w-6 flex items-center justify-center cursor-pointer">
              <div className="text-xl font-bold tracking-tighter leading-none text-stone-900 group-hover:text-amber-600 transition">
                o
              </div>
              <span
                className={`absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full ${bridgeDotColour(
                  BRIDGE_STATUS,
                )}`}
              />
            </div>

            {/* Hover popup — email + Bridge status + sign-out */}
            <div className="absolute left-full bottom-0 ml-3 w-60 bg-white rounded-2xl shadow-lg border border-stone-200 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none group-hover:pointer-events-auto transition z-30">
              <div className="text-sm text-stone-900 break-all leading-tight">
                onkesh19@yahoo.co.in
              </div>
              <hr className="my-4 border-stone-200" />
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${bridgeDotColour(
                    BRIDGE_STATUS,
                  )}`}
                />
                {bridgeStatusLabel(BRIDGE_STATUS)}
              </div>
              <div className="mt-1 font-mono text-[10px] text-stone-400">
                macbook-pro-2024
              </div>
              <hr className="my-4 border-stone-200" />
              <a className="block font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                Sign out →
              </a>
            </div>
          </div>
        </aside>

        {/* Main — editorial ticket detail */}
        <main className="flex-1 relative">
          <div className="px-16 pt-12 pb-24 grid grid-cols-[1fr_360px] gap-16">
            {/* LEFT — Body rail */}
            <div className="max-w-2xl">
              {/* Route breadcrumb — top of body, aligns with State on the rail */}
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Projects · {TICKET.project} · {TICKET.id}
              </div>

              {/* Title */}
              <h1 className="mt-2 text-5xl font-bold tracking-tighter leading-tight">
                {TICKET.title}
              </h1>

              {/* Metadata row */}
              <div className="mt-4 font-mono text-xs uppercase tracking-widest text-stone-500">
                {TICKET.kind}
                <span className="mx-2">·</span>
                filed by {TICKET.reporter}
                <span className="mx-2">·</span>
                {TICKET.age}
                <span className="mx-2">·</span>
                <span className="text-amber-600 font-medium">{TICKET.state}</span>
              </div>

              {/* Body markdown as editorial prose */}
              <div className="mt-12 prose prose-stone max-w-none">
                {TICKET.bodyMd.split("\n\n").map((para, i) => (
                  <p key={i} className="text-lg leading-relaxed text-stone-700">
                    {para}
                  </p>
                ))}
              </div>

              {/* Activity, as continued reading */}
              <section className="mt-20">
                <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Activity
                  </h2>
                </div>
                <ol className="divide-y divide-stone-200">
                  {TICKET.activity.map((a, i) => (
                    <li
                      key={i}
                      className="py-5 grid grid-cols-[40px_1fr_auto] items-baseline gap-6"
                    >
                      <span className="font-mono text-xs text-stone-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="text-base tracking-tight">
                        <span className="font-medium">{a.who}</span> {a.what}
                      </div>
                      <span className="font-mono text-xs text-stone-400">{a.at}</span>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Brief — the Engine's auto-draft preview (balances the rail height
                  and gives the Owner editorial confidence before dispatch) */}
              <section className="mt-20">
                <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Brief
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    Draft
                  </span>
                </div>
                <div className="mt-5 rounded-2xl bg-white/70 border border-stone-200/80 p-6 space-y-4 text-base text-stone-700 leading-relaxed">
                  <p>
                    Add an{" "}
                    <span className="font-semibold text-stone-900">
                      &ldquo;Export as CSV&rdquo;
                    </span>{" "}
                    button to the ticket list page at{" "}
                    <span className="font-mono text-sm text-stone-600">
                      app/(authed)/projects/[id]/tickets/page.tsx
                    </span>
                    . The button downloads a UTF-8 CSV of all visible tickets.
                  </p>
                  <p>
                    <span className="font-semibold text-stone-900">Columns:</span>{" "}
                    ticket ID, title, current state, reporter, age in days, linked PR URL
                    (if shipped).
                  </p>
                  <p>
                    <span className="font-semibold text-stone-900">Edge case:</span>{" "}
                    archived tickets (closed for &gt;90 days) excluded by default; add an{" "}
                    <span className="italic">&ldquo;Include archived&rdquo;</span>{" "}
                    checkbox above the button.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  <a className="hover:text-amber-600 cursor-pointer">edit ↗</a>
                  <span>·</span>
                  <a className="hover:text-amber-600 cursor-pointer">regenerate ↻</a>
                  <span>·</span>
                  <span className="text-stone-400">drafted by Engine 2m ago</span>
                </div>
              </section>
            </div>

            {/* RIGHT — Metadata rail (grown from the hierarchy pass).
                NO pt-* here so the State label aligns horizontally with
                the breadcrumb on the body column. space-y-14 matches the
                aside-section rhythm locked from variant E. */}
            <aside className="space-y-14">
              {/* STATE — visual hero + state-machine track */}
              <section>
                <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  State
                </div>
                <div className="mt-3 flex items-baseline gap-2.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                  <span className="relative text-2xl font-bold tracking-tight">
                    Backlog
                    <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                  </span>
                </div>

                {/* State-machine progress track — pulse on "you are here" + hover tooltips */}
                <div className="mt-6 flex items-center gap-1.5">
                  {[
                    { key: "triage", label: "Triage", at: "2 days ago", done: true },
                    { key: "backlog", label: "Backlog", at: "just now", here: true },
                    { key: "active", label: "Active", at: null },
                    { key: "review", label: "Review", at: null },
                    { key: "closed", label: "Closed", at: null },
                  ].map((s, i, arr) => (
                    <div key={s.key} className="flex items-center gap-1.5 flex-1">
                      <div className="relative group">
                        {/* Pulse halo — only on "you are here" */}
                        {s.here && (
                          <span className="absolute inset-[-4px] rounded-full bg-amber-400/40 animate-ping" />
                        )}
                        {/* Static dot */}
                        <span
                          className={`relative h-1.5 w-1.5 rounded-full block cursor-pointer ${
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
                        {/* Hover tooltip with timestamp */}
                        <span className="absolute left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-stone-50 opacity-0 group-hover:opacity-100 pointer-events-none transition shadow-md z-20">
                          {s.label}
                          {s.at && (
                            <span className="text-stone-400"> · {s.at}</span>
                          )}
                          {!s.at && <span className="text-stone-400"> · pending</span>}
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
                  <span>triage</span>
                  <span className="text-amber-600">backlog</span>
                  <span>active</span>
                  <span>review</span>
                  <span>closed</span>
                </div>

                <div className="mt-5 text-sm text-stone-500 leading-relaxed">
                  Approved by you. Not dispatched yet.
                </div>

                {/* Live viewers presence — surfaces via T42 SSE in real wiring */}
                <div className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                    <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <span>2 viewing now</span>
                  <span className="text-stone-400">·</span>
                  <span className="text-stone-400 normal-case tracking-normal font-sans text-xs italic">
                    you, ada
                  </span>
                </div>
              </section>

              {/* IF DISPATCHED — quiet card with Dispatch CTA as primary action */}
              <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  If dispatched
                </div>
                <div className="mt-3 text-sm text-stone-700 leading-relaxed">
                  <span className="font-mono text-stone-900">~5 min</span> of your Claude
                  Code quota. Engine runs on{" "}
                  <span className="font-mono text-stone-900">macbook-pro-2024</span>.
                </div>
                <div className="mt-2 text-xs text-stone-500 leading-relaxed">
                  A PR will land at{" "}
                  <span className="font-mono text-stone-600">
                    acme-website/pulls/<span className="text-stone-400">new</span>
                  </span>
                  .
                </div>
                <button className="mt-5 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3 rounded-full inline-flex items-center justify-center gap-2 shadow-sm transition">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Dispatch to AI
                  <span className="text-stone-400">→</span>
                </button>
                <a className="mt-3 block text-center font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:underline cursor-pointer">
                  Edit Brief first →
                </a>
              </section>

              {/* AI — structured + pull-quote with typographic ornament */}
              <section>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  AI
                </div>

                {/* What it is */}
                <p className="mt-4 text-base text-stone-700 leading-relaxed">
                  Looks like an{" "}
                  <span className="font-semibold text-stone-900">enhancement</span> at{" "}
                  <span className="font-semibold text-stone-900">low</span> severity.
                  Similar to{" "}
                  <a className="text-amber-600 hover:underline cursor-pointer">
                    {TICKET.aiHints.similarTo}
                  </a>
                  .
                </p>

                {/* AI confidence — tiny block-element meter */}
                <div className="mt-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  <span>Confidence</span>
                  <span className="flex items-center gap-0.5">
                    <span className="inline-block h-3 w-1.5 bg-amber-500" />
                    <span className="inline-block h-3 w-1.5 bg-amber-500" />
                    <span className="inline-block h-3 w-1.5 bg-amber-500" />
                    <span className="inline-block h-3 w-1.5 bg-stone-200" />
                    <span className="inline-block h-3 w-1.5 bg-stone-200" />
                  </span>
                  <span className="text-stone-700">high</span>
                </div>

                {/* What it'll touch — sub-section */}
                <div className="mt-5 text-xs font-mono uppercase tracking-widest text-stone-500">
                  Likely touches
                </div>
                <ul className="mt-2 space-y-1">
                  {TICKET.aiHints.likelyFiles.map((f) => (
                    <li
                      key={f}
                      className="font-mono text-xs text-stone-600 hover:text-amber-600 cursor-pointer"
                    >
                      {f}
                    </li>
                  ))}
                </ul>

                {/* AI asks — pull-quote with typographic ornament */}
                <div className="relative mt-7 pl-6">
                  <span className="absolute -left-1 -top-2 font-bold text-4xl text-amber-400/80 leading-none select-none">
                    &ldquo;
                  </span>
                  <p className="text-sm italic text-stone-800 leading-relaxed">
                    {TICKET.aiHints.question}
                  </p>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    AI asks
                  </div>
                </div>

                <div className="mt-5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  enriched {TICKET.aiHints.enrichedAt}
                </div>
              </section>

              {/* RELATED — title-first with state badges inline */}
              <section>
                <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  Related
                </div>
                <ul className="mt-4 space-y-4">
                  {[
                    { ...TICKET.related[0], state: "shipped", overlap: "60% file overlap" },
                    { ...TICKET.related[1], state: "review-ready", overlap: "shared keyword" },
                  ].map((r) => (
                    <li key={r.id} className="group cursor-pointer">
                      <div className="flex items-baseline gap-2 text-sm text-stone-700 group-hover:text-stone-900 leading-snug">
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full mt-1.5 ${stateDot(
                            r.state,
                          )}`}
                        />
                        <span>{r.title}</span>
                      </div>
                      <div className="mt-1 ml-3.5 font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                        {r.id} · {r.state.replace("-", " ")} · {r.overlap}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {/* BRIDGE — Engine + Bridge health, mirrors variant E's BRIDGE section */}
              <section>
                <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  Bridge
                </div>
                <div className="mt-3 flex items-baseline gap-2.5">
                  <span className="relative flex h-1.5 w-1.5 mt-1.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                    <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <div>
                    <div className="text-base text-stone-900 font-medium">
                      macbook-pro-2024
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      online · healthy
                    </div>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-baseline justify-between">
                    <span className="text-stone-700">Uptime</span>
                    <span className="font-mono text-stone-900">99%</span>
                  </li>
                  <li className="flex items-baseline justify-between">
                    <span className="text-stone-700">Last preflight</span>
                    <span className="font-mono text-stone-900">2h ago</span>
                  </li>
                  <li className="flex items-baseline justify-between">
                    <span className="text-stone-700">Avg response</span>
                    <span className="font-mono text-stone-900">~5 min</span>
                  </li>
                </ul>
              </section>

              {/* NOTES — split-line footer */}
              <section className="pt-4 border-t border-stone-200/80">
                <ul className="text-sm space-y-2">
                  <li className="flex items-baseline justify-between">
                    <span className="text-stone-500">No blockers</span>
                    <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:underline cursor-pointer">
                      + add
                    </a>
                  </li>
                  <li className="flex items-baseline justify-between">
                    <span className="text-stone-500">No draft Brief yet</span>
                    <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:underline cursor-pointer">
                      draft →
                    </a>
                  </li>
                </ul>
              </section>
            </aside>
          </div>

        </main>
      </div>

      {/* Editorial colophon — anchored bottom-left, aligns with the `o` baseline */}
      <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
        atlas · v1.3 design lab · variant F · editorial ticket detail
      </div>
      </div>
    </>
  );
}

function _RailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500 border-b border-stone-200 pb-2">
        {label}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function stateDot(state: string): string {
  if (state === "shipped") return "bg-emerald-500";
  if (state === "failed") return "bg-rose-500";
  if (state === "review-ready") return "bg-amber-500";
  if (state === "in-progress") return "bg-stone-700";
  if (state === "backlog") return "bg-stone-400";
  return "bg-stone-300";
}
