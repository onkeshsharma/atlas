/**
 * Kit — Kbd: keyboard-key chip.
 *
 * Ported from design/variants/variant-y-palette.tsx:147–152 (standard),
 * variant-i-triage.tsx:242–246 (large + on-dark). Governing canon: §2.14 —
 * stone-100 standard (VV:326 / UU:190 white chips are drift, ledger E7);
 * on stone-900 surfaces: stone-700 fill.
 */

export function Kbd({
  size = "base",
  onDark = false,
  children,
}: {
  size?: "base" | "large";
  /** §2.14 — chips on stone-900 surfaces (I:231). */
  onDark?: boolean;
  children: React.ReactNode;
}) {
  const sizeClasses =
    size === "large"
      ? "min-w-[24px] h-6 px-2 text-xs"
      : "min-w-[20px] h-5 px-1.5 text-[10px]";
  const toneClasses = onDark
    ? "bg-stone-700 text-stone-100 border-stone-600"
    : "bg-stone-100 text-stone-700 border-stone-200";
  return (
    <kbd
      className={`inline-flex items-center justify-center rounded font-mono uppercase border ${sizeClasses} ${toneClasses}`}
    >
      {children}
    </kbd>
  );
}
