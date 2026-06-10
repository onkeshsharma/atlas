/**
 * Kit — Tooltip: CSS-only group-hover mono tooltip.
 *
 * Ported from design/variants/variant-e-editorial-feed-first.tsx:62–65
 * (sidebar, right) and variant-f-ticket-detail.tsx:294–300 (track node,
 * top). Governing canon: §2.10 — hover is CSS-only, no client JS.
 */

const POSITION: Record<"right" | "top", string> = {
  right: "left-full ml-3 top-1/2 -translate-y-1/2",
  top: "left-1/2 -translate-x-1/2 -top-9",
};

export function Tooltip({
  label,
  meta,
  side = "top",
  children,
}: {
  label: React.ReactNode;
  /** secondary part of the label, rendered text-stone-400 (§2.10). */
  meta?: React.ReactNode;
  side?: "right" | "top";
  children: React.ReactNode;
}) {
  return (
    <span className="relative group inline-flex">
      {children}
      <span
        className={`absolute ${POSITION[side]} whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-stone-50 opacity-0 group-hover:opacity-100 pointer-events-none transition shadow-md z-20`}
      >
        {label}
        {meta !== undefined && <span className="text-stone-400"> · {meta}</span>}
      </span>
    </span>
  );
}
