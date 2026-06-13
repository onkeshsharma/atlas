/**
 * BP3 — Windows startup registration via HKCU Run key.
 *
 * Registers the daemon under:
 *   HKCU\Software\Microsoft\Windows\CurrentVersion\Run\<label>
 *
 * This is the Startup-registered approach (not a Windows Service):
 *   - Runs under the current user account
 *   - No admin rights required
 *   - Tray process starts at login with a user session
 *   - ADR-0004 §5: auto-starts at login, inert until paired
 *
 * Alternative (Windows Service) would require admin and runs as SYSTEM or
 * a service account — overkill for a tray app. HKCU Run is the right choice.
 *
 * The registry seam is injectable for tests: the `regWriter` function
 * receives the key path, value name, and value. Tests assert what would be
 * written without touching the real registry.
 */
import type { ServiceConfig, ServiceRegistrar } from "./types.ts";

/** What the Windows registrar writes to the Run key. Pure computation. */
export function buildRunValue(config: ServiceConfig): {
  keyPath: string;
  valueName: string;
  valueData: string;
} {
  const keyPath = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";

  // Build the command string that Windows will run at login.
  // Wrap the executable path in quotes to handle spaces.
  const parts: string[] = [`"${config.executablePath}"`, "start"];
  if (config.bridgeHome) {
    // Inject ATLAS_BRIDGE_HOME via a cmd wrapper so env is set before start.
    // Windows Run key values are raw command strings; wrap in cmd /C with set.
    const envPrefix = `cmd /C "set ATLAS_BRIDGE_HOME=${config.bridgeHome} && `;
    const envSuffix = `"`;
    return {
      keyPath,
      valueName: config.label,
      valueData: `${envPrefix}"${config.executablePath}" start${envSuffix}`,
    };
  }

  return {
    keyPath,
    valueName: config.label,
    valueData: parts.join(" "),
  };
}

export type RegWriter = (keyPath: string, valueName: string, valueData: string) => Promise<void>;
export type RegDeleter = (keyPath: string, valueName: string) => Promise<boolean>;
export type RegReader = (keyPath: string, valueName: string) => Promise<string | null>;

export type WindowsStartupSeams = {
  regWrite?: RegWriter;
  regDelete?: RegDeleter;
  regRead?: RegReader;
};

/** Real registry writer using the `reg` command-line tool (built into Windows). */
async function realRegWrite(keyPath: string, valueName: string, valueData: string): Promise<void> {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    "cmd.exe",
    ["/C", "reg", "add", keyPath, "/v", valueName, "/t", "REG_SZ", "/d", valueData, "/f"],
    { stdio: ["ignore", "pipe", "pipe"], shell: false },
  );
  if (result.status !== 0) {
    const stderr = result.stderr?.toString("utf8") ?? "";
    throw new Error(`reg add failed: ${stderr}`);
  }
}

async function realRegDelete(keyPath: string, valueName: string): Promise<boolean> {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    "cmd.exe",
    ["/C", "reg", "delete", keyPath, "/v", valueName, "/f"],
    { stdio: ["ignore", "pipe", "pipe"], shell: false },
  );
  // Exit 1 means the value didn't exist — not an error for uninstall.
  return result.status === 0;
}

async function realRegRead(keyPath: string, valueName: string): Promise<string | null> {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    "cmd.exe",
    ["/C", "reg", "query", keyPath, "/v", valueName],
    { stdio: ["ignore", "pipe", "pipe"], shell: false },
  );
  if (result.status !== 0) return null;
  const out = result.stdout.toString("utf8");
  // Parse: "    <valueName>    REG_SZ    <value>"
  const match = out.match(/REG_SZ\s+(.+)/);
  return match ? match[1].trim() : null;
}

export function createWindowsStartupRegistrar(seams: WindowsStartupSeams = {}): ServiceRegistrar {
  const regWrite = seams.regWrite ?? realRegWrite;
  const regDelete = seams.regDelete ?? realRegDelete;
  const regRead = seams.regRead ?? realRegRead;

  return {
    async install(config) {
      const { keyPath, valueName, valueData } = buildRunValue(config);
      await regWrite(keyPath, valueName, valueData);
      return `${keyPath}\\${valueName}`;
    },

    async uninstall(config) {
      const { keyPath, valueName } = buildRunValue(config);
      return regDelete(keyPath, valueName);
    },

    async isInstalled(config) {
      const { keyPath, valueName } = buildRunValue(config);
      const value = await regRead(keyPath, valueName);
      return value !== null;
    },
  };
}
