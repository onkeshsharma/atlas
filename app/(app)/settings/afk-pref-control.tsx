"use client";
/**
 * AFK Mode toggle (ADR-0006 §4) — mirrors SidebarPrefControl. Saves on change
 * (§H "Atlas saves as you go"). On → Athena auto-answers a Run's Ask; off →
 * Asks wait for the Owner (with Athena as a fallback after the timeout).
 */
import { useState, useTransition } from "react";

import { OnOff } from "@/src/components/kit";

import { setAfkModeAction } from "./actions";

export function AfkPrefControl({ enabled }: { enabled: boolean }) {
  const [value, setValue] = useState<"on" | "off">(enabled ? "on" : "off");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-4">
      <OnOff
        value={value}
        onChange={(v) => {
          setValue(v);
          startTransition(() => setAfkModeAction(v));
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
