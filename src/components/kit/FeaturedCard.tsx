/**
 * Kit — FeaturedCard + DocFigure: the one sanctioned card.
 *
 * Ported from design/variants/variant-e-editorial-feed-first.tsx:355–377
 * ("Ready to ship" rail card, p-5) and variant-f-ticket-detail.tsx:212
 * (Brief preview prose panel, p-6); DocFigure from variant-ii-empty.tsx:410–421.
 * Governing canon: §2.4 — seven sanctioned contexts only; the
 * prose-vs-action split is the padding prop, not two components
 * (M2 handoff note). Everything else is dividers (register §4 / E3).
 */

export function FeaturedCard({
  padding = "5",
  children,
}: {
  /** §2.4 — p-5 action/rail cards · p-6 prose-bearing cards. */
  padding?: "5" | "6";
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl bg-white/70 border border-stone-200/80 ${
        padding === "6" ? "p-6" : "p-5"
      }`}
    >
      {children}
    </section>
  );
}

/** §2.4 context 3 — doc figures with mono italic figcaption (II:410–421). */
export function DocFigure({
  caption,
  minHeight = false,
  children,
}: {
  caption: string;
  /** min-h-[200px] centring frame for full-size figures (II:412–414). */
  minHeight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <figure>
      <div
        className={`rounded-2xl border border-stone-200 bg-white p-8 ${
          minHeight ? "min-h-[200px] " : ""
        }flex flex-col justify-center`}
      >
        {children}
      </div>
      <figcaption className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest italic text-stone-400">
        {caption}
      </figcaption>
    </figure>
  );
}
