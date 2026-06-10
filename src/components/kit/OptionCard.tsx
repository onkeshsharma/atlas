/**
 * Kit — OptionCard: big selectable choices / triage actions.
 *
 * Ported from design/variants/variant-i-triage.tsx:210–254 (ActionButton).
 * Governing canon: §2.13 — primary = stone-900 fill; danger = default
 * chrome whose text/border turn rose on hover; may embed a Kbd.
 */
import { Kbd } from "./Kbd";

export function OptionCard({
  kind = "default",
  kbd,
  label,
  description,
  onClick,
}: {
  kind?: "primary" | "default" | "danger";
  /** keyboard shortcut chip (I:242–246). */
  kbd?: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  onClick?: () => void;
}) {
  const tone =
    kind === "primary"
      ? "border-stone-900 bg-stone-900 text-stone-50 hover:bg-stone-700"
      : kind === "danger"
        ? "border-stone-200 bg-white text-stone-700 hover:border-rose-300 hover:text-rose-700"
        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:text-stone-900";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-start gap-1.5 rounded-2xl border p-5 text-left transition cursor-pointer ${tone}`}
    >
      <div className="flex items-center gap-3">
        {kbd &&
          (kind === "danger" ? (
            // I:230–234 — the danger card's kbd shifts rose with the card on hover.
            <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded font-mono text-xs uppercase border bg-stone-100 text-stone-700 border-stone-200 group-hover:bg-rose-50 group-hover:text-rose-700 group-hover:border-rose-200">
              {kbd}
            </kbd>
          ) : (
            <Kbd size="large" onDark={kind === "primary"}>
              {kbd}
            </Kbd>
          ))}
        <span className="font-mono text-xs uppercase tracking-widest">{label}</span>
      </div>
      {description && (
        <div
          className={`text-xs italic font-sans ${
            kind === "primary" ? "text-stone-300" : "text-stone-500"
          }`}
        >
          {description}
        </div>
      )}
    </button>
  );
}
