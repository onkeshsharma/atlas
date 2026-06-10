/**
 * Kit — TimelineRail (activity) + DateGutterTimeline (changelog form).
 *
 * TimelineRail ported from design/variants/variant-e-editorial-feed-first.tsx:389–441.
 * DateGutterTimeline ported from variant-nn-changelog.tsx:131–154 (§4-M14
 * 120px date gutter). Governing canon: §3.3 — "Activity timelines: w-px
 * bg-stone-200 vertical rail, dot per event in event-semantic color,
 * pulse on the newest only."
 */
import { LivePulse } from "./LivePulse";
import { DOT_TONE_CLASS, type DotTone } from "./run-state";

export type TimelineEvent = {
  who: string;
  what: string;
  at: string;
  tone: DotTone;
};

/** Enumerated halo fills for the newest-event pulse (E:421–424). */
const HALO: Record<DotTone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  sky: "bg-sky-500",
  "stone-strong": "bg-stone-700",
  stone: "bg-stone-400",
  "stone-soft": "bg-stone-300",
};

export function TimelineRail({
  events,
  pulseNewest = true,
}: {
  events: TimelineEvent[];
  /** §3.3 — pulse on the newest only; pass false for fully historical rails. */
  pulseNewest?: boolean;
}) {
  return (
    <div className="relative">
      {/* Vertical timeline line behind the dots */}
      <div className="absolute left-[3px] top-3 bottom-3 w-px bg-stone-200" />
      <ul className="relative space-y-4 text-sm">
        {events.map((a, i) => (
          <li key={`${a.who}-${a.at}-${i}`} className="flex items-baseline gap-2.5">
            <span className="relative mt-1.5 shrink-0 inline-block h-1.5 w-1.5">
              {pulseNewest && i === 0 && (
                <span
                  className={`absolute -inset-1 rounded-full ${HALO[a.tone]} opacity-40 animate-ping`}
                />
              )}
              <span
                className={`relative inline-block h-1.5 w-1.5 rounded-full ${DOT_TONE_CLASS[a.tone]}`}
              />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-stone-700 leading-snug">
                <span className="font-medium text-stone-900">{a.who}</span> {a.what}
              </div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                {a.at}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type DateGutterEntry = {
  /** mono anchor in the gutter — version number, date heading, etc. */
  anchor: string;
  date: string;
  /** emerald "current" pulse under the anchor (NN:145–153). */
  current?: boolean;
  children: React.ReactNode;
};

/** §4-M14 — `[120px_1fr]` date-gutter timeline (NN:131–154). */
export function DateGutterTimeline({ entries }: { entries: DateGutterEntry[] }) {
  return (
    <div className="space-y-20">
      {entries.map((e) => (
        <article key={e.anchor} className="grid grid-cols-[120px_1fr] gap-10 items-baseline">
          <div>
            <div className="font-mono text-sm font-medium text-stone-900">{e.anchor}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
              {e.date}
            </div>
            {e.current && (
              <div className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                <LivePulse color="emerald" />
                current
              </div>
            )}
          </div>
          <div>{e.children}</div>
        </article>
      ))}
    </div>
  );
}
