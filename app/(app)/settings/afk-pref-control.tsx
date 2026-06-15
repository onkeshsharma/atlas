"use client";
/**
 * AFK dial (ADR-0007 §4) — Off / On / Ultra, plus the takeover delay (the
 * fallback window used when AFK is Off). Saves on change (§H "saves as you go").
 */
import { useState, useTransition } from "react";

import { SegmentedControl } from "@/src/components/kit";
import type { AfkLevel, AthenaLocation } from "@/src/domain/settings/instance";

import {
  setAfkDelayAction,
  setAfkLevelAction,
  setAthenaCouncilSizeAction,
  setAthenaEscalationCapAction,
  setAthenaLocationAction,
} from "./actions";

const DELAY_OPTIONS = [
  { value: "0", label: "Never" },
  { value: "5", label: "5m" },
  { value: "10", label: "10m" },
  { value: "30", label: "30m" },
  { value: "60", label: "60m" },
];

const COUNCIL_OPTIONS = [
  { value: "1", label: "1" },
  { value: "3", label: "3" },
  { value: "5", label: "5" },
  { value: "7", label: "7" },
];

const BUDGET_OPTIONS = [
  { value: "0", label: "∞" },
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
];

export function AfkPrefControl({
  level,
  fallbackMinutes,
  location,
  councilSize,
  escalationCap,
}: {
  level: AfkLevel;
  fallbackMinutes: number;
  location: AthenaLocation;
  councilSize: number;
  escalationCap: number;
}) {
  const [value, setValue] = useState<AfkLevel>(level);
  const [delay, setDelay] = useState(String(fallbackMinutes));
  const [loc, setLoc] = useState<AthenaLocation>(location);
  const [council, setCouncil] = useState(String(councilSize));
  const [budget, setBudget] = useState(String(escalationCap));
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

      {value !== "off" && (
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Council size
          </span>
          <SegmentedControl
            size="micro"
            options={COUNCIL_OPTIONS}
            value={council}
            onChange={(v) => {
              setCouncil(v);
              startTransition(() => setAthenaCouncilSizeAction(v));
            }}
          />
          <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
            {council === "1" ? "single delegate" : `${council} lenses vote · majority answers`}
          </span>
        </div>
      )}

      {value !== "off" && (
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Daily budget
          </span>
          <SegmentedControl
            size="micro"
            options={BUDGET_OPTIONS}
            value={budget}
            onChange={(v) => {
              setBudget(v);
              startTransition(() => setAthenaEscalationCapAction(v));
            }}
          />
          <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
            {budget === "0"
              ? "unlimited escalations"
              : `${budget} expensive consults / 24h · then asks you`}
          </span>
        </div>
      )}
    </div>
  );
}
