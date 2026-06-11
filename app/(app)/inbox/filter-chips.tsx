"use client";
/**
 * M6 — inbox filter chips (Z:187–195). Chip chrome is the kit ScopeChip —
 * canon §2.13 governs selection chips, overruling Z:391–405's stone-100
 * fills (canon-over-variant; comment per master plan §5.4). Selection is
 * a real ?show= search param so the server page filters real rows.
 */
import { useRouter } from "next/navigation";

import { ScopeChip } from "@/src/components/kit";

export type InboxFilter = "everything" | "shipped" | "replies" | "runs";

export const INBOX_FILTERS: InboxFilter[] = ["everything", "shipped", "replies", "runs"];

const LABEL: Record<InboxFilter, string> = {
  everything: "Everything",
  shipped: "Shipped",
  replies: "Replies",
  runs: "Runs",
};

export function FilterChips({ selected }: { selected: InboxFilter }) {
  const router = useRouter();
  return (
    <div className="mt-8 flex items-center gap-2 flex-wrap">
      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
        Show
      </span>
      {INBOX_FILTERS.map((f) => (
        <ScopeChip
          key={f}
          selected={selected === f}
          onClick={() =>
            router.push(f === "everything" ? "/inbox" : `/inbox?show=${f}`, {
              scroll: false,
            })
          }
        >
          {LABEL[f]}
        </ScopeChip>
      ))}
    </div>
  );
}
