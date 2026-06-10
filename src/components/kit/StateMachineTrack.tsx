/**
 * Kit — StateMachineTrack + GateTrack: lifecycle rails.
 *
 * StateMachineTrack ported from design/variants/variant-f-ticket-detail.tsx:264–318
 * (amber), variant-k-job.tsx:233–267 (rose), variant-v-shipped.tsx:278–321
 * (emerald). GateTrack ported from variant-rr-enginerun.tsx:153–188.
 * Governing canon: §2.8 (+§2.10 tooltips, §2.7 track-node pulse form).
 */

export type TrackTone = "amber" | "rose" | "emerald";
export type TrackStep = {
  key: string;
  label: string;
  /** timestamp shown in the hover tooltip; null/undefined reads "pending". */
  at?: string | null;
  status: "done" | "current" | "pending";
};

/** Enumerated per tone — classes are never string-built (Tailwind-safe). */
const TONE = {
  amber: {
    halo: "bg-amber-400/40",
    dot: "bg-amber-500",
    ring: "border-amber-500/50",
    axis: "text-amber-600",
  },
  rose: {
    halo: "bg-rose-400/40",
    dot: "bg-rose-500",
    ring: "border-rose-500/50",
    axis: "text-rose-600",
  },
  emerald: {
    halo: "bg-emerald-400/40",
    dot: "bg-emerald-500",
    ring: "border-emerald-500/50",
    axis: "text-emerald-600",
  },
} as const;

export function StateMachineTrack({
  steps,
  tone = "amber",
}: {
  steps: TrackStep[];
  tone?: TrackTone;
}) {
  const t = TONE[tone];
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1.5 flex-1">
            <div className="relative group">
              {/* Pulse halo — only on "you are here" (§2.7 track-node form) */}
              {s.status === "current" && (
                <span className={`absolute inset-[-4px] rounded-full animate-ping ${t.halo}`} />
              )}
              <span
                className={`relative h-1.5 w-1.5 rounded-full block ${
                  s.status === "current"
                    ? t.dot
                    : s.status === "done"
                      ? "bg-stone-900"
                      : "bg-stone-300"
                }`}
              >
                {s.status === "current" && (
                  <span className={`absolute inset-[-3px] rounded-full border ${t.ring}`} />
                )}
              </span>
              {/* Hover tooltip with timestamp (§2.10) */}
              <span className="absolute left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-stone-50 opacity-0 group-hover:opacity-100 pointer-events-none transition shadow-md z-20">
                {s.label}
                <span className="text-stone-400"> · {s.at ?? "pending"}</span>
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={`h-px flex-1 ${s.status === "done" ? "bg-stone-900" : "bg-stone-300"}`}
              />
            )}
          </div>
        ))}
      </div>
      {/* mono-micro axis labels — current one in the semantic color (F:312–318) */}
      <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-widest text-stone-400">
        {steps.map((s) => (
          <span key={s.key} className={s.status === "current" ? t.axis : undefined}>
            {s.label.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

export type Gate = {
  name: string;
  state: "done" | "active" | "pending";
};

/**
 * §2.8 gate-progress form for live Runs — dot + partially filled
 * connector (RR:153–188).
 */
export function GateTrack({ gates }: { gates: Gate[] }) {
  return (
    <ol className={`grid gap-2 ${GATE_COLS[Math.min(gates.length, 8)] ?? "grid-cols-7"}`}>
      {gates.map((g, i) => (
        <li key={g.name} className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2 w-full">
            <span
              className={`relative inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                g.state === "done"
                  ? "bg-emerald-500"
                  : g.state === "active"
                    ? "bg-amber-500"
                    : "bg-stone-300"
              }`}
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
            <div className="text-xs text-stone-900 font-medium leading-tight">{g.name}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

const GATE_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
  8: "grid-cols-8",
};
