"use client";
/**
 * M10 — the Run cap dial (PRD #8): a §2.13 segmented choice over
 * `instance_settings.run_cap`. Saves on change (H:242's instant-save
 * stance); the copy beside it tells the truth about propagation — the
 * daemon learns the new cap on its next heartbeat (ADR-0002 §3).
 */
import { useState, useTransition } from "react";

import { SegmentedControl } from "@/src/components/kit";

import { setRunCapAction } from "./actions";

const CAP_CHOICES = [1, 2, 3, 4];

export function CapControl({ cap }: { cap: number }) {
  const [value, setValue] = useState(String(cap));
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-4">
      <SegmentedControl
        options={CAP_CHOICES.map((n) => ({ value: String(n), label: String(n) }))}
        value={CAP_CHOICES.map(String).includes(value) ? value : String(CAP_CHOICES[0])}
        onChange={(v) => {
          setValue(v);
          startTransition(() => setRunCapAction(Number(v)));
        }}
      />
      {pending && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
          saving…
        </span>
      )}
    </div>
  );
}
