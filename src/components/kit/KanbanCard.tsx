/**
 * Kit — KanbanCard + ShipGroupCluster.
 *
 * Ported from design/variants/variant-g-kanban.tsx:232–319 (+hint maps
 * :322–336). Governing canon: §4-M8 (lightened card chrome — ledger E2:
 * rounded-lg, 1px stone-200, NO shadow), §3.3 kanban-calm rule (board
 * liveness is cards moving via live data, not pulsing chrome; the state
 * dot renders in "board" context), §3.6 (hover slide-in `→`).
 *
 * G:237's arbitrary inset shadow on the cluster is dropped — canon §1.3
 * (shadow scale; cards and layout chrome carry no shadow) and the §4-M8
 * recipe omit it.
 */
import { LivePulse } from "./LivePulse";
import { PillButton } from "./PillButton";
import { RunStateDot } from "./StateDot";
import type { RunState } from "./run-state";

export type SequenceHint = {
  kind: "parallel-safe-with" | "recommended-after" | "blocked-by";
  ticket: string;
};

const HINT_DOT: Record<SequenceHint["kind"], string> = {
  "parallel-safe-with": "bg-emerald-500",
  "recommended-after": "bg-amber-500",
  "blocked-by": "bg-rose-500",
};
const HINT_TEXT: Record<SequenceHint["kind"], string> = {
  "parallel-safe-with": "text-emerald-700",
  "recommended-after": "text-amber-700",
  "blocked-by": "text-rose-700",
};
const HINT_LABEL: Record<SequenceHint["kind"], string> = {
  "parallel-safe-with": "parallel-safe with",
  "recommended-after": "after",
  "blocked-by": "blocked by",
};

export function KanbanCard({
  id,
  title,
  kind,
  state,
  reporter,
  age,
  hint,
  href,
}: {
  id: string;
  title: string;
  kind: "bug" | "enhancement";
  state: RunState;
  reporter: string;
  age: string;
  hint?: SequenceHint;
  href?: string;
}) {
  const Tag = href ? "a" : "div";
  return (
    <Tag
      href={href}
      className="relative block rounded-lg border border-stone-200 bg-white p-3 cursor-pointer hover:border-stone-300 transition group"
    >
      {/* Top row — kind label + ID + state dot (board context: calm) */}
      <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-stone-400">
        <span>{kind === "bug" ? "BUG" : "ENH"}</span>
        <span className="flex items-center gap-1.5">
          <RunStateDot state={state} context="board" size="1" />
          {id}
        </span>
      </div>

      <div className="mt-2 text-sm text-stone-900 leading-snug line-clamp-2">{title}</div>

      {/* Hover-reveal slide-in `→` (G:299–301, §3.6) */}
      <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-stone-400 opacity-0 group-hover:opacity-100 group-hover:right-3 transition-all duration-200 pointer-events-none">
        →
      </span>

      {hint && (
        <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest">
          <span className={`inline-block h-1 w-1 rounded-full ${HINT_DOT[hint.kind]}`} />
          <span className={HINT_TEXT[hint.kind]}>
            {HINT_LABEL[hint.kind]} #{hint.ticket.replace("T-", "")}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-baseline justify-between font-mono text-[10px] text-stone-500">
        <span>{reporter}</span>
        <span>{age}</span>
      </div>
    </Tag>
  );
}

/** §4-M8 — the parallel-safe Ship Group cluster (G:232–258). */
export function ShipGroupCluster({
  count,
  onShip,
  children,
}: {
  count: number;
  onShip?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-emerald-500 p-2.5 bg-emerald-100/60 space-y-2">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <LivePulse color="emerald" weight="70" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-800 font-medium">
            Parallel-safe · {count}
          </span>
        </div>
        {/* §3.4 — the inline emerald ship pill */}
        <PillButton kind="ship" size="xs" onClick={onShip} arrow={false}>
          Ship {count} →
        </PillButton>
      </div>
      {children}
    </div>
  );
}
