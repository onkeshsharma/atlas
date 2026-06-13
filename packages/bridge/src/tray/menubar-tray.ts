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
 *
 * BP5 — SEA tray-binary extraction:
 *   In the packaged Node SEA binary, the systray helper (a pre-built Go
 *   executable) is NOT accessible at its npm package path because the
 *   node_modules tree doesn't exist inside the single-file exe. Fix:
 *   bundle the helper as a SEA asset (sea.config.json "assets"), then at
 *   runtime extract it to ~/.cache/node-systray/<version>/ before creating
 *   the SysTray instance. systray's copyDir logic finds the file there and
 *   skips the broken fs.copySync from the wrong __dirname.
 *
 *   Source of truth: systray@1.0.5 lib/index.js `getTrayBinPath`:
 *     copyDistPath = ~/.cache/node-systray/<version>/<binName>
 *     if (!fs.existsSync(copyDistPath)) { fs.copySync(binPath, copyDistPath); }
 *     return copyDistPath;   ← pre-placing the file skips the broken copy
 */

// systray is a CJS package with no `exports` field; its declaration file is
// in typings (not types), and moduleResolution:nodenext cannot resolve it as a
// constructable class — TypeScript treats the module as a namespace.
//
// Strategy: declare the minimal types we need locally (matching the real
// lib/index.d.ts exactly) and use createRequire to load the CJS constructor.
// This avoids the namespace-vs-type conflict entirely.
//
// BP4 FIX: The original code called `createRequire(import.meta.url)` at MODULE
// TOP LEVEL. In a Node SEA/CJS bundle, `import.meta.url` is empty/undefined,
// causing a TypeError on load. Fix: resolve the SysTray constructor lazily
// inside `startTray()`, only when the tray is actually being started.
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

/**
 * Load the systray CJS constructor lazily (BP4 fix: cannot call
 * `createRequire(import.meta.url)` at module top level in a CJS SEA bundle —
 * `import.meta.url` is empty/undefined in that context, causing a TypeError.
 * Moving it inside the function means it only runs when the tray is actually
 * started, and the non-fatal catch in start.ts handles any failure gracefully.
 */
function loadSysTray(): new (conf: SystrayConf) => ISysTray {
  // In CJS (SEA bundle), import.meta.url is empty. Fall back to __filename /
  // require directly — in a fully-bundled CJS context `require` is available.
  let requireFn: NodeRequire;
  try {
    // ESM / Node 24 source path: import.meta.url is the file:// URL of this module.
    requireFn = createRequire(import.meta.url);
  } catch {
    // CJS/SEA path: resolve via process.execPath (createRequire accepts a path string)
    requireFn = createRequire(process.execPath);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (requireFn("systray") as any).default as new (conf: SystrayConf) => ISysTray;
}

/**
 * BP5 — SEA tray binary extraction.
 *
 * In the packaged Node SEA, systray's Go helper binary lives inside the SEA
 * asset store (bundled at build time). At runtime we extract it to the same
 * cache path that systray's `copyDir: true` would copy to — so when systray
 * checks `fs.existsSync(copyDistPath)`, the file is already there and the
 * broken `fs.copySync(binPath, ...)` is skipped entirely.
 *
 * Cache path mirrors systray@1.0.5 lib/index.js:
 *   ~/.cache/node-systray/<pkg.version>/<binName>
 *
 * Returns the cache directory path (pass as `copyDir` string to SysTray).
 * In non-SEA (dev / source) mode returns null — systray handles it natively.
 *
 * Per-platform binary names (systray@1.0.5):
 *   win32:  tray_windows_release.exe
 *   darwin: tray_darwin_release
 *   linux:  tray_linux_release
 */
async function extractTrayBinaryIfSea(): Promise<string | null> {
  // Only needed inside a Node SEA.
  let sea: typeof import("node:sea") | null = null;
  try {
    sea = await import("node:sea");
  } catch {
    return null;
  }
  if (!sea.isSea()) return null;

  const SYSTRAY_VERSION = "1.0.5"; // must match package.json dep
  const binName: string | undefined = ({
    win32: "tray_windows_release.exe",
    darwin: "tray_darwin_release",
    linux: "tray_linux_release",
  } as Record<string, string>)[process.platform];

  if (!binName) return null; // unknown platform — let systray fail naturally

  // Asset key embedded in the SEA (must match sea.config.json assets map).
  const assetKey = `traybin/${binName}`;

  let assetBuffer: ArrayBuffer | string;
  try {
    assetBuffer = sea.getRawAsset(assetKey);
  } catch {
    // Asset not present (older build without bundled traybin) — graceful fallback.
    return null;
  }
  if (typeof assetBuffer === "string") {
    // Should not happen for binary assets, but guard defensively.
    return null;
  }

  const { homedir } = await import("node:os");
  const { join } = await import("node:path");
  const { mkdir, writeFile, access, constants, chmod } = await import("node:fs/promises");

  // systray@1.0.5 getTrayBinPath when copyDir is a string:
  //   copyDir = path.join(<copyDir string>, pkg.version)
  //   copyDistPath = path.join(copyDir, binName)
  //   → <copyDir string>/<version>/<binName>
  // So we must pass the BASE cache dir (without version), not the versioned subdir.
  const baseCacheDir = join(homedir(), ".cache", "node-systray");
  const versionedCacheDir = join(baseCacheDir, SYSTRAY_VERSION);
  const destPath = join(versionedCacheDir, binName);

  // Only write if the file isn't already there (idempotent across restarts).
  let alreadyPresent = false;
  try {
    await access(destPath, constants.F_OK);
    alreadyPresent = true;
  } catch {
    alreadyPresent = false;
  }

  if (!alreadyPresent) {
    await mkdir(versionedCacheDir, { recursive: true });
    await writeFile(destPath, Buffer.from(assetBuffer));
    // Make executable on POSIX.
    if (process.platform !== "win32") {
      await chmod(destPath, 0o755);
    }
  }

  // Return the BASE cache dir (without version). systray appends pkg.version
  // itself, so it resolves: <baseCacheDir>/<version>/<binName> = destPath.
  return baseCacheDir;
}

import type { TrayModel, TrayMenuItem, TrayAction } from "./state.ts";
import { buildTrayModel } from "./state.ts";
import { runStatus } from "../cli/status.ts";
import { runPair } from "../cli/pair.ts";

// Polling interval for status refresh (ms).
const POLL_INTERVAL_MS = 5_000;

export type TrayOpts = {
  /** Atlas URL (from config or env). */
  atlasUrl?: string | null;
  /** Initial paused state (used only when onPause/onResume/isPaused not supplied). */
  paused?: boolean;
  /** ATLAS_BRIDGE_HOME env override. */
  bridgeHome?: string;
  /**
   * BP4 — daemon pause callbacks (wired in start.ts).
   * When supplied, pause/resume actions delegate to the daemon instead of
   * managing local state in the tray. If absent, the tray manages its own
   * paused boolean (standalone mode / tests).
   */
  onPause?: () => void;
  onResume?: () => void;
  isPaused?: () => boolean;
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

  // BP4: Use daemon-delegated pause state when callbacks are provided (wired
  // from start.ts). Fall back to local boolean when running standalone.
  const hasDaemonCallbacks = !!(opts.onPause && opts.onResume && opts.isPaused);
  let localPaused = opts.paused ?? false;

  const getPaused = (): boolean =>
    hasDaemonCallbacks ? opts.isPaused!() : localPaused;

  // Build the initial status.
  let status = await runStatus({ env, silent: true });
  const atlasUrl = opts.atlasUrl ?? status.atlasUrl ?? null;
  let model = buildTrayModel(status, getPaused(), atlasUrl);

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

  // BP5 — In a Node SEA, extract the bundled tray binary to the systray cache
  // dir before constructing SysTray. systray's copyDir logic finds the file
  // there and skips the broken fs.copySync (which uses __dirname wrong in SEA).
  const seaCacheDir = await extractTrayBinaryIfSea();

  const SysTray = loadSysTray();
  // If we pre-extracted to a specific dir, pass it as copyDir (string path).
  // Otherwise use copyDir: true so systray copies from its own node_modules.
  const trayConfigWithCopyDir = seaCacheDir
    ? { ...trayConfig, copyDir: seaCacheDir }
    : trayConfig;
  const tray = new SysTray(trayConfigWithCopyDir);

  // Polling loop — defined before onClick so refreshTray is in scope.
  async function refreshTray() {
    status = await runStatus({ env, silent: true });
    model = buildTrayModel(status, getPaused(), atlasUrl);
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
      paused: getPaused(),
      atlasUrl,
      env,
      onPausedChange: async (newPaused) => {
        if (hasDaemonCallbacks) {
          // Delegate to the daemon (start.ts wired this in BP4).
          if (newPaused) opts.onPause!(); else opts.onResume!();
        } else {
          localPaused = newPaused;
        }
        await refreshTray();
      },
      onPair: async () => {
        await runPair({ env, silent: false });
        await refreshTray();
      },
    });
  });

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
