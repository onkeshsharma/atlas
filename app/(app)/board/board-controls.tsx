"use client";
/**
 * M8 — board density control + filter chips (G:120–129, G:168–180).
 *
 * Both are REAL search-param controls — the server page filters real
 * rows (the inbox ?show= precedent). G's mock chips read "Label any";
 * here a click cycles the filter through its values and back to any, so
 * the affordance G drew is honest without inventing dropdown chrome the
 * gallery never specced. Chip chrome is the kit ScopeChip — canon §2.13
 * governs selection chips, overruling G:340's stone-100 fills
 * (canon-over-variant, same ruling as the M6 inbox chips).
 * Density segments are the kit SegmentedControl in G:125–129's compact
 * form.
 */
import { useRouter, useSearchParams } from "next/navigation";

import { ScopeChip, SegmentedControl } from "@/src/components/kit";

export const DENSITIES = ["c", "m", "r"] as const;
export type Density = (typeof DENSITIES)[number];

export type BoardFilter = {
  key: "kind" | "state" | "reporter" | "hint";
  label: string;
  values: string[];
};

function withParam(params: URLSearchParams, key: string, value: string | null): string {
  const next = new URLSearchParams(params);
  if (value === null) next.delete(key);
  else next.set(key, value);
  const qs = next.toString();
  return qs ? `/board?${qs}` : "/board";
}

export function DensityControl({ density }: { density: Density }) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
        Density
      </span>
      <SegmentedControl
        size="compact"
        options={[
          { value: "c", label: "C" },
          { value: "m", label: "M" },
          { value: "r", label: "R" },
        ]}
        value={density}
        onChange={(v) =>
          router.replace(withParam(params, "density", v === "m" ? null : v), { scroll: false })
        }
      />
    </div>
  );
}

export function BoardFilters({
  filters,
  active,
}: {
  filters: BoardFilter[];
  /** current value per filter key; absent = any. */
  active: Partial<Record<BoardFilter["key"], string>>;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const cycle = (f: BoardFilter) => {
    const current = active[f.key];
    const i = current ? f.values.indexOf(current) : -1;
    const next = i + 1 < f.values.length ? f.values[i + 1] : null; // wraps back to any
    router.replace(withParam(params, f.key, next), { scroll: false });
  };

  const anyActive = filters.some((f) => active[f.key]);

  return (
    <div className="mt-6 flex items-center gap-2 flex-wrap">
      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
        Filter
      </span>
      {filters.map((f) => {
        const current = active[f.key];
        return (
          <ScopeChip key={f.key} selected={Boolean(current)} clear onClick={() => cycle(f)}>
            {f.label}{" "}
            <span className={current ? "text-stone-400" : "text-stone-400"}>
              {current ? current.replace(/-/g, " ") : "any"}
            </span>
          </ScopeChip>
        );
      })}
      <button
        type="button"
        onClick={() => router.replace("/board", { scroll: false })}
        className={`font-mono text-[10px] uppercase tracking-widest ml-2 transition ${
          anyActive ? "text-stone-500 hover:text-amber-600" : "text-stone-300 cursor-default"
        }`}
      >
        Reset
      </button>
    </div>
  );
}
