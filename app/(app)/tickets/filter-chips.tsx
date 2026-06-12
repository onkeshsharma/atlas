"use client";
/**
 * M13 — the T filter chips (T:186–194). Chip chrome is the kit
 * ScopeChip — canon §2.13 overrules T:391–414's stone-100 fills (the
 * M6 inbox precedent, comment per master plan §5.4). The "Waiting on
 * me" sky badge count (T:193) rides inside the chip. Selection is a
 * real ?show= param so the server page filters real rows.
 */
import { useRouter } from "next/navigation";

import { ScopeChip } from "@/src/components/kit";
import type { CollabFilter } from "@/src/domain/collab/states";

const LABEL: Record<CollabFilter, string> = {
  everything: "Everything",
  open: "Still open",
  shipped: "Shipped",
  waiting: "Waiting on me",
};

export function CollabFilterChips({
  selected,
  waitingCount,
}: {
  selected: CollabFilter;
  waitingCount: number;
}) {
  const router = useRouter();
  return (
    <div className="mt-8 flex items-center gap-2 flex-wrap">
      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
        Show
      </span>
      {(Object.keys(LABEL) as CollabFilter[]).map((f) => (
        <ScopeChip
          key={f}
          selected={selected === f}
          onClick={() =>
            router.push(f === "everything" ? "/tickets" : `/tickets?show=${f}`, {
              scroll: false,
            })
          }
        >
          {LABEL[f]}
          {f === "waiting" && waitingCount > 0 && (
            <span className={selected === "waiting" ? "text-sky-300" : "text-sky-600"}>
              {" "}
              {waitingCount}
            </span>
          )}
        </ScopeChip>
      ))}
    </div>
  );
}
