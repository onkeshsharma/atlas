/**
 * BP3 — Service registration unit tests.
 *
 * Tests assert the EMITTED SPEC content (plist XML, systemd unit, registry
 * key value) via injectable seams. No OS calls, no real registry writes,
 * no launchctl/systemctl. This is the unit-proof that the right spec is
 * written for each platform.
 *
 * macOS: buildPlist() + install/uninstall/isInstalled via mock fs
 * Linux: buildUnit() + install/uninstall/isInstalled via mock fs
 * Windows: buildRunValue() + install/uninstall/isInstalled via mock registry
 */
import { join } from "node:path";
import { describe, it, expect } from "vitest";

import { buildPlist, createMacosLaunchdRegistrar } from "../src/service/macos-launchd.ts";
import { buildUnit, createLinuxSystemdRegistrar } from "../src/service/linux-systemd.ts";
import { buildRunValue, createWindowsStartupRegistrar } from "../src/service/windows-startup.ts";
import type { ServiceConfig } from "../src/service/types.ts";

// ── Shared test config ──────────────────────────────────────────────────────

const BASE_CONFIG: ServiceConfig = {
  executablePath: "/usr/local/bin/atlas-bridge",
  bridgeHome: null,
  atlasUrl: null,
  label: "io.atlas.bridge",
  logPath: null,
};

const CONFIG_WITH_ENV: ServiceConfig = {
  executablePath: "/usr/local/bin/atlas-bridge",
  bridgeHome: "/home/user/.atlas-bridge",
  atlasUrl: "https://atlas.example.com",
  label: "io.atlas.bridge",
  logPath: "/home/user/.atlas-bridge/bridge.log",
};

// ── macOS launchd plist ────────────────────────────────────────────────────

describe("macOS launchd — buildPlist()", () => {
  it("contains required plist structure", () => {
    const plist = buildPlist(BASE_CONFIG);
    expect(plist).toContain('<?xml version="1.0"');
    expect(plist).toContain("<plist version=\"1.0\">");
    expect(plist).toContain("<key>Label</key>");
    expect(plist).toContain(`<string>${BASE_CONFIG.label}</string>`);
    expect(plist).toContain("<key>ProgramArguments</key>");
    expect(plist).toContain(`<string>${BASE_CONFIG.executablePath}</string>`);
    expect(plist).toContain("<string>start</string>");
    expect(plist).toContain("<key>RunAtLoad</key>");
    expect(plist).toContain("<true/>");
    expect(plist).toContain("<key>KeepAlive</key>");
    expect(plist).toContain("<false/>");
  });

  it("has no EnvironmentVariables block when bridgeHome + atlasUrl are null", () => {
    const plist = buildPlist(BASE_CONFIG);
    expect(plist).not.toContain("<key>EnvironmentVariables</key>");
    expect(plist).not.toContain("ATLAS_BRIDGE_HOME");
    expect(plist).not.toContain("ATLAS_URL");
  });

  it("includes EnvironmentVariables block when bridgeHome is set", () => {
    const plist = buildPlist(CONFIG_WITH_ENV);
    expect(plist).toContain("<key>EnvironmentVariables</key>");
    expect(plist).toContain("<key>ATLAS_BRIDGE_HOME</key>");
    expect(plist).toContain(`<string>${CONFIG_WITH_ENV.bridgeHome}</string>`);
    expect(plist).toContain("<key>ATLAS_URL</key>");
    expect(plist).toContain(`<string>${CONFIG_WITH_ENV.atlasUrl}</string>`);
  });

  it("includes StandardOutPath when logPath is set", () => {
    const plist = buildPlist(CONFIG_WITH_ENV);
    expect(plist).toContain("<key>StandardOutPath</key>");
    expect(plist).toContain(`<string>${CONFIG_WITH_ENV.logPath}</string>`);
    expect(plist).toContain("<key>StandardErrorPath</key>");
  });

  it("no StandardOutPath when logPath is null", () => {
    const plist = buildPlist(BASE_CONFIG);
    expect(plist).not.toContain("<key>StandardOutPath</key>");
  });

  it("plist is valid XML (no unclosed tags at top level)", () => {
    const plist = buildPlist(BASE_CONFIG);
    // Simple structural checks
    expect(plist.startsWith("<?xml")).toBe(true);
    expect(plist.trimEnd().endsWith("</plist>")).toBe(true);
    expect(plist).toContain("</dict>");
  });
});

describe("macOS launchd registrar — install/uninstall/isInstalled", () => {
  const MOCK_LAUNCH_DIR = join("mock", "LaunchAgents");

  it("install writes plist to the correct path", async () => {
    const written: Record<string, string> = {};
    const registrar = createMacosLaunchdRegistrar({
      launchAgentsDir: MOCK_LAUNCH_DIR,
      writeFile: async (path, content) => { written[path] = content; },
      fileExists: async () => false,
      deleteFile: async () => {},
    });

    const specPath = await registrar.install(BASE_CONFIG);
    expect(specPath).toBe(join(MOCK_LAUNCH_DIR, "io.atlas.bridge.plist"));
    expect(written[specPath]).toBeDefined();
    expect(written[specPath]).toContain("<key>Label</key>");
  });

  it("install returns the plist path", async () => {
    const registrar = createMacosLaunchdRegistrar({
      launchAgentsDir: MOCK_LAUNCH_DIR,
      writeFile: async () => {},
      fileExists: async () => false,
      deleteFile: async () => {},
    });
    const path = await registrar.install(BASE_CONFIG);
    expect(path).toBe(join(MOCK_LAUNCH_DIR, "io.atlas.bridge.plist"));
  });

  it("uninstall returns true when file exists", async () => {
    let deleted = false;
    const registrar = createMacosLaunchdRegistrar({
      launchAgentsDir: MOCK_LAUNCH_DIR,
      writeFile: async () => {},
      fileExists: async () => true,
      deleteFile: async () => { deleted = true; },
    });
    const result = await registrar.uninstall(BASE_CONFIG);
    expect(result).toBe(true);
    expect(deleted).toBe(true);
  });

  it("uninstall returns false when file does not exist", async () => {
    let deleted = false;
    const registrar = createMacosLaunchdRegistrar({
      launchAgentsDir: MOCK_LAUNCH_DIR,
      writeFile: async () => {},
      fileExists: async () => false,
      deleteFile: async () => { deleted = true; },
    });
    const result = await registrar.uninstall(BASE_CONFIG);
    expect(result).toBe(false);
    expect(deleted).toBe(false);
  });

  it("isInstalled returns true/false based on fileExists", async () => {
    const makeRegistrar = (exists: boolean) => createMacosLaunchdRegistrar({
      launchAgentsDir: MOCK_LAUNCH_DIR,
      writeFile: async () => {},
      fileExists: async () => exists,
      deleteFile: async () => {},
    });
    expect(await makeRegistrar(true).isInstalled(BASE_CONFIG)).toBe(true);
    expect(await makeRegistrar(false).isInstalled(BASE_CONFIG)).toBe(false);
  });
});

// ── Linux systemd unit ─────────────────────────────────────────────────────

describe("Linux systemd — buildUnit()", () => {
  it("contains required unit sections", () => {
    const unit = buildUnit(BASE_CONFIG);
    expect(unit).toContain("[Unit]");
    expect(unit).toContain("[Service]");
    expect(unit).toContain("[Install]");
  });

  it("ExecStart contains executablePath + start", () => {
    const unit = buildUnit(BASE_CONFIG);
    expect(unit).toContain(`ExecStart=${BASE_CONFIG.executablePath} start`);
  });

  it("WantedBy=default.target (auto-starts as login item)", () => {
    const unit = buildUnit(BASE_CONFIG);
    expect(unit).toContain("WantedBy=default.target");
  });

  it("Restart=on-failure with RestartSec=5", () => {
    const unit = buildUnit(BASE_CONFIG);
    expect(unit).toContain("Restart=on-failure");
    expect(unit).toContain("RestartSec=5");
  });

  it("includes ATLAS_BRIDGE_HOME env line when bridgeHome is set", () => {
    const unit = buildUnit(CONFIG_WITH_ENV);
    expect(unit).toContain(`Environment=ATLAS_BRIDGE_HOME=${CONFIG_WITH_ENV.bridgeHome}`);
    expect(unit).toContain(`Environment=ATLAS_URL=${CONFIG_WITH_ENV.atlasUrl}`);
  });

  it("no Environment lines when bridgeHome + atlasUrl are null", () => {
    const unit = buildUnit(BASE_CONFIG);
    expect(unit).not.toContain("Environment=ATLAS_BRIDGE_HOME");
    expect(unit).not.toContain("Environment=ATLAS_URL");
  });

  it("StandardOutput=append:<logPath> when logPath is set", () => {
    const unit = buildUnit(CONFIG_WITH_ENV);
    expect(unit).toContain(`StandardOutput=append:${CONFIG_WITH_ENV.logPath}`);
    expect(unit).toContain(`StandardError=append:${CONFIG_WITH_ENV.logPath}`);
  });

  it("StandardOutput=journal when logPath is null", () => {
    const unit = buildUnit(BASE_CONFIG);
    expect(unit).toContain("StandardOutput=journal");
    expect(unit).toContain("StandardError=journal");
  });

  it("Description contains the label", () => {
    const unit = buildUnit(BASE_CONFIG);
    expect(unit).toContain(`Atlas Bridge daemon — ${BASE_CONFIG.label}`);
  });
});

describe("Linux systemd registrar — install/uninstall/isInstalled", () => {
  const MOCK_SYSTEMD_DIR = join("mock", ".config", "systemd", "user");

  it("install writes unit to the correct path", async () => {
    const written: Record<string, string> = {};
    const registrar = createLinuxSystemdRegistrar({
      systemdUserDir: MOCK_SYSTEMD_DIR,
      writeFile: async (path, content) => { written[path] = content; },
      fileExists: async () => false,
      deleteFile: async () => {},
    });

    const specPath = await registrar.install(BASE_CONFIG);
    expect(specPath).toBe(join(MOCK_SYSTEMD_DIR, "io.atlas.bridge.service"));
    expect(written[specPath]).toBeDefined();
    expect(written[specPath]).toContain("[Unit]");
  });

  it("uninstall returns true when file exists", async () => {
    let deleted = false;
    const registrar = createLinuxSystemdRegistrar({
      systemdUserDir: MOCK_SYSTEMD_DIR,
      writeFile: async () => {},
      fileExists: async () => true,
      deleteFile: async () => { deleted = true; },
    });
    const result = await registrar.uninstall(BASE_CONFIG);
    expect(result).toBe(true);
    expect(deleted).toBe(true);
  });

  it("uninstall returns false when file does not exist", async () => {
    const registrar = createLinuxSystemdRegistrar({
      systemdUserDir: MOCK_SYSTEMD_DIR,
      writeFile: async () => {},
      fileExists: async () => false,
      deleteFile: async () => {},
    });
    expect(await registrar.uninstall(BASE_CONFIG)).toBe(false);
  });

  it("isInstalled mirrors fileExists", async () => {
    const make = (e: boolean) => createLinuxSystemdRegistrar({
      systemdUserDir: MOCK_SYSTEMD_DIR,
      writeFile: async () => {},
      fileExists: async () => e,
      deleteFile: async () => {},
    });
    expect(await make(true).isInstalled(BASE_CONFIG)).toBe(true);
    expect(await make(false).isInstalled(BASE_CONFIG)).toBe(false);
  });
});

// ── Windows startup Run key ─────────────────────────────────────────────────

describe("Windows startup — buildRunValue()", () => {
  const WIN_CONFIG: ServiceConfig = {
    executablePath: "C:\\Users\\user\\AppData\\Local\\atlas-bridge\\atlas-bridge.exe",
    bridgeHome: null,
    atlasUrl: null,
    label: "io.atlas.bridge",
    logPath: null,
  };

  it("targets the HKCU Run key", () => {
    const { keyPath } = buildRunValue(WIN_CONFIG);
    expect(keyPath).toBe(
      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
    );
  });

  it("valueName equals the label", () => {
    const { valueName } = buildRunValue(WIN_CONFIG);
    expect(valueName).toBe(WIN_CONFIG.label);
  });

  it("valueData contains the executablePath and 'start' command", () => {
    const { valueData } = buildRunValue(WIN_CONFIG);
    expect(valueData).toContain(WIN_CONFIG.executablePath);
    expect(valueData).toContain("start");
  });

  it("valueData wraps path in quotes (handles spaces)", () => {
    const config: ServiceConfig = { ...WIN_CONFIG, executablePath: "C:\\path with spaces\\atlas-bridge.exe" };
    const { valueData } = buildRunValue(config);
    expect(valueData).toContain('"C:\\path with spaces\\atlas-bridge.exe"');
  });

  it("when bridgeHome set, cmd /C wrapper includes ATLAS_BRIDGE_HOME env", () => {
    const config: ServiceConfig = {
      ...WIN_CONFIG,
      bridgeHome: "C:\\Users\\user\\.atlas-bridge",
    };
    const { valueData } = buildRunValue(config);
    expect(valueData).toContain("ATLAS_BRIDGE_HOME=C:\\Users\\user\\.atlas-bridge");
    expect(valueData).toContain("cmd /C");
  });
});

describe("Windows startup registrar — install/uninstall/isInstalled", () => {
  const WIN_CONFIG: ServiceConfig = {
    executablePath: "C:\\atlas-bridge\\atlas-bridge.exe",
    bridgeHome: null,
    atlasUrl: null,
    label: "io.atlas.bridge",
    logPath: null,
  };

  it("install writes to the correct registry key/value", async () => {
    const writes: Array<{ keyPath: string; valueName: string; valueData: string }> = [];
    const registrar = createWindowsStartupRegistrar({
      regWrite: async (keyPath, valueName, valueData) => {
        writes.push({ keyPath, valueName, valueData });
      },
      regDelete: async () => true,
      regRead: async () => null,
    });

    const specPath = await registrar.install(WIN_CONFIG);
    expect(writes).toHaveLength(1);
    expect(writes[0].keyPath).toContain("HKCU");
    expect(writes[0].valueName).toBe(WIN_CONFIG.label);
    expect(specPath).toContain(WIN_CONFIG.label);
  });

  it("uninstall calls regDelete with correct args", async () => {
    const deletes: Array<{ keyPath: string; valueName: string }> = [];
    const registrar = createWindowsStartupRegistrar({
      regWrite: async () => {},
      regDelete: async (keyPath, valueName) => {
        deletes.push({ keyPath, valueName });
        return true;
      },
      regRead: async () => "some-value",
    });

    const result = await registrar.uninstall(WIN_CONFIG);
    expect(result).toBe(true);
    expect(deletes).toHaveLength(1);
    expect(deletes[0].valueName).toBe(WIN_CONFIG.label);
  });

  it("isInstalled returns true when regRead returns a non-null value", async () => {
    const registrar = createWindowsStartupRegistrar({
      regWrite: async () => {},
      regDelete: async () => true,
      regRead: async () => "C:\\atlas-bridge\\atlas-bridge.exe start",
    });
    expect(await registrar.isInstalled(WIN_CONFIG)).toBe(true);
  });

  it("isInstalled returns false when regRead returns null", async () => {
    const registrar = createWindowsStartupRegistrar({
      regWrite: async () => {},
      regDelete: async () => false,
      regRead: async () => null,
    });
    expect(await registrar.isInstalled(WIN_CONFIG)).toBe(false);
  });
});
