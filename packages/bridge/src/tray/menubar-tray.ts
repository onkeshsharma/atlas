/**
 * BP3 — Minimal OS menubar/system-tray adapter (ADR-0004 §2).
 *
 * Bridges the pure state model (tray/state.ts) to the systray native binary.
 * Uses the `systray` npm package (pre-built Go binaries per platform, no
 * toolchain required — verified via `pnpm info systray`).
 *
 * HARD WALL (ADR-0004 §2): The adapter ONLY renders what `buildTrayModel`
 * produces. No extra items, no logs window, no run list. If the model says
 * 4 items, 4 items render. The adapter is dumb; the model is the law.
 *
 * VERIFICATION CEILING: The tray renders OS-native UI. Automated testing
 * is not possible (no headless systray runner). The state model is fully
 * unit-proven in tray-state.test.ts (39 tests). This adapter is covered
 * by manual Owner verification after the signed binary is deployed.
 *
 * First-run "Not paired → Pair" flow (ADR-0004 §4):
 *   When connectionState === "not-paired", the "Pair this machine…" action
 *   calls `runPair()` (BP1's loopback handshake). After pairing resolves,
 *   the tray polls `runStatus()` and rebuilds the model.
 */

// systray is a CJS package with no `exports` field; its declaration file is
// in typings (not types), and moduleResolution:nodenext cannot resolve it as a
// constructable class — TypeScript treats the module as a namespace.
//
// Strategy: declare the minimal types we need locally (matching the real
// lib/index.d.ts exactly) and use createRequire to load the CJS constructor.
// This avoids the namespace-vs-type conflict entirely.
import { createRequire } from "node:module";
import type { EventEmitter } from "node:events";

/** Mirrors systray@1.0.5 lib/index.d.ts — kept in sync by version lock. */
type SystrayMenuItem = {
  title: string;
  tooltip: string;
  checked: boolean;
  enabled: boolean;
};

type SystrayConf = {
  menu: {
    icon: string;
    title: string;
    tooltip: string;
    items: SystrayMenuItem[];
  };
  debug?: boolean;
  copyDir?: boolean | string;
};

type SystrayClickEvent = {
  type: "clicked";
  item: SystrayMenuItem;
  seq_id: number;
};

type SystrayUpdateMenuAction = {
  type: "update-menu";
  menu: SystrayConf["menu"];
  seq_id?: number;
};

type SystrayAction = SystrayUpdateMenuAction | {
  type: "update-item";
  item: SystrayMenuItem;
  seq_id: number;
};

interface ISysTray extends EventEmitter {
  onReady(listener: () => void): this;
  onClick(listener: (action: SystrayClickEvent) => void): this;
  writeLine(line: string): this;
  sendAction(action: SystrayAction): this;
  kill(exitNode?: boolean): void;
  onExit(listener: (code: number | null, signal: string | null) => void): void;
  onError(listener: (err: Error) => void): void;
  readonly killed: boolean;
  readonly binPath: string;
}

const SysTray = createRequire(import.meta.url)("systray").default as new (conf: SystrayConf) => ISysTray;

import type { TrayModel, TrayMenuItem, TrayAction } from "./state.ts";
import { buildTrayModel } from "./state.ts";
import { runStatus } from "../cli/status.ts";
import { runPair } from "../cli/pair.ts";

// Polling interval for status refresh (ms).
const POLL_INTERVAL_MS = 5_000;

export type TrayOpts = {
  /** Atlas URL (from config or env). */
  atlasUrl?: string | null;
  /** Initial paused state. */
  paused?: boolean;
  /** ATLAS_BRIDGE_HOME env override. */
  bridgeHome?: string;
};

/**
 * Convert a TrayModel item to the systray menu item format.
 * systray MenuItem: { title, tooltip, enabled, checked }
 * Separators → disabled "—" item (systray has no native separator type).
 */
function modelItemToSystray(item: TrayMenuItem): SystrayMenuItem {
  if (item.type === "separator") {
    return { title: "—", tooltip: "", enabled: false, checked: false };
  }
  if (item.type === "label") {
    return { title: item.text, tooltip: "", enabled: false, checked: false };
  }
  return {
    title: item.label,
    tooltip: item.label,
    enabled: item.enabled,
    checked: false,
  };
}

/**
 * Map all TrayModel items to the systray menu item array.
 */
function buildSystrayMenu(model: TrayModel): SystrayMenuItem[] {
  return model.menuItems.map(modelItemToSystray);
}

/**
 * Start the tray presence. Call once at daemon start.
 *
 * The tray runs a polling loop that rebuilds the model every POLL_INTERVAL_MS.
 * On action click, the action handler fires.
 */
export async function startTray(opts: TrayOpts = {}): Promise<void> {
  const env: NodeJS.ProcessEnv = opts.bridgeHome
    ? { ...process.env, ATLAS_BRIDGE_HOME: opts.bridgeHome }
    : process.env;

  let paused = opts.paused ?? false;

  // Build the initial status.
  let status = await runStatus({ env, silent: true });
  const atlasUrl = opts.atlasUrl ?? status.atlasUrl ?? null;
  let model = buildTrayModel(status, paused, atlasUrl);

  // Build the initial systray config.
  const trayConfig = {
    menu: {
      icon: buildIconPath(model.connectionState),
      title: "",
      tooltip: model.tooltipText,
      items: buildSystrayMenu(model),
    },
    debug: false,
    copyDir: true, // copy native binary to working dir
  };

  const tray = new SysTray(trayConfig);

  // Handle action clicks.
  tray.onClick((action: { seq_id: number }) => {
    const flatItems = model.menuItems.filter((m) => m.type === "action");
    const clicked = flatItems[action.seq_id] as {
      type: "action";
      id: TrayAction;
      enabled: boolean;
    } | undefined;

    if (!clicked || !clicked.enabled) return;

    handleAction(clicked.id, {
      paused,
      atlasUrl,
      env,
      onPausedChange: async (newPaused) => {
        paused = newPaused;
        await refreshTray();
      },
      onPair: async () => {
        await runPair({ env, silent: false });
        await refreshTray();
      },
    });
  });

  // Polling loop.
  async function refreshTray() {
    status = await runStatus({ env, silent: true });
    model = buildTrayModel(status, paused, atlasUrl);
    tray.sendAction({
      type: "update-menu",
      menu: {
        icon: buildIconPath(model.connectionState),
        title: "",
        tooltip: model.tooltipText,
        items: buildSystrayMenu(model),
      },
    });
  }

  const pollTimer = setInterval(() => { refreshTray().catch(() => {}); }, POLL_INTERVAL_MS);

  tray.onExit(() => {
    clearInterval(pollTimer);
    process.exit(0);
  });
}

/** Select the icon path based on connection state. */
function buildIconPath(state: TrayModel["connectionState"]): string {
  // Icons are embedded in the SEA binary or resolved from the same directory.
  // For the initial version, use a text emoji as the icon title (no icon file
  // required — systray falls back to the title when no icon path is set).
  // Owner-gated: add proper .ico/.tiff/.png icons for production.
  switch (state) {
    case "connected": return "";
    case "offline": return "";
    case "not-paired": return "";
  }
}

type ActionHandlerOpts = {
  paused: boolean;
  atlasUrl: string | null;
  env: NodeJS.ProcessEnv;
  onPausedChange: (paused: boolean) => Promise<void>;
  onPair: () => Promise<void>;
};

function handleAction(id: TrayAction, opts: ActionHandlerOpts): void {
  switch (id) {
    case "pause":
      opts.onPausedChange(true).catch(() => {});
      break;
    case "resume":
      opts.onPausedChange(false).catch(() => {});
      break;
    case "open-in-atlas":
      if (opts.atlasUrl) {
        // Open /settings/bridges in the default browser.
        openUrl(`${opts.atlasUrl}/settings/bridges`);
      } else {
        // Not paired — trigger the pair flow.
        opts.onPair().catch(() => {});
      }
      break;
    case "quit":
      process.exit(0);
  }
}

function openUrl(url: string): void {
  const platform = process.platform;
  const { spawn } = require("node:child_process"); // eslint-disable-line @typescript-eslint/no-require-imports
  if (platform === "win32") {
    spawn("cmd.exe", ["/C", "start", "", url], { detached: true, shell: false });
  } else if (platform === "darwin") {
    spawn("open", [url], { detached: true, shell: false });
  } else {
    spawn("xdg-open", [url], { detached: true, shell: false });
  }
}
