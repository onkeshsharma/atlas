"use client";
/**
 * M10 — the Preferences page's one segmented control that is REAL:
 * the §2.1 persisted sidebar density. Saves on change (H:242) through
 * the server action; the shell re-renders via revalidatePath.
 */
import { useState, useTransition } from "react";

import { SegmentedControl } from "@/src/components/kit";

import { setSidebarPrefAction } from "./actions";

export function SidebarPrefControl({ collapsed }: { collapsed: boolean }) {
  const [value, setValue] = useState(collapsed ? "collapsed" : "expanded");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-4">
      <SegmentedControl
        options={[
          { value: "collapsed", label: "Collapsed" },
          { value: "expanded", label: "Expanded" },
        ]}
        value={value}
        onChange={(v) => {
          setValue(v);
          startTransition(() => setSidebarPrefAction(v));
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
