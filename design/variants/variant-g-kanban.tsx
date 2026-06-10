// THROWAWAY — Editorial Kanban prototype.
// Cards are intentional (Kanban needs them for state transitions).
// Card chrome is editorial-restrained: 1px stone-200 border, no shadow,
// 8px radii. All other editorial tokens still apply.

import { NAV } from "./mock-data";

type TicketState =
  | "triage"
  | "backlog"
  | "in-progress"
  | "review-ready"
  | "shipped"
  | "failed";

type SequenceHint = {
  kind: "parallel-safe-with" | "recommended-after" | "blocked-by";
  ticket: string;
};

type KanbanTicket = {
  id: string;
  title: string;
  state: TicketState;
  kind: "bug" | "enhancement";
  reporter: string;
  age: string;
  shipGroupId?: string;
  hint?: SequenceHint;
};

const TICKETS: KanbanTicket[] = [
  { id: "T-301", title: "Add CSV export to ticket list", state: "triage", kind: "enhancement", reporter: "ada", age: "2d" },
  { id: "T-302", title: "Onboarding screenshots are stale", state: "triage", kind: "bug", reporter: "carmen", age: "5h" },

  { id: "T-280", title: "Mermaid renders blank on iOS", state: "backlog", kind: "bug", reporter: "you", age: "3d", hint: { kind: "blocked-by", ticket: "T-279" } },
  { id: "T-281", title: "Empty-state illustrations across surfaces", state: "backlog", kind: "enhancement", reporter: "you", age: "1w" },
  { id: "T-279", title: "Bridge preflight v2 — token rotation", state: "backlog", kind: "enhancement", reporter: "you", age: "2w" },

  { id: "T-275", title: "T70 sidebar prototype", state: "in-progress", kind: "enhancement", reporter: "you", age: "1h", hint: { kind: "parallel-safe-with", ticket: "T-247" } },
  { id: "T-274", title: "Fix bridge offline race", state: "in-progress", kind: "bug", reporter: "you", age: "3h" },

  { id: "T-247", title: "Add export to CSV button", state: "review-ready", kind: "enhancement", reporter: "ada", age: "12h", shipGroupId: "sg-1" },
  { id: "T-249", title: "Add JSON export endpoint", state: "review-ready", kind: "enhancement", reporter: "carmen", age: "1d", shipGroupId: "sg-1" },
  { id: "T-250", title: "Fix Mermaid SSR error", state: "review-ready", kind: "bug", reporter: "you", age: "6h", hint: { kind: "recommended-after", ticket: "T-247" } },

  { id: "T-220", title: "Sidebar collapse logic", state: "shipped", kind: "enhancement", reporter: "you", age: "2d" },
  { id: "T-219", title: "Export buttons UX redesign", state: "shipped", kind: "enhancement", reporter: "carmen", age: "3d" },
  { id: "T-149", title: "Engine timeout on large repos", state: "failed", kind: "bug", reporter: "you", age: "12h" },
];

const COLUMNS: Array<{
  key: string;
  label: string;
  dot: string;
  filterStates: TicketState[];
}> = [
  { key: "triage", label: "Triage", dot: "bg-sky-400", filterStates: ["triage"] },
  { key: "backlog", label: "Backlog", dot: "bg-stone-400", filterStates: ["backlog"] },
  { key: "active", label: "Active", dot: "bg-amber-400", filterStates: ["in-progress"] },
  { key: "review", label: "Review", dot: "bg-amber-500", filterStates: ["review-ready"] },
  { key: "closed", label: "Closed", dot: "bg-emerald-400", filterStates: ["shipped", "failed"] },
];

export function VariantGKanban() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          {/* SIDEBAR — same shape as E/F, P is active */}
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

          {/* MAIN — pt-8 so breadcrumb baselines with the `a` brand mark */}
          <main className="flex-1 px-16 pt-8 pb-24">
            {/* Top row — breadcrumb + density */}
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Projects · acme-website
              </div>

              {/* Density toggle (Compact / Medium / Rich) */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  Density
                </span>
                <div className="flex items-center font-mono text-xs uppercase tracking-widest rounded-full border border-stone-200 overflow-hidden">
                  <button className="px-3 py-1.5 text-stone-500 hover:bg-stone-100">C</button>
                  <button className="px-3 py-1.5 bg-stone-900 text-stone-50">M</button>
                  <button className="px-3 py-1.5 text-stone-500 hover:bg-stone-100">R</button>
                </div>
              </div>
            </div>

            {/* Title + stats inline on one row (collapses two former rows into one) */}
            <div className="mt-2 flex items-baseline gap-6 flex-wrap">
              <h1 className="text-5xl font-bold tracking-tighter">Tickets.</h1>
              <p className="text-base text-stone-500">
                <span className="font-mono text-stone-900">{TICKETS.length}</span> total ·{" "}
                <span className="font-mono text-amber-600">
                  {TICKETS.filter((t) => t.state === "review-ready").length}
                </span>{" "}
                ready ·{" "}
                <span className="font-mono text-rose-600">
                  {TICKETS.filter((t) => t.state === "failed").length}
                </span>{" "}
                failed
              </p>
            </div>

            {/* Live presence + stuck insight — one combined secondary line */}
            <div className="mt-3 flex items-baseline gap-4 flex-wrap font-mono text-[10px] uppercase tracking-widest text-stone-500">
              <span className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                  <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span>2 viewing now</span>
                <span className="text-stone-400 normal-case tracking-normal font-sans text-xs italic">
                  ada, you
                </span>
              </span>
              <span className="text-stone-300">·</span>
              <span className="normal-case tracking-normal font-sans text-xs italic text-stone-500">
                <span className="font-mono not-italic text-stone-700">T-280</span> stuck{" "}
                <span className="font-mono not-italic">3 days</span>
              </span>
            </div>

            {/* Filter chips — tighter mt from previous content */}
            <div className="mt-6 flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                Filter
              </span>
              <FilterChip label="Reporter" />
              <FilterChip label="Kind" />
              <FilterChip label="State" />
              <FilterChip label="Hint" />
              <button className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-600 ml-2">
                Reset
              </button>
            </div>

            {/* Kanban — 5 columns */}
            <div className="mt-10 grid grid-cols-5 gap-5">
              {COLUMNS.map((col) => {
                const tickets = TICKETS.filter((t) => col.filterStates.includes(t.state));
                const shipGroups =
                  col.key === "review"
                    ? Array.from(
                        new Set(
                          tickets
                            .filter((t) => t.shipGroupId)
                            .map((t) => t.shipGroupId!),
                        ),
                      )
                    : [];
                const ungrouped = tickets.filter((t) => !t.shipGroupId);

                return (
                  <div key={col.key}>
                    {/* Column header */}
                    <div className="pb-3 border-b border-stone-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full ${col.dot}`}
                          />
                          <span className="font-mono text-xs uppercase tracking-[0.25em] text-stone-700">
                            {col.label}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-stone-400">
                          {tickets.length}
                        </span>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="mt-4 space-y-3">
                      {/* AI ship suggestion — Engine's reasoning made visible (Review only, when a Ship Group exists) */}
                      {col.key === "review" && shipGroups.length > 0 && (
                        <p className="px-1 text-xs italic text-stone-600 leading-snug">
                          <span className="font-mono not-italic text-stone-500">AI suggests:</span>{" "}
                          ship{" "}
                          <span className="font-mono not-italic text-emerald-700">T-247</span>{" "}
                          and{" "}
                          <span className="font-mono not-italic text-emerald-700">T-249</span>{" "}
                          together — same domain, file-sets disjoint, both review-ready ~12h.
                        </p>
                      )}

                      {/* Ship Groups (Review only) */}
                      {shipGroups.map((sgId) => {
                        const sgTickets = tickets.filter((t) => t.shipGroupId === sgId);
                        return (
                          <div
                            key={sgId}
                            className="rounded-xl border-2 border-dashed border-emerald-500 p-2.5 bg-emerald-100/60 space-y-2 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.1)]"
                          >
                            <div className="flex items-baseline justify-between gap-2 px-1">
                              <div className="flex items-center gap-1.5">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-70" />
                                  <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                </span>
                                <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-800 font-medium">
                                  Parallel-safe · {sgTickets.length}
                                </span>
                              </div>
                              <button className="font-mono text-[9px] uppercase tracking-widest text-stone-50 bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-full shadow-sm">
                                Ship {sgTickets.length} →
                              </button>
                            </div>
                            {sgTickets.map((t) => (
                              <TicketCard key={t.id} ticket={t} />
                            ))}
                          </div>
                        );
                      })}

                      {/* Ungrouped tickets */}
                      {ungrouped.map((t) => (
                        <TicketCard key={t.id} ticket={t} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant G · editorial kanban
        </div>
      </div>
    </>
  );
}

function TicketCard({ ticket }: { ticket: KanbanTicket }) {
  return (
    <div className="relative rounded-lg border border-stone-200 bg-white p-3 cursor-pointer hover:border-stone-300 transition group">
      {/* Top row — kind label + ID + state dot */}
      <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-stone-400">
        <span>{ticket.kind === "bug" ? "BUG" : "ENH"}</span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-1 w-1 rounded-full ${stateDotG(ticket.state)}`} />
          {ticket.id}
        </span>
      </div>

      {/* Title */}
      <div className="mt-2 text-sm text-stone-900 leading-snug line-clamp-2">
        {ticket.title}
      </div>

      {/* Hover-reveal `→` arrow at the right edge — matches editorial language elsewhere */}
      <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-stone-400 opacity-0 group-hover:opacity-100 group-hover:right-3 transition-all duration-200 pointer-events-none">
        →
      </span>

      {/* Sequence Hint (when present) — parallel-safe / recommended-after / blocked-by */}
      {ticket.hint && (
        <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest">
          <span className={`inline-block h-1 w-1 rounded-full ${hintDot(ticket.hint.kind)}`} />
          <span className={hintText(ticket.hint.kind)}>
            {hintLabel(ticket.hint.kind)} #{ticket.hint.ticket.replace("T-", "")}
          </span>
        </div>
      )}

      {/* Bottom row — reporter + age */}
      <div className="mt-3 flex items-baseline justify-between font-mono text-[10px] text-stone-500">
        <span>{ticket.reporter}</span>
        <span>{ticket.age}</span>
      </div>
    </div>
  );
}

function hintDot(kind: SequenceHint["kind"]): string {
  if (kind === "parallel-safe-with") return "bg-emerald-500";
  if (kind === "recommended-after") return "bg-amber-500";
  return "bg-rose-500"; // blocked-by
}
function hintText(kind: SequenceHint["kind"]): string {
  if (kind === "parallel-safe-with") return "text-emerald-700";
  if (kind === "recommended-after") return "text-amber-700";
  return "text-rose-700"; // blocked-by
}
function hintLabel(kind: SequenceHint["kind"]): string {
  if (kind === "parallel-safe-with") return "parallel-safe with";
  if (kind === "recommended-after") return "after";
  return "blocked by"; // blocked-by
}

function FilterChip({ label }: { label: string }) {
  return (
    <button className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-full transition">
      {label} <span className="text-stone-400 ml-1">any</span>
    </button>
  );
}

function stateDotG(state: string): string {
  if (state === "shipped") return "bg-emerald-500";
  if (state === "failed") return "bg-rose-500";
  if (state === "review-ready") return "bg-amber-500";
  if (state === "in-progress") return "bg-amber-400";
  if (state === "backlog") return "bg-stone-400";
  if (state === "triage") return "bg-sky-400";
  return "bg-stone-300";
}
