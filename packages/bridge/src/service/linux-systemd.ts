/**
 * BP3 — Linux systemd user-unit registrar.
 *
 * Writes a systemd user service unit to
 * ~/.config/systemd/user/<label>.service.
 *
 * Owner-gated activation:
 *   systemctl --user daemon-reload
 *   systemctl --user enable <label>.service
 *   systemctl --user start  <label>.service
 *
 * Unit tests assert the EMITTED SPEC (unit file content) via an injectable
 * write seam — no systemd required in the test environment.
 *
 * ADR-0004 §5: auto-starts (WantedBy=default.target), inert until paired,
 * no inbound ports.
 */
import { join } from "node:path";
import { homedir } from "node:os";
import type { ServiceConfig, ServiceRegistrar } from "./types.ts";

export type WriteFileFn = (path: string, content: string) => Promise<void>;
export type FileExistsFn = (path: string) => Promise<boolean>;
export type DeleteFileFn = (path: string) => Promise<void>;

export type LinuxSystemdSeams = {
  writeFile?: WriteFileFn;
  fileExists?: FileExistsFn;
  deleteFile?: DeleteFileFn;
  /** Override the systemd user dir (for tests). */
  systemdUserDir?: string;
};

/** Build the systemd unit content for the given config. Pure. */
export function buildUnit(config: ServiceConfig): string {
  const envLines: string[] = [];
  if (config.bridgeHome) {
    envLines.push(`Environment=ATLAS_BRIDGE_HOME=${config.bridgeHome}`);
  }
  if (config.atlasUrl) {
    envLines.push(`Environment=ATLAS_URL=${config.atlasUrl}`);
  }

  const logLine = config.logPath
    ? `StandardOutput=append:${config.logPath}\nStandardError=append:${config.logPath}`
    : "StandardOutput=journal\nStandardError=journal";

  return `[Unit]
Description=Atlas Bridge daemon — ${config.label}
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${config.executablePath} start
Restart=on-failure
RestartSec=5
${envLines.join("\n")}${envLines.length > 0 ? "\n" : ""}${logLine}

[Install]
WantedBy=default.target
`;
}

export function createLinuxSystemdRegistrar(seams: LinuxSystemdSeams = {}): ServiceRegistrar {
  const systemdUserDir =
    seams.systemdUserDir ?? join(homedir(), ".config", "systemd", "user");

  const writeFile: WriteFileFn = seams.writeFile ?? (async (path, content) => {
    const { writeFile: fsWrite, mkdir } = await import("node:fs/promises");
    await mkdir(systemdUserDir, { recursive: true });
    await fsWrite(path, content, "utf8");
  });

  const fileExists: FileExistsFn = seams.fileExists ?? (async (path) => {
    const { access } = await import("node:fs/promises");
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  });

  const deleteFile: DeleteFileFn = seams.deleteFile ?? (async (path) => {
    const { rm } = await import("node:fs/promises");
    await rm(path, { force: true });
  });

  function unitPath(config: ServiceConfig): string {
    return join(systemdUserDir, `${config.label}.service`);
  }

  return {
    async install(config) {
      const path = unitPath(config);
      const content = buildUnit(config);
      await writeFile(path, content);
      return path;
    },

    async uninstall(config) {
      const path = unitPath(config);
      const exists = await fileExists(path);
      if (!exists) return false;
      await deleteFile(path);
      return true;
    },

    async isInstalled(config) {
      return fileExists(unitPath(config));
    },
  };
}
