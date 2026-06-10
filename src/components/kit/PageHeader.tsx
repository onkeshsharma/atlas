/**
 * Kit — PageHeader (cockpit + routed) + PageTitle + SubnavLink.
 *
 * Cockpit form ported from design/variants/variant-e-editorial-feed-first.tsx:116–140
 * (day-stamp → title → hero sentence). Routed form ported from
 * variant-f-ticket-detail.tsx:147–149 and variant-xx-tokens.tsx:72–96
 * (breadcrumb row + right ghost-links/subnav; sentence-title accent).
 * Governing canon: §2.2, §3.2 (horizontal mono subnav active state).
 * pt-12 (Today) / pt-8 (routed) belong to the page grid (§3.1), not here.
 */

export function PageHeader(
  props:
    | {
        kind: "cockpit";
        /** mono day-stamp, e.g. "Tuesday · May 13" (C:43). */
        dayStamp: string;
        /** single-word period title — "Today." (E:119). Never takes the accent. */
        title: string;
        /** the hero sentence (§1.2 hero-sentence step) — rendered mt-12. */
        children?: React.ReactNode;
      }
    | {
        kind: "routed";
        /** mono breadcrumb trail — "Projects · acme-website · T-247" (F:147). */
        breadcrumb: string;
        /** optional right slot: mono ghost-links / horizontal subnav (XX:76–80). */
        nav?: React.ReactNode;
        /** content below the top row — rendered mt-8 (§2.2). */
        children?: React.ReactNode;
      },
) {
  if (props.kind === "cockpit") {
    return (
      <>
        <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
          {props.dayStamp}
        </div>
        <h1 className="mt-2 text-5xl font-bold tracking-tighter">{props.title}</h1>
        {props.children && (
          <p className="mt-12 text-3xl leading-tight tracking-tight text-stone-700">
            {props.children}
          </p>
        )}
      </>
    );
  }
  return (
    <>
      <div className="flex items-baseline justify-between gap-8">
        <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
          {props.breadcrumb}
        </div>
        {props.nav && (
          <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-stone-500">
            {props.nav}
          </div>
        )}
      </div>
      {props.children && <div className="mt-8">{props.children}</div>}
    </>
  );
}

/**
 * §2.2 — page titles end with a period. Sentence-form titles may carry
 * the amber accent underline under ONE key phrase (XX:89–96); single-word
 * titles never take it. Pass the phrase via `accent` and the rest via
 * before/after text in `children`.
 */
export function PageTitle({
  children,
  accent,
  after,
  wraps = false,
}: {
  children?: React.ReactNode;
  /** the underlined key phrase — one per page max (§2.2). */
  accent?: string;
  /** text after the accent phrase (the closing period lives here). */
  after?: React.ReactNode;
  /** add leading-tight when the title wraps (F:152). */
  wraps?: boolean;
}) {
  return (
    <h1 className={`text-5xl font-bold tracking-tighter${wraps ? " leading-tight" : ""}`}>
      {children}
      {accent && (
        <span className="relative">
          {accent}
          <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-amber-500" />
        </span>
      )}
      {after}
    </h1>
  );
}

/** §3.2 — horizontal mono subnav link; active = amber border-b (XX:78). */
export function SubnavLink({
  active = false,
  href,
  children,
}: {
  active?: boolean;
  href?: string;
  children: React.ReactNode;
}) {
  const className = active
    ? "text-stone-900 cursor-pointer border-b border-amber-500 pb-0.5"
    : "hover:text-stone-900 cursor-pointer";
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
