/**
 * BP1 — `atlas-bridge stop`
 *
 * Signals a running daemon to exit cleanly. Uses the single-instance lock
 * to find the PID, then terminates it.
 *
 * Windows-safe: SIGTERM is silently ignored on win32. This mirrors the
 * lesson from scripts/kill-e2e-server.mjs: on Windows we use taskkill.
 * On POSIX we send SIGTERM.
 *
 * The lock port comes from: env > config file > default (9123).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readConfigFile } from "../config-file.ts";

export async function runStop(
  opts: {
    env?: NodeJS.ProcessEnv;
    silent?: boolean;
    /** injectable kill fn for tests */
    kill?: (pid: number) => Promise<boolean>;
  } = {},
): Promise<void> {
  const env = opts.env ?? process.env;
  const silent = opts.silent ?? false;
  const log = silent ? () => {} : console.log.bind(console);
  const errLog = silent ? () => {} : console.error.bind(console);

  // Resolve data dir: env > config file > default
  let dataDir = env.ATLAS_BRIDGE_DATA_DIR;
  if (!dataDir) {
    const file = await readConfigFile(env);
    dataDir = file?.dataDir;
  }
  if (!dataDir) {
    const { homedir } = await import("node:os");
    dataDir = join(homedir(), ".atlas-bridge");
  }

  // Read the PID file written by acquireInstanceLock
  const pidPath = join(dataDir, "bridge.pid");
  let pid: number | null = null;
  try {
    const raw = (await readFile(pidPath, "utf8")).trim();
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) pid = n;
  } catch {
    // No pid file — daemon may not be running
  }

  if (pid === null) {
    errLog("No running atlas-bridge found (no PID file at " + pidPath + ").");
    process.exit(1);
  }

  log(`Stopping atlas-bridge (PID ${pid}) …`);

  const doKill = opts.kill ?? defaultKill;
  const ok = await doKill(pid);

  if (!ok) {
    errLog(`Failed to stop PID ${pid}. It may have already exited.`);
    process.exit(1);
  }

  log("Stopped.");
}

async function defaultKill(pid: number): Promise<boolean> {
  if (process.platform === "win32") {
    // taskkill /F forces immediate termination; /PID <n> targets the process.
    // Mirrors the kill-e2e-server.mjs lesson: SIGTERM is ignored on win32.
    const { exec } = await import("node:child_process");
    return new Promise((resolve) => {
      exec(`taskkill /F /PID ${pid}`, (err) => resolve(!err));
    });
  } else {
    try {
      process.kill(pid, "SIGTERM");
      return true;
    } catch {
      return false;
    }
  }
}
