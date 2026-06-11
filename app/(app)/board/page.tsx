/**
 * M8 — Board. The kanban work surface (PRD #13/#15/#26).
 *
 * Ported from design/variants/variant-g-kanban.tsx:113–277 (main rail:
 * breadcrumb+density row, title+stats, presence+stuck line, filter row,
 * the 5-column `gap-5` grid, column headers, AI-suggests line, Ship Group
 * cluster) — cards + cluster are the kit KanbanCard/ShipGroupCluster
 * (§4-M8, ledger E2). Full-bleed: kanban drops the rail (canon §3.1).
 *
 * Canon over variant:
 * - kanban-calm (§3.3, review grill): board liveness is cards moving via
 *   live data — card state dots render static (KanbanCard dotTone).
 * - chips are §2.13 ScopeChips, not G:340's stone-100 fills (M6 ruling).
 * Honest data:
 * - presence is real distinct feed actors today ("active today", the M6
 *   Today precedent) — "viewing now" isn't knowable without presence
 *   tracking nobody has built.
 * - Sequence Hints + the Ship Group cluster come from the REAL hints
 *   engine over declared edges + enrichment file sets (file-overlap
 *   knowledge until M9 supplies real diffs).
 * - the cluster's Ship pill renders per spec, unwired (ship is M9 —
 *   charter hard wall; same ruling as Today's ship CTA).
 */
import {
  EmptyState,
  KanbanCard,
  LivePulse,
  PageHeader,
  ShipGroupCluster,
  type SequenceHint,
} from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireOwner } from "@/src/domain/auth/guard";
import { actorsActiveToday } from "@/src/domain/feed/queries";
import { deriveHints, type DerivedHint } from "@/src/domain/hints/derive";
import { fileSetsFromEnrichment, toHintTickets } from "@/src/domain/hints/inputs";
import { latestCursor } from "@/src/domain/live/broker";
import { CATEGORY_COLUMNS, ticketCategory } from "@/src/domain/ticket/categories";
import { allTicketLinks, boardTickets, stuckInsight, type WorkTicket } from "@/src/domain/ticket/queries";
import { TICKET_DOT_TONE, TICKET_STATES } from "@/src/domain/ticket/states";

import { BoardFilters, DensityControl, type BoardFilter, type Density } from "./board-controls";

export const dynamic = "force-dynamic";

/** G's bare card ages ("2d", "12h") — last-touched, compact. */
function boardAge(date: Date, now = new Date()): string {
  const minutes = Math.max(1, Math.floor((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

const HINT_VALUES: SequenceHint["kind"][] = [
  "parallel-safe-with",
  "recommended-after",
  "blocked-by",
];

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOwner();
  const params = await searchParams;

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [tickets, edges, stuck, actors, cursor] = await Promise.all([
    boardTickets(),
    allTicketLinks(),
    stuckInsight(),
    actorsActiveToday(dayStart),
    latestCursor(),
  ]);

  // ── the REAL hints engine (file-overlap = enrichment until M9) ──────
  const { hints, shipGroups } = deriveHints({
    tickets: toHintTickets(tickets),
    edges,
    fileSets: fileSetsFromEnrichment(tickets),
  });

  // ── filters (real ?params; chips cycle through these values) ────────
  const density = (["c", "m", "r"].includes(String(params.density)) ? params.density : "m") as Density;
  const active: Partial<Record<BoardFilter["key"], string>> = {};
  const kindParam = typeof params.kind === "string" ? params.kind : undefined;
  const stateParam = typeof params.state === "string" ? params.state : undefined;
  const reporterParam = typeof params.reporter === "string" ? params.reporter : undefined;
  const hintParam = typeof params.hint === "string" ? params.hint : undefined;
  if (kindParam) active.kind = kindParam;
  if (stateParam) active.state = stateParam;
  if (reporterParam) active.reporter = reporterParam;
  if (hintParam) active.hint = hintParam;

  const reporters = [...new Set(tickets.map((t) => t.reporter))].sort();
  const filters: BoardFilter[] = [
    { key: "reporter", label: "Reporter", values: reporters },
    { key: "kind", label: "Kind", values: ["bug", "enhancement", "other"] },
    { key: "state", label: "State", values: [...TICKET_STATES] },
    { key: "hint", label: "Hint", values: HINT_VALUES },
  ];

  const visible = (t: WorkTicket): boolean => {
    if (kindParam && (t.kind ?? "other") !== kindParam) return false;
    if (stateParam && t.state !== stateParam) return false;
    if (reporterParam && t.reporter !== reporterParam) return false;
    if (hintParam && hints.get(t.id)?.kind !== hintParam) return false;
    return true;
  };

  // ── stats over the whole board (G:136–146) ──────────────────────────
  const ready = tickets.filter((t) => t.state === "review-ready").length;
  const failed = tickets.filter((t) => t.state === "failed").length;

  // the Review column's parallel-safe cluster = the `independent` group.
  const independent = shipGroups.find((g) => g.kind === "independent");
  const clusterIds = new Set(independent?.ticketIds ?? []);
  const byId = new Map(tickets.map((t) => [t.id, t]));
  const clusterTickets = (independent?.ticketIds ?? [])
    .map((id) => byId.get(id)!)
    .filter(visible);
  const clusterRefs = clusterTickets.map((t) => t.ref);

  const card = (t: WorkTicket) => {
    const hint = hints.get(t.id) as DerivedHint | undefined;
    return (
      <KanbanCard
        key={t.id}
        id={t.ref}
        title={t.title}
        kind={t.kind}
        dotTone={TICKET_DOT_TONE[t.state]}
        reporter={t.reporter}
        age={boardAge(t.updatedAt)}
        hint={hint ? { kind: hint.kind, ticket: hint.otherRef } : undefined}
        href={`/tickets/${t.ref}`}
        density={density === "c" ? "compact" : density === "r" ? "rich" : "medium"}
        preview={t.body ? t.body.split("\n\n")[0] : undefined}
      />
    );
  };

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      {/* Top row — breadcrumb + density (G:114–131) */}
      <PageHeader
        kind="routed"
        breadcrumb="Tickets · all projects"
        nav={<DensityControl density={density} />}
      />

      {/* Title + stats inline (G:133–147) */}
      <div className="mt-2 flex items-baseline gap-6 flex-wrap">
        <h1 className="text-5xl font-bold tracking-tighter">Tickets.</h1>
        <p className="text-base text-stone-500">
          <span className="font-mono text-stone-900">{tickets.length}</span> total ·{" "}
          <span className="font-mono text-amber-600">{ready}</span> ready ·{" "}
          <span className="font-mono text-rose-600">{failed}</span> failed
        </p>
      </div>

      {/* Presence + stuck insight (G:149–166; presence per the M6 honest-copy ruling) */}
      <div className="mt-3 flex items-baseline gap-4 flex-wrap font-mono text-[10px] uppercase tracking-widest text-stone-500">
        <span className="flex items-center gap-2">
          <LivePulse color="emerald" />
          <span>
            {actors.length} active today
          </span>
          {actors.length > 0 && (
            <span className="text-stone-400 normal-case tracking-normal font-sans text-xs italic">
              {actors.join(", ")}
            </span>
          )}
        </span>
        {stuck && (
          <>
            <span className="text-stone-300">·</span>
            <span className="normal-case tracking-normal font-sans text-xs italic text-stone-500">
              <span className="font-mono not-italic text-stone-700">{stuck.ref}</span> stuck{" "}
              <span className="font-mono not-italic">
                {stuck.days} {stuck.days === 1 ? "day" : "days"}
              </span>
            </span>
          </>
        )}
      </div>

      {/* Filter chips (G:168–180) — real ?param filters */}
      <BoardFilters filters={filters} active={active} />

      {/* Kanban — 5 Category columns (G:182–268, canon §4-M8) */}
      <div className="mt-10 grid grid-cols-5 gap-5">
        {CATEGORY_COLUMNS.map((col) => {
          const colTickets = tickets.filter(
            (t) => ticketCategory(t.state) === col.key && visible(t),
          );
          const inCluster = col.key === "review" ? clusterTickets : [];
          const ungrouped = colTickets.filter((t) => !(col.key === "review" && clusterIds.has(t.id)));

          return (
            <div key={col.key}>
              {/* Column header (G:200–215) */}
              <div className="pb-3 border-b border-stone-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${col.dot}`} />
                    <span className="font-mono text-xs uppercase tracking-[0.25em] text-stone-700">
                      {col.label}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-stone-400">
                    {colTickets.length}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {/* AI ship suggestion (G:219–229) — composed from the real group */}
                {col.key === "review" && inCluster.length >= 2 && (
                  <p className="px-1 text-xs italic text-stone-600 leading-snug">
                    <span className="font-mono not-italic text-stone-500">AI suggests:</span>{" "}
                    ship{" "}
                    {clusterRefs.map((ref, i) => (
                      <span key={ref}>
                        <span className="font-mono not-italic text-emerald-700">{ref}</span>
                        {i < clusterRefs.length - 2 ? ", " : i === clusterRefs.length - 2 ? " and " : ""}
                      </span>
                    ))}{" "}
                    together — file-sets disjoint, all review-ready.
                  </p>
                )}

                {/* Ship Group cluster (G:231–258, §4-M8) — ≥2 visible members */}
                {col.key === "review" && inCluster.length >= 2 && (
                  <ShipGroupCluster count={inCluster.length}>
                    {inCluster.map(card)}
                  </ShipGroupCluster>
                )}

                {ungrouped.map(card)}

                {colTickets.length === 0 && (
                  <div className="pt-6">
                    <EmptyState
                      shape="column"
                      goodNews={col.key === "triage" ? "That's a good thing." : undefined}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* §3.8 quiet italic close (G is full-bleed and has no rail footnote;
          one honest sentence keeps the hint provenance auditable). */}
      <p className="mt-12 text-sm italic text-stone-500">
        Cards order by last touch. Hints come from declared edges and what the Engine knows
        about file overlap.
      </p>
    </main>
  );
}
