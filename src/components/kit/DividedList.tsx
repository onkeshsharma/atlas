/**
 * Kit — DividedList + ListRow: the default body for any collection.
 *
 * Ported from design/variants/variant-c-editorial.tsx:77–131 (project rows)
 * and variant-e-editorial-feed-first.tsx:248–286 (indexed feed rows with
 * state dot + capped live region). Governing canon: §2.3 (no card chrome
 * on list rows — ever), §3.3 (state vocabulary), §3.5 (capped live region:
 * Today's Recent feed only at list scale).
 */
import { RunStateDot, StateDot } from "./StateDot";
import type { DotTone, RunState, StateContext } from "./run-state";

export function DividedList({
  children,
  ordered = false,
  /**
   * §3.5 — capped live region (max-h-[440px], 80px fade), sanctioned for
   * Today's Recent feed. Static lists never use it.
   */
  capped = false,
}: {
  children?: React.ReactNode;
  ordered?: boolean;
  capped?: boolean;
}) {
  const className = `divide-y divide-stone-200${
    capped
      ? " max-h-[440px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,black_calc(100%-80px),transparent_100%)]"
      : ""
  }`;
  return ordered ? <ol className={className}>{children}</ol> : <ul className={className}>{children}</ul>;
}

export function ListRow({
  index,
  state,
  stateContext = "list",
  dotTone,
  title,
  meta,
  right,
  arrow = false,
  href,
}: {
  /** mono index column — "01", "02"… (40px gutter, E:259–263). */
  index?: string;
  /** leading §3.3 state dot on the title line (E:265–271). */
  state?: RunState;
  stateContext?: StateContext;
  /**
   * non-Run rows (M6 — ticket feed rows): a plain §2.6 dot by tone,
   * never pulsing. §2.3's dot law is generic — "state appears as a
   * leading h-1.5 w-1.5 dot plus a colored mono state word" (E:256–284);
   * the Run-typed `state` prop stays the path for Run rows.
   */
  dotTone?: DotTone;
  title: React.ReactNode;
  /** secondary line — text-sm text-stone-500, `·`-separated (E:273). */
  meta?: React.ReactNode;
  /** right column — timestamp or other mono meta (E:280). */
  right?: React.ReactNode;
  /** group-hover `→` affordance instead of static right meta (C:92). */
  arrow?: boolean;
  href?: string;
}) {
  const cols = index ? "grid-cols-[40px_1fr_auto]" : "grid-cols-[1fr_auto]";
  const body = (
    <>
      {index && <span className="font-mono text-xs text-stone-400">{index}</span>}
      <div>
        <div className="flex items-baseline gap-2.5 text-lg tracking-tight">
          {state ? (
            <span className="mt-2 shrink-0 inline-flex">
              <RunStateDot state={state} context={stateContext} />
            </span>
          ) : dotTone ? (
            <span className="mt-2 shrink-0 inline-flex">
              <StateDot tone={dotTone} />
            </span>
          ) : null}
          <span>{title}</span>
        </div>
        {meta && (
          <div className={`mt-1 ${state || dotTone ? "ml-4 " : ""}text-sm text-stone-500`}>
            {meta}
          </div>
        )}
      </div>
      {arrow ? (
        <span className="font-mono text-xs text-stone-400 group-hover:text-stone-900 transition">
          →
        </span>
      ) : (
        right && (
          <span className="font-mono text-xs text-stone-400 group-hover:text-stone-900 transition whitespace-nowrap">
            {right}
          </span>
        )
      )}
    </>
  );

  if (href) {
    return (
      <li>
        <a href={href} className={`py-6 grid ${cols} items-baseline gap-6 group cursor-pointer`}>
          {body}
        </a>
      </li>
    );
  }
  return <li className={`py-6 grid ${cols} items-baseline gap-6 group`}>{body}</li>;
}
