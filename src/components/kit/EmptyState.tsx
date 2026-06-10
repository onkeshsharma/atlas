/**
 * Kit — EmptyState: four shapes per variant II (verbatim law).
 *
 * Ported from design/variants/variant-ii-empty.tsx:105–239 (Figs 1–6).
 * Governing canon: §2.17 — one quiet sentence + at most one affordance +
 * optional italic stone-500 line when absence is good news. Never:
 * illustrations, exclamation marks, marketing copy, multiple CTAs.
 */

export type EmptyStateProps =
  | {
      /** page-level — keeps day-stamp + title + sentence + one primary pill (II:111–126). */
      shape: "page";
      dayStamp?: string;
      /** ends with a period, e.g. "Today." / "All caught up." */
      title: string;
      sentence: React.ReactNode;
      secondary?: React.ReactNode;
      /** at most ONE affordance — a PillButton or ghost link. */
      action?: React.ReactNode;
    }
  | {
      /** column-level — centered mono-micro note + italic good news (II:145–152). */
      shape: "column";
      note?: string;
      goodNews?: React.ReactNode;
    }
  | {
      /** strip-level — one italic sentence with an inline amber link (II:210–217). */
      shape: "strip";
      children?: React.ReactNode;
    }
  | {
      /** palette — mono "Nothing matches "q"." + suggestion line (II:227–239). */
      shape: "palette";
      query: string;
      suggestion?: React.ReactNode;
    };

export function EmptyState(props: EmptyStateProps) {
  switch (props.shape) {
    case "page":
      return (
        <div>
          {props.dayStamp && (
            <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
              {props.dayStamp}
            </div>
          )}
          <h3 className="mt-2 text-3xl font-bold tracking-tighter">{props.title}</h3>
          <p className="mt-5 text-lg text-stone-700 leading-relaxed">{props.sentence}</p>
          {props.secondary && (
            <p className="mt-2 text-sm text-stone-500 leading-relaxed">{props.secondary}</p>
          )}
          {props.action && <div className="mt-5">{props.action}</div>}
        </div>
      );
    case "column":
      return (
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
            {props.note ?? "Nothing here."}
          </div>
          {props.goodNews && (
            <p className="mt-2 text-sm text-stone-500 italic">{props.goodNews}</p>
          )}
        </div>
      );
    case "strip":
      return (
        <p className="text-sm italic text-stone-500 leading-relaxed">{props.children}</p>
      );
    case "palette":
      return (
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-stone-400">
            Nothing matches{" "}
            <span className="text-stone-700 normal-case tracking-normal font-mono bg-stone-100 px-1.5 py-0.5 rounded">
              {props.query}
            </span>
            .
          </div>
          {props.suggestion && (
            <p className="mt-3 text-sm text-stone-500 leading-relaxed">{props.suggestion}</p>
          )}
        </div>
      );
  }
}

/** §2.17 strip form's inline amber link (II:212–215). */
export function EmptyStateLink({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="text-amber-600 hover:underline cursor-pointer not-italic font-medium"
    >
      {children}
    </a>
  );
}
