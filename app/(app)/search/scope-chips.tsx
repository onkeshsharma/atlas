"use client";
/**
 * M12 — the /search type-filter chips (LL:118–127), real ?type= params
 * (PRD #51 "with type filters"; the M8 board-chips precedent). Chip
 * chrome is the kit ScopeChip — canon §2.13 governs selection chips,
 * overruling LL:268–291's stone-100 fills (canon-over-variant, the M6
 * inbox / M8 board ruling).
 */
import { useRouter, useSearchParams } from "next/navigation";

import { ScopeChip } from "@/src/components/kit";
import type { SearchScope } from "@/src/domain/search/query";

export type ScopeOption = { scope: SearchScope; label: string; count: number };

export function SearchScopeChips({
  options,
  active,
}: {
  options: ScopeOption[];
  active: SearchScope;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const select = (scope: SearchScope) => {
    const next = new URLSearchParams(params);
    if (scope === "everything") next.delete("type");
    else next.set("type", scope);
    const qs = next.toString();
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false });
  };

  return (
    <div className="mt-6 flex items-center gap-2 flex-wrap">
      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
        Filter
      </span>
      {options.map((o) => (
        <ScopeChip key={o.scope} selected={o.scope === active} onClick={() => select(o.scope)}>
          {o.label} <span className={o.scope === active ? "text-stone-300" : "text-stone-500"}>{o.count}</span>
        </ScopeChip>
      ))}
    </div>
  );
}
