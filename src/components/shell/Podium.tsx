/**
 * Phase 1 — the Podium: a slim, always-present live status strip so the Owner
 * knows what's happening from EVERY route, not just Today (kills the
 * page-scoped-awareness gap). Mounted in the app shell; it stays live via the
 * pages' existing LiveRefresh — router.refresh() re-renders the layout, so
 * these numerals re-read on every outbox event without a second SSE stream.
 *
 * Net-new chrome (no variant). Built to the canon: mono micro-labels, StateDot
 * / LivePulse (§2.6 sizes, §2.7 — pulse ONLY what is genuinely live), one
 * color = one meaning (§1.1: emerald = healthy/live, amber = the Owner is on
 * the hook, stone = idle). Athena's status is NOT duplicated here — it lives in
 * the AfkChip (ADR-0007 §6); the Podium is runs · needs-you · bridge.
 */
import Link from "next/link";

import { LivePulse, StateDot } from "@/src/components/kit";
import type { BridgePresence } from "@/src/domain/bridge/status";

export function Podium({
  running,
  queued,
  needsYou,
  bridge,
}: {
  running: number;
  queued: number;
  needsYou: number;
  bridge: BridgePresence["status"];
}) {
  return (
    <nav
      aria-label="Live status"
      className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2"
    >
      <div className="flex items-center gap-3.5 rounded-full border border-stone-200 bg-white/90 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-stone-500 shadow-sm backdrop-blur-sm">
        {/* Running — pulses only while genuinely live (§2.7). */}
        <Link
          href="/activity"
          className="inline-flex items-center gap-1.5 hover:text-stone-900"
        >
          {running > 0 ? <LivePulse color="stone" /> : <StateDot tone="stone-soft" />}
          <span className={running > 0 ? "text-stone-900" : undefined}>
            {running} running
          </span>
          {queued > 0 && <span className="text-stone-400">· {queued} queued</span>}
        </Link>

        <span aria-hidden className="text-stone-300">
          ·
        </span>

        {/* Needs you — amber when the Owner is on the hook (a Question or a Review). */}
        <Link
          href="/inbox"
          className="inline-flex items-center gap-1.5 hover:text-stone-900"
        >
          <StateDot tone={needsYou > 0 ? "amber" : "stone-soft"} />
          <span className={needsYou > 0 ? "text-amber-700" : undefined}>
            {needsYou} needs you
          </span>
        </Link>

        <span aria-hidden className="text-stone-300">
          ·
        </span>

        {/* Bridge presence — healthy/offline/none straight off the heartbeat. */}
        <Link
          href="/settings/bridges"
          className="inline-flex items-center gap-1.5 hover:text-stone-900"
        >
          <StateDot
            tone={bridge === "healthy" ? "emerald" : bridge === "offline" ? "amber" : "stone-soft"}
          />
          <span>
            bridge {bridge === "healthy" ? "live" : bridge === "offline" ? "offline" : "none"}
          </span>
        </Link>
      </div>
    </nav>
  );
}
