/**
 * Kit — SegmentedControl + OnOff: Atlas has no toggle switches.
 *
 * Ported from design/variants/variant-h-settings.tsx:174–184 (base),
 * variant-g-kanban.tsx:125–129 (compact density toggle),
 * variant-cc-notifs.tsx:403–424 (On/Off standard) and :444–459 (micro).
 * Governing canon: §2.13 — active segment is stone-900 fill; a locked
 * option renders a mono-micro "always on"/"soon" note instead of a control.
 */
"use client";

import { useState } from "react";

// M9 axis: `dot` — W's composer tabs carry a leading amber dot inside the
// Edit segment (W:124–127); the §2.9 dot grammar (semantic action color)
// reaching the segment form. Renders only on segments that declare it.
export type Segment = { value: string; label: string; dot?: "amber" };

const SIZE: Record<"base" | "compact" | "micro", { text: string; pad: string }> = {
  base: { text: "text-xs", pad: "px-4 py-2.5" },
  compact: { text: "text-xs", pad: "px-3 py-1.5" },
  micro: { text: "text-[10px]", pad: "px-2.5 py-1" },
};

export function SegmentedControl({
  options,
  value,
  defaultValue,
  onChange,
  size = "base",
}: {
  options: Segment[];
  /** controlled value; omit to let the control hold its own state. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  size?: "base" | "compact" | "micro";
}) {
  const [internal, setInternal] = useState(defaultValue ?? options[0]?.value);
  const active = value ?? internal;
  const s = SIZE[size];
  return (
    <div
      className={`inline-flex items-center font-mono ${s.text} uppercase tracking-widest rounded-full border border-stone-200 overflow-hidden`}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => {
            setInternal(o.value);
            onChange?.(o.value);
          }}
          className={`${s.pad} ${o.dot ? "inline-flex items-center gap-2 " : ""}${
            o.value === active
              ? "bg-stone-900 text-stone-50"
              : "text-stone-500 hover:bg-stone-100"
          }`}
        >
          {o.dot && <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** §2.13 — the On/Off mini form (CC:403–459). */
export function OnOff({
  value = "on",
  onChange,
  size = "compact",
  locked,
}: {
  value?: "on" | "off";
  onChange?: (value: "on" | "off") => void;
  size?: "compact" | "micro";
  /** locked options render a quiet note instead of a control (CC). */
  locked?: "always on" | "soon";
}) {
  if (locked) {
    return (
      <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
        {locked}
      </span>
    );
  }
  return (
    <SegmentedControl
      size={size}
      options={[
        { value: "on", label: "On" },
        { value: "off", label: "Off" },
      ]}
      value={value}
      onChange={(v) => onChange?.(v as "on" | "off")}
    />
  );
}
