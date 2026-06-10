/**
 * Kit — MonoSectionLabel (+ rule-row form).
 *
 * Ported from design/variants/variant-c-editorial.tsx:71–76 (rule-row) and
 * variant-e-editorial-feed-first.tsx:297 (rail standalone), :381 (LivePulse
 * prefix), :156–158 (static dot prefix). Governing canon: §2.5 —
 * `tracking-[0.25em]` is reserved for section labels; all other mono uses
 * `tracking-widest`.
 */
import { LivePulse, type PulseColor } from "./LivePulse";
import { StateDot } from "./StateDot";
import type { DotTone } from "./run-state";

const LABEL = "text-xs font-mono uppercase tracking-[0.25em] text-stone-500";

export function MonoSectionLabel({
  children,
  rule = false,
  count,
  action,
  live,
  dot,
}: {
  children: React.ReactNode;
  /** main-column rule-row (border-b + right slot, C:71–76); rails stand alone (E:297). */
  rule?: boolean;
  /** right-aligned mono count (C-style rule-row). */
  count?: string | number;
  /** right-aligned ghost link / action node. */
  action?: React.ReactNode;
  /** live sections prefix a LivePulse dot (E:381). */
  live?: PulseColor;
  /** static dot prefix — e.g. the amber AI-digest kicker (E:156–158). */
  dot?: DotTone;
}) {
  const hasPrefix = Boolean(live || dot);
  const content = hasPrefix ? (
    <>
      {live ? <LivePulse color={live} /> : dot ? <StateDot tone={dot} /> : null}
      {children}
    </>
  ) : (
    children
  );

  if (!rule) {
    return (
      <div className={hasPrefix ? `flex items-center gap-2 ${LABEL}` : LABEL}>{content}</div>
    );
  }

  return (
    <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
      <h2 className={hasPrefix ? `flex items-center gap-2 ${LABEL}` : LABEL}>{content}</h2>
      {count !== undefined && <span className="font-mono text-xs text-stone-400">{count}</span>}
      {action}
    </div>
  );
}
