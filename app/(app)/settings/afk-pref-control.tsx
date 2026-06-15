"use client";
/**
 * AFK dial (ADR-0007 §4) — Off / On / Ultra, plus the takeover delay (the
 * fallback window used when AFK is Off). Saves on change (§H "saves as you go").
 */
import { useState, useTransition } from "react";

import { SegmentedControl } from "@/src/components/kit";
import type { AfkLevel, AthenaLocation } from "@/src/domain/settings/instance";

import { setAfkDelayAction, setAfkLevelAction, setAthenaLocationAction } from "./actions";

const DELAY_OPTIONS = [
  { value: "0", label: "Never" },
  { value: "5", label: "5m" },
  { value: "10", label: "10m" },
  { value: "30", label: "30m" },
  { value: "60", label: "60m" },
];

export function AfkPrefControl({
  level,
  fallbackMinutes,
  location,
}: {
  level: AfkLevel;
  fallbackMinutes: number;
  location: AthenaLocation;
}) {
  const [value, setValue] = useState<AfkLevel>(level);
  const [delay, setDelay] = useState(String(fallbackMinutes));
  const [loc, setLoc] = useState<AthenaLocation>(location);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <SegmentedControl
          options={[
            { value: "off", label: "Off" },
            { value: "on", label: "On" },
            { value: "ultra", label: "Ultra" },
          ]}
          value={value}
          onChange={(v) => {
            setValue(v as AfkLevel);
            startTransition(() => setAfkLevelAction(v));
          }}
        />
        {pending && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
            saving…
          </span>
        )}
      </div>

      {value === "ultra" && (
        <p className="text-sm text-rose-700 leading-relaxed max-w-xl">
          <span className="font-medium">Ultra Athena</span> answers <em>every</em> Ask,
          including high-stakes ones — full decision autonomy. (The Bridge&apos;s machine-safety
          limits still apply: no destructive commands, no direct publishing.)
        </p>
      )}

      {value === "off" && (
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Athena takes over after
          </span>
          <SegmentedControl
            size="micro"
            options={DELAY_OPTIONS}
            value={delay}
            onChange={(v) => {
              setDelay(v);
              startTransition(() => setAfkDelayAction(v));
            }}
          />
        </div>
      )}

      {value !== "off" && (
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Athena runs on
          </span>
          <SegmentedControl
            size="compact"
            options={[
              { value: "cloud", label: "Cloud" },
              { value: "bridge", label: "Bridge" },
            ]}
            value={loc}
            onChange={(v) => {
              setLoc(v as AthenaLocation);
              startTransition(() => setAthenaLocationAction(v));
            }}
          />
          <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
            {loc === "bridge" ? "reads the code · no key" : "Atlas API · needs key"}
          </span>
        </div>
      )}
    </div>
  );
}
