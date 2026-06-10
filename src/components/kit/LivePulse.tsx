/**
 * Kit — LivePulse: a pulsing state dot = "happening right now".
 *
 * Ported from design/variants/variant-e-editorial-feed-first.tsx:144–147
 * (emerald presence), variant-rr-enginerun.tsx:107–110 (amber streaming),
 * variant-zz-500.tsx:33–35 (rose outage). Track-node halo form lives in
 * StateMachineTrack (F:277). Governing canon: §2.7 — pulse only what is
 * genuinely live; a static state never pulses.
 */

export type PulseColor = "emerald" | "amber" | "rose" | "stone";

/** ghost (animate-ping) + solid dot fills — enumerated, never interpolated. */
const GHOST: Record<PulseColor, string> = {
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  stone: "bg-stone-400", // §3.3 running-in-live-context pulse
};
const DOT: Record<PulseColor, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  stone: "bg-stone-700", // running's dot is stone-700 (§3.3)
};

const SIZE: Record<"1.5" | "2", string> = {
  "1.5": "h-1.5 w-1.5",
  "2": "h-2 w-2", // state-hero scale (K:223)
};

/** §2.7 — ghost opacity 50–70 by weight. */
const WEIGHT: Record<"50" | "60" | "70", string> = {
  "50": "opacity-50",
  "60": "opacity-60",
  "70": "opacity-70",
};

export function LivePulse({
  color,
  size = "1.5",
  weight = "60",
}: {
  color: PulseColor;
  size?: "1.5" | "2";
  weight?: "50" | "60" | "70";
}) {
  return (
    <span className={`relative flex shrink-0 ${SIZE[size]}`}>
      <span
        className={`absolute inset-0 rounded-full animate-ping ${GHOST[color]} ${WEIGHT[weight]}`}
      />
      <span className={`relative inline-block rounded-full ${SIZE[size]} ${DOT[color]}`} />
    </span>
  );
}
