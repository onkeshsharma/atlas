"use client";
/**
 * M8 — SegmentedField: the kit SegmentedControl bound to a form via a
 * hidden input, so server-action forms (S's kind/priority pickers,
 * S:113–152) submit the active segment. Composition only — the control
 * itself stays the kit's (master plan §7.3).
 */
import { useState } from "react";

import { SegmentedControl, type Segment } from "@/src/components/kit";

export function SegmentedField({
  name,
  options,
  defaultValue,
  size = "base",
}: {
  name: string;
  options: Segment[];
  defaultValue: string;
  size?: "base" | "compact" | "micro";
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <SegmentedControl options={options} value={value} onChange={setValue} size={size} />
    </>
  );
}
