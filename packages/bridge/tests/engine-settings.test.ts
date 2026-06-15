/**
 * Per-run posture settings (ADR-0008 §2). owner = machine-safety floor only;
 * helper = read-only on top (so a repo's CLAUDE.md can't lure it into dev work).
 */
import { describe, expect, it } from "vitest";

import { engineSettings } from "../src/engine/real.ts";

function deny(lane: "owner" | "helper"): string[] {
  return JSON.parse(engineSettings(lane)).permissions.deny;
}

describe("engineSettings", () => {
  it("owner runs get the machine-safety floor and CAN write", () => {
    const d = deny("owner");
    expect(d).toContain("Bash(git push*)"); // sole-publisher floor holds
    expect(d).not.toContain("Write");
    expect(d).not.toContain("Edit");
  });

  it("helper runs are read-only (Write/Edit/NotebookEdit denied) on top of the floor", () => {
    const d = deny("helper");
    expect(d).toContain("Bash(git push*)"); // floor still applies
    expect(d).toContain("Write");
    expect(d).toContain("Edit");
    expect(d).toContain("NotebookEdit");
  });

  it("does not mutate the shared base deny list across calls", () => {
    deny("helper");
    expect(deny("owner")).not.toContain("Write"); // owner unaffected by a prior helper call
  });
});
