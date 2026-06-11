"use client";
/**
 * M11 — audit filter chips (TT:259–279). Chip chrome is the kit
 * ScopeChip — canon §2.13 governs selection chips, overruling TT:263's
 * sans `font-medium` fills (canon-over-variant; the M6 inbox precedent,
 * commented per master plan §5.4). Selection is a real ?kind= param so
 * the server page filters real rows; the other params survive the hop.
 */
import { useRouter } from "next/navigation";

import { ScopeChip } from "@/src/components/kit";
import {
  AUDIT_FILTERS,
  AUDIT_FILTER_LABEL,
  type AuditFilter,
} from "@/src/domain/audit/events";

export function AuditFilterChips({
  selected,
  counts,
  carry,
}: {
  selected: AuditFilter;
  counts: Record<AuditFilter, number>;
  /** params preserved across the filter hop (q / range / actor). */
  carry: Record<string, string>;
}) {
  const router = useRouter();
  const hrefFor = (f: AuditFilter) => {
    const params = new URLSearchParams(carry);
    if (f !== "everything") params.set("kind", f);
    const qs = params.toString();
    return qs ? `/settings/audit?${qs}` : "/settings/audit";
  };
  return (
    <div className="mt-8 flex items-center gap-2 flex-wrap">
      {AUDIT_FILTERS.map((f) => (
        <ScopeChip
          key={f}
          selected={selected === f}
          onClick={() => router.push(hrefFor(f), { scroll: false })}
        >
          {AUDIT_FILTER_LABEL[f]}
          <span
            className={`ml-2 font-mono text-[10px] ${
              selected === f ? "text-stone-300" : "text-stone-400"
            }`}
          >
            {counts[f]}
          </span>
        </ScopeChip>
      ))}
    </div>
  );
}
