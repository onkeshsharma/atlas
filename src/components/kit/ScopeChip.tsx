/**
 * Kit — ScopeChip / FilterChip: round mono selection chips.
 *
 * Ported from design/variants/variant-xx-tokens.tsx:386–408.
 * Governing canon: §2.13 — selected = stone-900 fill; active filter
 * chips carry a mono `×` clear affordance (register T75).
 */

export function ScopeChip({
  selected = false,
  danger = false,
  clear = false,
  onClick,
  children,
}: {
  selected?: boolean;
  /** danger option — rose text/border (XX:401, the `*` scope). */
  danger?: boolean;
  /** selected filter chips append a mono `×` clear glyph (register T75). */
  clear?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const tone = selected
    ? "bg-stone-900 text-stone-50 border-stone-900"
    : danger
      ? "bg-white/50 text-rose-700 border-rose-200 hover:border-rose-400"
      : "bg-white/50 text-stone-700 border-stone-200 hover:border-stone-400";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border text-xs font-mono cursor-pointer transition ${tone}`}
    >
      {children}
      {selected && clear && <span className="text-stone-400"> ×</span>}
    </button>
  );
}
