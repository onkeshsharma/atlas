/**
 * BP3 — macOS launchd plist registrar.
 *
 * Writes a LaunchAgent plist to ~/Library/LaunchAgents/<label>.plist.
 * Owner-gated loading (launchctl load) documented in the runbook.
 *
 * ADR-0004 §5: auto-starts, inert until paired, no inbound ports.
 *
 * The plist is written here (buildable on this machine as a spec file).
 * Actual loading/unloading requires `launchctl` which is macOS-only and
 * CANNOT be tested on this Windows host. Unit tests assert the EMITTED SPEC
 * (the plist XML content) via an injectable write seam.
 */
import { join } from "node:path";
import { homedir } from "node:os";
import type { ServiceConfig, ServiceRegistrar } from "./types.ts";

export type WriteFileFn = (path: string, content: string) => Promise<void>;
export type FileExistsFn = (path: string) => Promise<boolean>;
export type DeleteFileFn = (path: string) => Promise<void>;

/** Injectable filesystem seams (replace with real fs in production). */
export type MacosLaunchdSeams = {
  writeFile?: WriteFileFn;
  fileExists?: FileExistsFn;
  deleteFile?: DeleteFileFn;
  /** Override the LaunchAgents dir (for tests). */
  launchAgentsDir?: string;
};

/** Build the plist XML content for the given config. Pure — no side effects. */
export function buildPlist(config: ServiceConfig): string {
  const envBlock: string[] = [];
  if (config.bridgeHome) {
    envBlock.push(`\t\t<key>ATLAS_BRIDGE_HOME</key>\n\t\t<string>${config.bridgeHome}</string>`);
  }
  if (config.atlasUrl) {
    envBlock.push(`\t\t<key>ATLAS_URL</key>\n\t\t<string>${config.atlasUrl}</string>`);
  }

  const logLines = config.logPath
    ? `\t<key>StandardOutPath</key>\n\t<string>${config.logPath}</string>\n\t<key>StandardErrorPath</key>\n\t<string>${config.logPath}</string>\n`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>Label</key>
\t<string>${config.label}</string>
\t<key>ProgramArguments</key>
\t<array>
\t\t<string>${config.executablePath}</string>
\t\t<string>start</string>
\t</array>
${envBlock.length > 0 ? `\t<key>EnvironmentVariables</key>\n\t<dict>\n${envBlock.join("\n")}\n\t</dict>\n` : ""}\t<key>RunAtLoad</key>
\t<true/>
\t<key>KeepAlive</key>
\t<false/>
${logLines}</dict>
</plist>
`;
}

export function createMacosLaunchdRegistrar(seams: MacosLaunchdSeams = {}): ServiceRegistrar {
  const launchAgentsDir = seams.launchAgentsDir ?? join(homedir(), "Library", "LaunchAgents");

  const writeFile: WriteFileFn = seams.writeFile ?? (async (path, content) => {
    const { writeFile: fsWrite, mkdir } = await import("node:fs/promises");
    await mkdir(launchAgentsDir, { recursive: true });
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

  function plistPath(config: ServiceConfig): string {
    return join(launchAgentsDir, `${config.label}.plist`);
  }

  return {
    async install(config) {
      const path = plistPath(config);
      const content = buildPlist(config);
      await writeFile(path, content);
      return path;
    },

    async uninstall(config) {
      const path = plistPath(config);
      const exists = await fileExists(path);
      if (!exists) return false;
      await deleteFile(path);
      return true;
    },

    async isInstalled(config) {
      return fileExists(plistPath(config));
    },
  };
}
