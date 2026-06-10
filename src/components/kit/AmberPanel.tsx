/**
 * Kit — AmberPanel: the "demands action now" alarm chrome.
 *
 * Ported from design/variants/variant-xx-tokens.tsx:104–143 (show-once
 * token panel). Governing canon: §3.3 (as amended 2026-06-11) + §2.4
 * context 7 — the ONE card that may interrupt the main column; its
 * border-2 + amber fill mark it as its own species, never white, never
 * borderless.
 *
 * Multi-Run rule (review grill 2026-06-11): multiple needs-input Runs
 * share ONE panel — the kicker counts ("2 runs need your input"), one
 * §2.3 divided row per Run inside (`divide-y divide-amber-200`), one
 * pulse on the kicker dot ONLY. Panels never stack; amber stays scarce
 * at any N.
 */
import { LivePulse } from "./LivePulse";

export function AmberPanel({
  kicker,
  pulse = true,
  rows,
  children,
}: {
  /** mono kicker — counts when plural: "2 runs need your input". */
  kicker: React.ReactNode;
  /** the kicker dot is the panel's ONLY pulse (§3.3). */
  pulse?: boolean;
  /** one divided row per Run — pass `<li>` children (§2.3 rows). */
  rows?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6">
      <div className="flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-widest text-amber-800">
        {pulse ? (
          <LivePulse color="amber" />
        ) : (
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
        )}
        {kicker}
      </div>
      {children}
      {rows && <ul className="mt-4 divide-y divide-amber-200">{rows}</ul>}
    </section>
  );
}
