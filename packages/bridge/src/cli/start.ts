/**
 * BP1 — `atlas-bridge start`
 *
 * Reads the config file, merges env vars (env wins over file), then
 * invokes the existing daemon entry logic with NO behavioral change.
 *
 * Precedence: explicit flag > env var > config file > default
 * (preserves every ATLAS_BRIDGE_* env var from config.ts).
 *
 * The daemon MUST still boot from pure env vars with no config file —
 * the e2e recipe (M9A-handoff "daemon for e2e") depends on this.
 * This module is ADDITIVE: we backfill env vars from the config file
 * only when those vars are absent, then hand off to loadConfig().
 *
 * BP4 — Tray wiring (ADR-0004 §2):
 *   On an interactive desktop run, `startTray()` is called AFTER the daemon
 *   starts. Tray failure is NON-FATAL: a single log line is emitted and the
 *   daemon continues headlessly. Set ATLAS_BRIDGE_NO_TRAY=1 to suppress the
 *   tray (used in tests/e2e/CI so the daemon-spawn specs never pop a tray or
 *   hang).
 *
 * BP5 — Detached / windowless mode (`--detached` flag):
 *   When `--detached` is passed, `start` re-spawns itself as a hidden,
 *   detached background process and exits immediately. This prevents a
 *   foreground console window at login (HKCU Run) or after install.
 *   The child process uses `--foreground` to skip the re-spawn loop.
 *   Without either flag, `start` runs in the foreground (unchanged for
 *   CI / NO_TRAY / debug use-cases).
 */
import { readConfigFile } from "../config-file.ts";
import { loadConfig, BRIDGE_VERSION } from "../config.ts";
import { AtlasClient } from "../atlas-client.ts";
import { fakeEngineAdapter } from "../engine/fake.ts";
import { realEngineAdapter } from "../engine/real.ts";
import { Daemon } from "../daemon.ts";
import { acquireInstanceLock } from "../single-instance.ts";

/**
 * Returns true when the tray should be started.
 *
 * Suppressed when:
 *   - ATLAS_BRIDGE_NO_TRAY=1 (tests, e2e, CI, headless servers)
 *   - Not running on a platform that has a desktop (win32/darwin/linux with DISPLAY)
 *   - Running without a TTY (piped / non-interactive)
 */
function shouldStartTray(env: NodeJS.ProcessEnv): boolean {
  if (env.ATLAS_BRIDGE_NO_TRAY === "1") return false;
  const platform = process.platform;
  if (platform !== "win32" && platform !== "darwin") {
    // Linux: only if DISPLAY is set (X11 or XWayland — headless servers won't have it)
    if (!env.DISPLAY && !env.WAYLAND_DISPLAY) return false;
  }
  return true;
}

/**
 * Spawn a detached, windowless copy of the daemon and return immediately.
 *
 * On Windows, Start-Process … -WindowStyle Hidden achieves the same effect
 * but we need a cross-platform approach here; instead we use Node's built-in
 * spawn with { detached: true, windowsHide: true } so no console window flashes.
 *
 * The child receives the same argv minus `--detached`, plus `--foreground` so
 * the child runs the daemon instead of re-spawning again.
 */
async function spawnDetached(): Promise<void> {
  const { spawn } = await import("node:child_process");
  // Strip --detached from the original args; add --foreground for the child.
  const childArgs = process.argv
    .slice(2)
    .filter((a) => a !== "--detached")
    .concat("--foreground");

  // In a Node SEA binary, process.execPath IS the binary and the SEA's main
  // is a virtual entry — we must NOT pass process.argv[1] to the child spawn
  // or the OS will try to find a script file that doesn't exist on disk.
  // Detect SEA mode and skip the script-path argument accordingly.
  let isSea = false;
  try {
    const sea = await import("node:sea");
    isSea = sea.isSea();
  } catch {
    isSea = false;
  }

  // SEA: `atlas-bridge.exe start --foreground`
  // Source: `node [execArgv] src/cli/index.ts start --foreground`
  const spawnArgs = isSea
    ? [...process.execArgv, ...childArgs]
    : [...process.execArgv, process.argv[1], ...childArgs];

  const child = spawn(process.execPath, spawnArgs, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  // Give the child a moment to write its PID lock before we exit, so callers
  // (install scripts) can reliably check status afterwards.
  await new Promise<void>((resolve) => setTimeout(resolve, 600));
}

export async function runStart(
  opts: { env?: NodeJS.ProcessEnv; silent?: boolean; argv?: string[] } = {},
): Promise<void> {
  const env = opts.env ?? process.env;
  const silent = opts.silent ?? false;
  const log = silent ? () => {} : console.log.bind(console);

  // BP5 — Detached mode: re-spawn hidden and exit (the child uses --foreground).
  const argv = opts.argv ?? process.argv.slice(2);
  const isDetached = argv.includes("--detached");
  const isForeground = argv.includes("--foreground");
  if (isDetached && !isForeground) {
    await spawnDetached();
    return;
  }

  // Back-fill env vars from the config file (only where not already set).
  const file = await readConfigFile(env);
  if (file) {
    if (!env.ATLAS_URL && file.url) env.ATLAS_URL = file.url;
    if (!env.ATLAS_BRIDGE_TOKEN && file.token) env.ATLAS_BRIDGE_TOKEN = file.token;
    if (!env.ATLAS_BRIDGE_ENGINE && file.engine) env.ATLAS_BRIDGE_ENGINE = file.engine;
    if (!env.ATLAS_BRIDGE_DATA_DIR && file.dataDir) env.ATLAS_BRIDGE_DATA_DIR = file.dataDir;
    if (!env.ATLAS_BRIDGE_LOCK_PORT && file.lockPort != null)
      env.ATLAS_BRIDGE_LOCK_PORT = String(file.lockPort);
  }

  // Now hand off to the existing env-based config loader (unchanged).
  const config = loadConfig(env);
  const lock = await acquireInstanceLock({ port: config.lockPort, dataDir: config.dataDir });

  const engine = config.engine === "fake" ? fakeEngineAdapter() : realEngineAdapter();
  const client = new AtlasClient({ atlasUrl: config.atlasUrl, token: config.token });
  const daemon = new Daemon({
    client,
    engine,
    atlasUrl: config.atlasUrl,
    token: config.token,
    dataDir: config.dataDir,
    tickMs: config.tickMs,
    heartbeatMs: config.heartbeatMs,
    engineTimeoutMs: config.engineTimeoutMs,
    lockPort: lock.port,
  });

  log(
    `[bridge] atlas-bridge ${BRIDGE_VERSION} — engine: ${config.engine} · atlas: ${config.atlasUrl}`,
  );

  const shutdown = async (signal: string) => {
    log(`[bridge] ${signal} — shutting down`);
    await daemon.stop();
    await lock.release();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  // BP4 — Tray wiring (ADR-0004 §2): NON-FATAL, NO_TRAY-suppressible.
  //
  // The tray is started AFTER daemon setup but BEFORE daemon.start() so that
  // the icon appears promptly. If the tray fails to launch (no desktop, missing
  // native binary, etc.), we log one line and continue headlessly — the daemon
  // MUST NOT crash or block because of a tray failure.
  //
  // Pause/resume: the tray's pause/resume actions call daemon.setPaused(bool),
  // which controls whether the daemon starts new runs (connection stays alive).
  if (shouldStartTray(env)) {
    void (async () => {
      try {
        const { startTray } = await import("../tray/menubar-tray.ts");
        await startTray({
          atlasUrl: config.atlasUrl || null,
          paused: false,
          bridgeHome: env.ATLAS_BRIDGE_HOME,
          onPause: () => daemon.setPaused(true),
          onResume: () => daemon.setPaused(false),
          isPaused: () => daemon.isPaused(),
        });
      } catch (err) {
        // NON-FATAL: tray fallback — headless or no native desktop. This is
        // expected in CI/SSH/WSL. The daemon runs normally without the icon.
        log(`[bridge] tray not available, running headless: ${(err as Error).message}`);
      }
    })();
  }

  try {
    await daemon.start();
  } catch (err) {
    console.error(`[bridge] fatal: ${(err as Error).message}`);
    await lock.release();
    process.exit(1);
  }
}
