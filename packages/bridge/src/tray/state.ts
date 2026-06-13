/**
 * BP3 — Tray state mapping (pure, unit-proven).
 *
 * ADR-0004 §2 defines the EXACT tray dropdown:
 *   - Status dot + label: Connected / Offline / Not paired
 *   - Paired as: "<name>"  (only when paired)
 *   - Engine: found / not found
 *   - N running            (count, not list — no run list)
 *   - ─────────────────
 *   - ⏸ Pause / ▶ Resume  (toggle — daemon posture control)
 *   - ↗ Open in Atlas       (deep link to /settings/bridges)
 *   - ─────────────────
 *   - ⏻ Quit
 *
 * HARD WALL: no run list, no session manager, no logs window, no settings
 * panel that duplicates the cockpit. Register the urge — don't build it.
 *
 * This module is PURE: daemon status → dropdown model. No OS calls, no
 * native tray API. The tray adapter (menubar-tray.ts) consumes the model.
 */

import type { StatusResult } from "../cli/status.ts";

/** The three possible pairing/connection states for the tray label. */
export type TrayConnectionState =
  | "connected"   // daemon running + paired + Atlas reachable (inferred)
  | "offline"     // daemon running but Atlas unreachable (paused or network down)
  | "not-paired"; // no token in config

/** A single dropdown item (separator or action). */
export type TrayMenuItem =
  | { type: "separator" }
  | { type: "label"; text: string; enabled: false }
  | { type: "action"; id: TrayAction; label: string; enabled: boolean };

/** The action IDs the tray adapter must handle. */
export type TrayAction =
  | "pause"
  | "resume"
  | "open-in-atlas"
  | "quit";

/** The full tray dropdown model — pure data, no native calls. */
export type TrayModel = {
  /** Icon/tooltip state. */
  connectionState: TrayConnectionState;
  /** Tooltip text for the tray icon. */
  tooltipText: string;
  /** The ordered list of menu items to render. */
  menuItems: TrayMenuItem[];
};

/** Whether the daemon is considered "paused" (honors the paused flag). */
export type PausedState = { paused: boolean };

/**
 * Build the tray model from the daemon's status + paused flag.
 *
 * Pure function — no side effects. This is the §2-compliant dropdown spec.
 * The tray adapter (menubar-tray.ts) passes the model to the OS API.
 *
 * @param status   Result of `runStatus()` (BP1 cli/status.ts)
 * @param paused   Whether the daemon is in the local paused posture
 * @param atlasUrl The Atlas URL to deep-link to (from config)
 */
export function buildTrayModel(
  status: StatusResult,
  paused: boolean,
  atlasUrl: string | null,
): TrayModel {
  // Determine connection state
  let connectionState: TrayConnectionState;
  if (!status.pairedAs) {
    connectionState = "not-paired";
  } else if (!status.running || paused) {
    connectionState = "offline";
  } else {
    connectionState = "connected";
  }

  // Tooltip text
  let tooltipText: string;
  switch (connectionState) {
    case "connected":
      tooltipText = `Atlas Bridge — connected as "${status.pairedAs}"`;
      break;
    case "offline":
      tooltipText = paused
        ? `Atlas Bridge — paused (${status.pairedAs ?? "not paired"})`
        : `Atlas Bridge — offline (${status.pairedAs ?? "not paired"})`;
      break;
    case "not-paired":
      tooltipText = "Atlas Bridge — not paired";
      break;
  }

  // Build menu items (ADR-0004 §2 verbatim)
  const items: TrayMenuItem[] = [];

  // Status line (non-actionable label)
  const statusLabel =
    connectionState === "connected"
      ? `Connected · ${status.pairedAs}`
      : connectionState === "offline"
      ? paused
        ? `Paused · ${status.pairedAs}`
        : `Offline · ${status.pairedAs}`
      : "Not paired";
  items.push({ type: "label", text: statusLabel, enabled: false });

  // Engine info (only when paired or running)
  if (status.pairedAs) {
    const engineText =
      status.engineFlavor === "fake"
        ? "Engine: fake (test mode)"
        : status.engineFound
        ? "Engine: found"
        : "Engine: NOT found — runs will fail";
    items.push({ type: "label", text: engineText, enabled: false });
  }

  items.push({ type: "separator" });

  // Pair action (only when NOT paired)
  if (connectionState === "not-paired") {
    items.push({
      type: "action",
      id: "open-in-atlas",
      label: "Pair this machine…",
      enabled: true,
    });
  }

  // Pause / Resume toggle (only when paired)
  if (status.pairedAs) {
    if (paused) {
      items.push({ type: "action", id: "resume", label: "▶ Resume", enabled: true });
    } else {
      items.push({ type: "action", id: "pause", label: "⏸ Pause", enabled: true });
    }
  }

  // Open in Atlas (deep link to /settings/bridges)
  const openEnabled = atlasUrl != null;
  items.push({
    type: "action",
    id: "open-in-atlas",
    label: "↗ Open in Atlas",
    enabled: openEnabled,
  });

  items.push({ type: "separator" });

  // Quit (always enabled — ADR-0004 §5: stop/pause always reachable)
  items.push({ type: "action", id: "quit", label: "⏻ Quit", enabled: true });

  return { connectionState, tooltipText, menuItems: items };
}

/**
 * First-run state: returns the tray model for an unpaired machine.
 * The primary action is "Pair this machine…" which triggers BP1's
 * loopback pair flow.
 */
export function buildFirstRunModel(): TrayModel {
  return buildTrayModel(
    {
      running: false,
      pid: null,
      pairedAs: null,
      atlasUrl: null,
      engineFound: false,
      engineFlavor: "real",
    },
    false,
    null,
  );
}
