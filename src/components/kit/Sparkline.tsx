/**
 * Kit — Sparkline / WeekBars / UptimeStrip: ink-on-paper amber charts.
 *
 * Sparkline ported from design/variants/variant-e-editorial-feed-first.tsx:222–237;
 * WeekBars from :324–350 (stacked rose negatives per variant-oo-insights.tsx:143–171);
 * UptimeStrip from variant-mm-status.tsx:153–184. Governing canon: §2.19 —
 * charts are ink-on-paper amber, never multi-hue; negative series rose-400/80;
 * uptime strips emerald-500/70 with rose/amber exceptions.
 */

/** Inline 7-day activity sparkline with mono `7d` tag (E:222–237). */
export function Sparkline({
  data,
  tag = "7d",
}: {
  data: number[];
  tag?: string;
}) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-5">
      {data.map((h, i) => (
        <div
          key={i}
          className="w-1 bg-amber-400/70 group-hover:bg-amber-500 transition-colors rounded-sm"
          style={{ height: `${(h / max) * 100}%` }}
        />
      ))}
      <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-stone-400 self-center">
        {tag}
      </span>
    </div>
  );
}

export type WeekBar = {
  /** mono-micro axis label — "M", "w1"… */
  label: string;
  value: number;
  /** stacked negative share, rendered rose-400/80 from the bottom (OO:152–157). */
  negative?: number;
};

/**
 * M16 axis: `size` — "rail" is E:324–350's This-week chart; "figure" is
 * OO:131–171's main-column throughput figure (taller track, gap-1.5
 * columns, gap-2 inside). Same primitive, scaled to context (§2.19).
 */
const WEEKBAR_SIZE = {
  rail: { row: "gap-1 h-14", column: "gap-1.5", track: "h-9" },
  figure: { row: "gap-1.5 h-32", column: "gap-2", track: "h-24" },
} as const;

/** Weekly bar chart — current period amber-500, others amber-400/60 (E:324–350). */
export function WeekBars({
  bars,
  currentIndex,
  max,
  size = "rail",
}: {
  bars: WeekBar[];
  currentIndex?: number;
  max?: number;
  size?: keyof typeof WEEKBAR_SIZE;
}) {
  const top = max ?? Math.max(...bars.map((b) => b.value + (b.negative ?? 0)), 1);
  const s = WEEKBAR_SIZE[size];
  return (
    <div className={`flex items-end ${s.row}`}>
      {bars.map((b, i) => {
        const isCurrent = i === currentIndex;
        const total = b.value + (b.negative ?? 0);
        const negativePct = total > 0 ? ((b.negative ?? 0) / total) * 100 : 0;
        return (
          <div key={i} className={`flex-1 flex flex-col items-center ${s.column}`}>
            {/* canon §2.19/E12: definite-height bar track — the variants'
                %-in-auto-flex collapses bars to 0 (prototype CSS bug) */}
            <div className={`w-full ${s.track} flex items-end`}>
              <div
                className="w-full relative rounded-t-sm overflow-hidden"
                // a zero week draws NO bar on the figure scale — OO:145's
                // max(pct, 5) floor would invent a ship where none landed.
                style={{
                  height:
                    size === "figure" && total === 0
                      ? "0%"
                      : `${Math.max((total / top) * 100, 4)}%`,
                }}
              >
              <div
                className={`absolute inset-0 ${isCurrent ? "bg-amber-500" : "bg-amber-400/60"}`}
              />
                {(b.negative ?? 0) > 0 && (
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-rose-400/80"
                    style={{ height: `${negativePct}%` }}
                  />
                )}
              </div>
            </div>
            <span
              className={`font-mono text-[9px] uppercase tracking-widest ${
                isCurrent ? "text-amber-600 font-bold" : "text-stone-400"
              }`}
            >
              {b.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export type UptimeDay = "ok" | "degraded" | "down";

const UPTIME_CELL: Record<UptimeDay, string> = {
  ok: "bg-emerald-500/70 hover:bg-emerald-500 transition-colors",
  degraded: "bg-amber-400",
  down: "bg-rose-400",
};

/** 90-day uptime/segment strip with mono-micro axis (MM:153–184). */
export function UptimeStrip({
  days,
  startLabel,
  endLabel,
}: {
  days: UptimeDay[];
  startLabel?: string;
  endLabel?: string;
}) {
  return (
    <div>
      <div className="flex items-end gap-px h-4">
        {days.map((d, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm ${UPTIME_CELL[d]}`}
            style={{ minWidth: "2px", height: "100%" }}
          />
        ))}
      </div>
      {(startLabel || endLabel) && (
        <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-widest text-stone-400">
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      )}
    </div>
  );
}
