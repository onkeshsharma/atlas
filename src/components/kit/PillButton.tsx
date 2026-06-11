/**
 * Kit — PillButton: the six-kind button family.
 *
 * Ported from design/variants/variant-xx-tokens.tsx:262 (primary),
 * variant-o-project.tsx:357–361 (ship, w-full), variant-jj-delete.tsx:133–139
 * (danger-confirm), variant-l-signin.tsx:93 (secondary),
 * variant-bb-account.tsx:341 (danger-secondary), variant-e-editorial-feed-first.tsx:443
 * (ghost). Governing canon: §2.9, §3.4 + ledger E1 (all labels mono
 * uppercase) and E4 (ship CTA is emerald-600, overruling E:368's stone-900).
 *
 * Dot-in-button rule (§2.9): w-full primaries carry a leading dot in the
 * ACTION's semantic color (amber dispatch · emerald ship) + trailing `→`
 * in a muted tint. Inline/small pills carry no dot.
 */

export type PillKind =
  | "primary"
  | "ship"
  | "danger-confirm"
  | "secondary"
  | "danger-secondary"
  | "ghost";

const KIND: Record<Exclude<PillKind, "ghost">, string> = {
  // M8 axis: honest-disabled M9 CTAs (dispatch/ship render per spec,
  // unwired — charter hard wall). Recipe is JJ:134–139's disabled form.
  primary:
    "text-stone-50 bg-stone-900 hover:bg-stone-700 disabled:bg-stone-300 disabled:cursor-not-allowed",
  // canon §3.4 / ledger E4: the action that lands code is emerald-600.
  // §2.9 — ship carries shadow-sm at every scale (G:249, O:357).
  ship: "text-stone-50 bg-emerald-600 hover:bg-emerald-700 shadow-sm",
  "danger-confirm":
    "text-stone-50 bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 disabled:cursor-not-allowed",
  secondary: "text-stone-700 border border-stone-200 hover:border-stone-300 bg-white",
  "danger-secondary":
    "text-rose-700 border border-rose-200 hover:border-rose-300 hover:bg-rose-50 bg-white",
};

/** §2.9 — text-[10px]/[9px] sanctioned at small sizes; page scale per JJ:134. */
const SIZE: Record<"inline" | "page" | "sm" | "xs", string> = {
  inline: "text-xs px-4 py-2",
  page: "text-xs px-5 py-3 shadow-sm",
  sm: "text-[10px] px-3 py-1.5",
  xs: "text-[9px] px-2.5 py-1",
};

const FULL_DOT: Record<"amber" | "emerald", string> = {
  amber: "bg-amber-400", // dispatch/start (F:356)
  emerald: "bg-emerald-400", // emerald action on stone-900 (E:369)
};

export function PillButton({
  kind = "primary",
  size = "inline",
  fullWidth = false,
  dot = "amber",
  arrow,
  ghostDanger = false,
  disabled,
  type = "button",
  onClick,
  children,
}: {
  kind?: PillKind;
  size?: "inline" | "page" | "sm" | "xs";
  /** w-full form: px-4 py-3 + shadow-sm + leading dot + trailing `→` (§2.9). */
  fullWidth?: boolean;
  /**
   * the leading dot's semantic color on w-full PRIMARY pills (§2.9).
   * "none" — the §2.9 dot rule names PRIMARIES; w-full secondaries
   * (L:93 "Continue with Google") carry no dot. (M5 kit axis.)
   */
  dot?: "amber" | "emerald" | "none";
  /** trailing glyph — defaults to `→` on w-full pills, none inline. */
  arrow?: boolean;
  /** ghost kind only — danger links turn rose on hover (§2.9, XX:187). */
  ghostDanger?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const mono = "font-mono uppercase tracking-widest transition";

  if (kind === "ghost") {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${mono} text-[10px] cursor-pointer ${
          ghostDanger
            ? "text-stone-500 hover:text-rose-700"
            : "text-stone-700 hover:text-amber-600"
        }`}
      >
        {children}
      </button>
    );
  }

  const showArrow = arrow ?? fullWidth;
  // §2.9 — ship's w-full dot is emerald-300 with the arrow in emerald-100 (O:358–360).
  const dotClass = kind === "ship" ? "bg-emerald-300" : dot === "none" ? null : FULL_DOT[dot];
  const arrowClass = kind === "ship" ? "text-emerald-100" : kind === "danger-confirm" ? "text-rose-200" : "text-stone-400";
  // §2.9 dot rule names PRIMARIES (ship's dot is its own recipe); §1.3
  // pins shadow-sm to the L:80-shape primary CTA — secondary w-full
  // (L:93) is flat and dotless. (M5)
  const showDot = fullWidth && (kind === "primary" || kind === "ship") && dotClass !== null;
  const fullShadow = kind === "primary" || kind === "danger-confirm" ? " shadow-sm" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${mono} rounded-full ${KIND[kind]} ${
        fullWidth
          ? `w-full text-xs px-4 py-3 inline-flex items-center justify-center gap-2${fullShadow}`
          : `${SIZE[size]}${showArrow ? " inline-flex items-center gap-2" : ""}`
      }`}
    >
      {showDot && <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />}
      {children}
      {showArrow && <span className={arrowClass}>→</span>}
    </button>
  );
}
