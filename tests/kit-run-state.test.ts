// M4 — canon §3.3 live-state vocabulary (incl. ledger E10 + the
// 2026-06-11 kanban-calm amendment) as unit tests over the kit's
// run-state module. The table IS the spec; each row is asserted.
import { describe, expect, it } from "vitest";

import {
  DOT_TONE_CLASS,
  runStateDotTone,
  runStateLabelClass,
  runStatePulses,
  runStateLabelText,
  type RunState,
} from "../src/components/kit/run-state";

describe("§3.3 state → dot mapping", () => {
  const rows: Array<[RunState, string]> = [
    ["queued", "bg-stone-400"],
    ["running", "bg-stone-700"],
    ["needs-input", "bg-amber-500"],
    ["review-ready", "bg-amber-500"],
    ["shipped", "bg-emerald-500"],
    ["failed", "bg-rose-500"],
    ["cancelled", "bg-stone-300"],
  ];
  for (const [state, dotClass] of rows) {
    it(`${state} → ${dotClass}`, () => {
      expect(DOT_TONE_CLASS[runStateDotTone(state)]).toBe(dotClass);
    });
  }
});

describe("§3.3 state → label mapping", () => {
  const rows: Array<[RunState, string]> = [
    ["queued", "text-stone-500"],
    ["running", "text-stone-700"],
    ["needs-input", "text-amber-700 font-medium"],
    ["review-ready", "text-amber-600 font-medium"],
    ["shipped", "text-emerald-600 font-medium"],
    ["failed", "text-rose-600 font-medium"],
    ["cancelled", "text-stone-400"],
  ];
  for (const [state, labelClass] of rows) {
    it(`${state} → ${labelClass}`, () => {
      expect(runStateLabelClass(state)).toBe(labelClass);
    });
  }

  it("label text reads dashes as spaces", () => {
    expect(runStateLabelText("needs-input")).toBe("needs input");
    expect(runStateLabelText("review-ready")).toBe("review ready");
  });
});

describe("§3.3 pulse column", () => {
  it("needs-input pulses in EVERY context — it outranks everything", () => {
    expect(runStatePulses("needs-input", "live")).toBe(true);
    expect(runStatePulses("needs-input", "list")).toBe(true);
    // motion monopoly holds on the board too (review grill 2026-06-11)
    expect(runStatePulses("needs-input", "board")).toBe(true);
  });

  it("running pulses ONLY in live contexts (E10)", () => {
    expect(runStatePulses("running", "live")).toBe(true);
    expect(runStatePulses("running", "list")).toBe(false);
  });

  it("kanban-calm rule: running is static on the board", () => {
    expect(runStatePulses("running", "board")).toBe(false);
  });

  it("review-ready NEVER pulses — amber stays scarce", () => {
    expect(runStatePulses("review-ready", "live")).toBe(false);
    expect(runStatePulses("review-ready", "list")).toBe(false);
    expect(runStatePulses("review-ready", "board")).toBe(false);
  });

  it("static terminal states never pulse anywhere", () => {
    for (const state of ["queued", "shipped", "failed", "cancelled"] as const) {
      for (const context of ["live", "list", "board"] as const) {
        expect(runStatePulses(state, context), `${state}/${context}`).toBe(false);
      }
    }
  });
});

describe("§1.1 one color = one meaning", () => {
  it("amber is never success; emerald is never brand", () => {
    expect(runStateDotTone("shipped")).toBe("emerald");
    expect(runStateDotTone("needs-input")).toBe("amber");
    expect(runStateDotTone("shipped")).not.toBe("amber");
  });
});
