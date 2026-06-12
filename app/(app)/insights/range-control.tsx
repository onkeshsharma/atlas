"use client";
/**
 * M16 — the OO:57–61 range segments (30d · 12w · All) made real: a §2.13
 * compact SegmentedControl driving `?range=` (the board ?density=
 * idiom — the server page re-derives everything for the new window).
 */
import { useRouter } from "next/navigation";

import { SegmentedControl } from "@/src/components/kit";
import type { InsightsRange } from "@/src/domain/insights/derive";

export function RangeControl({ range }: { range: InsightsRange }) {
  const router = useRouter();
  return (
    <SegmentedControl
      size="compact"
      options={[
        { value: "30d", label: "30d" },
        { value: "12w", label: "12w" },
        { value: "all", label: "All" },
      ]}
      value={range}
      onChange={(v) =>
        // 12w is the default window (OO's active segment) — keep the URL clean.
        router.replace(v === "12w" ? "/insights" : `/insights?range=${v}`, { scroll: false })
      }
    />
  );
}
