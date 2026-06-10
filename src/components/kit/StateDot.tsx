/**
 * Kit — StateDot + RunStateDot + StateWord.
 *
 * Ported from design/variants/variant-e-editorial-feed-first.tsx:531–546
 * (state census) and variant-g-kanban.tsx:288 (h-1 meta dot).
 * Governing canon: §2.6 (size scale), §1.1 (one color = one meaning),
 * §3.3 (Run-state vocabulary).
 */
import { LivePulse, type PulseColor } from "./LivePulse";
import {
  DOT_TONE_CLASS,
  runStateDotTone,
  runStateLabelClass,
  runStateLabelText,
  runStatePulses,
  type DotTone,
  type RunState,
  type StateContext,
} from "./run-state";

/** §2.6 — the four sanctioned dot sizes, by context. */
export type DotSize = "1" | "1.5" | "2" | "2.5";

const SIZE_CLASS: Record<DotSize, string> = {
  "1": "h-1 w-1", //       dense meta lines (G:288, E:213)
  "1.5": "h-1.5 w-1.5", // standard (E:267)
  "2": "h-2 w-2", //       state hero in rails; avatar presence (F:257, WW:180)
  "2.5": "h-2.5 w-2.5", // legend/reference + oversized avatars (VV:227, QQ:288)
};

export function StateDot({
  tone,
  size = "1.5",
  ring = false,
}: {
  tone: DotTone;
  size?: DotSize;
  /** §2.6 — presence dots on avatars carry `ring-2 ring-white` (WW:180). */
  ring?: boolean;
}) {
  return (
    <span
      className={`inline-block rounded-full shrink-0 ${SIZE_CLASS[size]} ${
        DOT_TONE_CLASS[tone]
      }${ring ? " ring-2 ring-white" : ""}`}
    />
  );
}

const PULSE_COLOR: Partial<Record<DotTone, PulseColor>> = {
  emerald: "emerald",
  amber: "amber",
  rose: "rose",
  "stone-strong": "stone",
};

/**
 * §3.3 — the dot for a Run state in a given context. Pulses only where
 * the canon's pulse column says so (needs-input always; running in live
 * contexts only — E10 + kanban-calm).
 */
export function RunStateDot({
  state,
  context = "list",
  size = "1.5",
}: {
  state: RunState;
  context?: StateContext;
  size?: DotSize;
}) {
  const tone = runStateDotTone(state);
  if (runStatePulses(state, context)) {
    return <LivePulse color={PULSE_COLOR[tone] ?? "amber"} size={size === "2" ? "2" : "1.5"} />;
  }
  return <StateDot tone={tone} size={size} />;
}

/** §3.3 — the colored state word for meta lines (E:275, E:531–537). */
export function StateWord({ state }: { state: RunState }) {
  return <span className={runStateLabelClass(state)}>{runStateLabelText(state)}</span>;
}
