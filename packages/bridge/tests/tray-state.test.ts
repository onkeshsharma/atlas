/**
 * BP3 — Tray state mapping unit tests (ADR-0004 §2).
 *
 * Asserts that buildTrayModel() produces the §2-compliant dropdown for
 * every relevant daemon-state + paused combination:
 *   - not-paired (first-run): "Not paired" label + "Pair this machine…" action
 *   - offline (paired, not running): "Offline" label + pause control disabled
 *   - paused (paired, running, paused): "Paused" label + Resume action
 *   - connected (paired, running, not paused): "Connected" label + Pause action
 *
 * HARD WALL (ADR-0004 §2): no run list, no logs window, no second dashboard.
 * Tests assert the menu does NOT include these.
 */
import { describe, it, expect } from "vitest";

import {
  buildTrayModel,
  buildFirstRunModel,
  type TrayModel,
  type TrayAction,
} from "../src/tray/state.ts";
import type { StatusResult } from "../src/cli/status.ts";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeStatus(overrides: Partial<StatusResult> = {}): StatusResult {
  return {
    running: false,
    pid: null,
    pairedAs: null,
    atlasUrl: null,
    engineFound: true,
    engineFlavor: "real",
    ...overrides,
  };
}

function actions(model: TrayModel): TrayAction[] {
  return model.menuItems
    .filter((m) => m.type === "action")
    .map((m) => (m as { type: "action"; id: TrayAction; label: string; enabled: boolean }).id);
}

function labelTexts(model: TrayModel): string[] {
  return model.menuItems
    .filter((m) => m.type === "label")
    .map((m) => (m as { type: "label"; text: string }).text);
}

function hasSeparator(model: TrayModel): boolean {
  return model.menuItems.some((m) => m.type === "separator");
}

// ── not-paired (first-run) ────────────────────────────────────────────────

describe("not-paired state", () => {
  const status = makeStatus({ pairedAs: null, running: false });
  const model = buildTrayModel(status, false, null);

  it("connectionState is not-paired", () => {
    expect(model.connectionState).toBe("not-paired");
  });

  it("tooltip mentions 'not paired'", () => {
    expect(model.tooltipText.toLowerCase()).toContain("not paired");
  });

  it("shows 'Not paired' in labels", () => {
    const labels = labelTexts(model);
    expect(labels.some((l) => l.toLowerCase().includes("not paired"))).toBe(true);
  });

  it("includes open-in-atlas action for pairing (Pair this machine…)", () => {
    const acts = actions(model);
    expect(acts).toContain("open-in-atlas");
  });

  it("includes quit action", () => {
    expect(actions(model)).toContain("quit");
  });

  it("does NOT include pause or resume (no daemon running yet)", () => {
    const acts = actions(model);
    expect(acts).not.toContain("pause");
    expect(acts).not.toContain("resume");
  });

  it("has at least one separator (ADR §2 requires visual grouping)", () => {
    expect(hasSeparator(model)).toBe(true);
  });
});

// ── first-run model helper ───────────────────────────────────────────────

describe("buildFirstRunModel()", () => {
  const model = buildFirstRunModel();

  it("is equivalent to not-paired buildTrayModel", () => {
    expect(model.connectionState).toBe("not-paired");
  });

  it("has the 'Pair this machine…' or open-in-atlas action", () => {
    expect(actions(model)).toContain("open-in-atlas");
  });
});

// ── offline state (paired but daemon not running) ─────────────────────────

describe("offline state (paired, daemon not running)", () => {
  const status = makeStatus({ pairedAs: "onkesh-desktop", running: false });
  const model = buildTrayModel(status, false, "https://atlas.example.com");

  it("connectionState is offline", () => {
    expect(model.connectionState).toBe("offline");
  });

  it("tooltip mentions the machine name", () => {
    expect(model.tooltipText).toContain("onkesh-desktop");
  });

  it("labels show Offline + machine name", () => {
    const labels = labelTexts(model);
    expect(labels.some((l) => l.includes("Offline") && l.includes("onkesh-desktop"))).toBe(true);
  });

  it("includes pause action (toggle)", () => {
    expect(actions(model)).toContain("pause");
  });

  it("includes open-in-atlas action", () => {
    expect(actions(model)).toContain("open-in-atlas");
  });

  it("includes quit action", () => {
    expect(actions(model)).toContain("quit");
  });

  it("open-in-atlas is enabled when atlasUrl is set", () => {
    const item = model.menuItems.find(
      (m) => m.type === "action" && m.id === "open-in-atlas" && m.label === "↗ Open in Atlas",
    ) as { type: "action"; enabled: boolean } | undefined;
    expect(item?.enabled).toBe(true);
  });
});

// ── paused state ─────────────────────────────────────────────────────────

describe("paused state (paired, running, paused=true)", () => {
  const status = makeStatus({ pairedAs: "my-mac", running: true, pid: 12345 });
  const model = buildTrayModel(status, true, "https://atlas.example.com");

  it("connectionState is offline (paused is a subtype of offline)", () => {
    // Paused daemon is considered offline from a connectivity standpoint.
    expect(model.connectionState).toBe("offline");
  });

  it("tooltip mentions 'paused'", () => {
    expect(model.tooltipText.toLowerCase()).toContain("paused");
  });

  it("labels show Paused + machine name", () => {
    const labels = labelTexts(model);
    expect(labels.some((l) => l.includes("Paused") && l.includes("my-mac"))).toBe(true);
  });

  it("includes resume action (NOT pause when already paused)", () => {
    const acts = actions(model);
    expect(acts).toContain("resume");
    expect(acts).not.toContain("pause");
  });

  it("includes quit (always live — ADR §5)", () => {
    expect(actions(model)).toContain("quit");
  });
});

// ── connected state ───────────────────────────────────────────────────────

describe("connected state (paired, running, not paused)", () => {
  const status = makeStatus({
    pairedAs: "my-laptop",
    running: true,
    pid: 99,
    engineFound: true,
    atlasUrl: "https://atlas.example.com",
  });
  const model = buildTrayModel(status, false, "https://atlas.example.com");

  it("connectionState is connected", () => {
    expect(model.connectionState).toBe("connected");
  });

  it("tooltip mentions the machine name and 'connected'", () => {
    expect(model.tooltipText.toLowerCase()).toContain("connected");
    expect(model.tooltipText).toContain("my-laptop");
  });

  it("labels show Connected + machine name", () => {
    const labels = labelTexts(model);
    expect(labels.some((l) => l.includes("Connected") && l.includes("my-laptop"))).toBe(true);
  });

  it("shows engine label when paired", () => {
    const labels = labelTexts(model);
    expect(labels.some((l) => l.toLowerCase().includes("engine"))).toBe(true);
  });

  it("includes pause action (not resume)", () => {
    const acts = actions(model);
    expect(acts).toContain("pause");
    expect(acts).not.toContain("resume");
  });

  it("includes open-in-atlas action", () => {
    expect(actions(model)).toContain("open-in-atlas");
  });

  it("includes quit (always live — ADR §5)", () => {
    expect(actions(model)).toContain("quit");
  });

  it("open-in-atlas is enabled", () => {
    const item = model.menuItems.find(
      (m) => m.type === "action" && m.id === "open-in-atlas" && m.label === "↗ Open in Atlas",
    ) as { type: "action"; enabled: boolean } | undefined;
    expect(item?.enabled).toBe(true);
  });
});

// ── ADR-0004 §2 HARD WALL assertions ─────────────────────────────────────

describe("§2 hard wall — no cockpit duplication", () => {
  const status = makeStatus({ pairedAs: "dev-machine", running: true, pid: 100 });
  const model = buildTrayModel(status, false, "https://atlas.example.com");

  it("no run list in the tray model (no list of runs)", () => {
    // The model must never contain a menu item that shows a list of runs.
    // ADR-0004 §2: the allowed action set is exactly { pause, resume, open-in-atlas, quit }.
    // Any future addition of "run-list" or "session-dashboard" would be a charter breach.
    const actionIds = model.menuItems
      .filter((m) => m.type === "action")
      .map((m) => (m as { type: "action"; id: string }).id);
    const forbiddenIds = ["run-list", "session-dashboard", "logs", "runs", "dashboard"];
    for (const id of forbiddenIds) {
      expect(actionIds).not.toContain(id);
    }
  });

  it("no logs window action in the model", () => {
    const logsAction = model.menuItems.find(
      (m) => m.type === "action" && (m.id as string).includes("log"),
    );
    expect(logsAction).toBeUndefined();
  });

  it("total action count is bounded (§2: exactly 3-4 actions max)", () => {
    // §2 allows: pair/open-in-atlas, pause/resume, quit = 3 max
    const actItems = model.menuItems.filter((m) => m.type === "action");
    expect(actItems.length).toBeLessThanOrEqual(4);
  });

  it("quit is always enabled (ADR §5: stop/pause always reachable)", () => {
    const quitItem = model.menuItems.find(
      (m) => m.type === "action" && m.id === "quit",
    ) as { type: "action"; enabled: boolean } | undefined;
    expect(quitItem).toBeDefined();
    expect(quitItem?.enabled).toBe(true);
  });
});

// ── open-in-atlas disabled when no atlasUrl ──────────────────────────────

describe("open-in-atlas disabled when atlasUrl is null", () => {
  const status = makeStatus({ pairedAs: "dev-machine", running: true, pid: 1 });
  const model = buildTrayModel(status, false, null);

  it("open-in-atlas (↗ Open in Atlas) is disabled", () => {
    const item = model.menuItems.find(
      (m) => m.type === "action" && m.id === "open-in-atlas" && m.label === "↗ Open in Atlas",
    ) as { type: "action"; enabled: boolean } | undefined;
    expect(item?.enabled).toBe(false);
  });
});
