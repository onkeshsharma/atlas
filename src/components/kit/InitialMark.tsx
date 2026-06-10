/**
 * Kit — InitialMark: typographic identity + presence.
 *
 * Bare mark ported from design/variants/variant-o-project.tsx:396–409
 * (member initials) / variant-e-editorial-feed-first.tsx:74–84; row
 * monogram from variant-ww-trust.tsx:176–182; oversized profile form from
 * variant-qq-profile.tsx:285–289. Governing canon: §2.18 — identity is
 * typographic; no photos, no colored avatar fills (D:62 circle is drift,
 * ledger E6). Presence dots per §2.6.
 */
import { StateDot } from "./StateDot";
import type { DotTone } from "./run-state";

export function InitialMark({
  initial,
  size = "mark",
  presence,
}: {
  initial: string;
  /**
   * mark — bare letter in an h-7 w-7 box (§2.18 standard);
   * row — h-10 w-10 stone-900 monogram for divided rows (WW:177);
   * profile — oversized h-28 w-28 text-6xl form (QQ:286).
   */
  size?: "mark" | "row" | "profile";
  /** presence dot tone — emerald online, stone-soft offline, etc. */
  presence?: DotTone;
}) {
  if (size === "profile") {
    return (
      <div className="relative inline-flex h-28 w-28 rounded-full bg-stone-900 text-stone-50 items-center justify-center text-6xl font-bold tracking-tighter leading-none">
        <span className="block leading-none -mt-2">{initial}</span>
        {presence && (
          <span className="absolute right-3 top-3 inline-flex">
            <StateDot tone={presence} size="2.5" ring />
          </span>
        )}
      </div>
    );
  }
  if (size === "row") {
    return (
      <div className="relative h-10 w-10 rounded-full bg-stone-900 text-stone-50 flex items-center justify-center text-base font-bold tracking-tighter leading-none">
        {initial}
        {presence && (
          <span className="absolute right-0 top-0 inline-flex">
            <StateDot tone={presence} size="2" ring />
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="relative h-7 w-7 flex items-center justify-center">
      <span className="text-xl font-bold tracking-tighter leading-none text-stone-900">
        {initial}
      </span>
      {presence && (
        <span className="absolute right-0 top-0 inline-flex">
          <StateDot tone={presence} size="1.5" />
        </span>
      )}
    </div>
  );
}
