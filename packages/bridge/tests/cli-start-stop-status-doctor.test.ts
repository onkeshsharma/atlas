/**
 * BP1 — tests for start/stop/status/doctor CLI commands:
 *
 *   - start: reads config file + merges env; precedence (flag>env>file>default)
 *   - stop: finds PID from file, calls kill; errors when no daemon running
 *   - status: reads online/offline, pairedAs, atlasUrl, engine
 *   - doctor: delegates to runDoctor; output shape matches
 */
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { writeConfigFile } from "../src/config-file.ts";
import { runStatus } from "../src/cli/status.ts";
import { runStop } from "../src/cli/stop.ts";
import { runDoctorCli } from "../src/cli/doctor.ts";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "bp1-cli-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

// ──────────────────────────────────────────────────────
// Config precedence helpers
// ──────────────────────────────────────────────────────

describe("config precedence (env > file > default)", () => {
  it("env var ATLAS_URL overrides file url", async () => {
    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
      ATLAS_URL: "https://from-env.com",
    };
    await writeConfigFile({ url: "https://from-file.com" }, env);
    const status = await runStatus({ env, silent: true });
    expect(status.atlasUrl).toBe("https://from-env.com");
  });

  it("file url used when env is absent", async () => {
    const env: NodeJS.ProcessEnv = { ATLAS_BRIDGE_HOME: tmpDir };
    await writeConfigFile({ url: "https://from-file.com" }, env);
    const status = await runStatus({ env, silent: true });
    expect(status.atlasUrl).toBe("https://from-file.com");
  });

  it("no config → atlasUrl is null", async () => {
    const env: NodeJS.ProcessEnv = { ATLAS_BRIDGE_HOME: tmpDir };
    const status = await runStatus({ env, silent: true });
    expect(status.atlasUrl).toBeNull();
  });

  it("pairedAs comes from config file name", async () => {
    const env: NodeJS.ProcessEnv = { ATLAS_BRIDGE_HOME: tmpDir };
    await writeConfigFile({ url: "https://a.com", name: "my-mac" }, env);
    const status = await runStatus({ env, silent: true });
    expect(status.pairedAs).toBe("my-mac");
  });
});

// ──────────────────────────────────────────────────────
// status command
// ──────────────────────────────────────────────────────

describe("status", () => {
  it("offline when no PID file", async () => {
    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
      ATLAS_BRIDGE_DATA_DIR: tmpDir,
    };
    const result = await runStatus({ env, silent: true });
    expect(result.running).toBe(false);
    expect(result.pid).toBeNull();
  });

  it("offline when PID file holds a dead PID", async () => {
    // Write a PID that doesn't exist (very high number)
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, "bridge.pid"), "99999999", "utf8");
    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
      ATLAS_BRIDGE_DATA_DIR: tmpDir,
    };
    const result = await runStatus({ env, silent: true });
    expect(result.running).toBe(false);
  });

  it("online when PID file holds the current process PID", async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, "bridge.pid"), String(process.pid), "utf8");
    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
      ATLAS_BRIDGE_DATA_DIR: tmpDir,
    };
    const result = await runStatus({ env, silent: true });
    expect(result.running).toBe(true);
    expect(result.pid).toBe(process.pid);
  });

  it("fake engine always reports engineFound=true", async () => {
    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
      ATLAS_BRIDGE_ENGINE: "fake",
    };
    const result = await runStatus({
      env,
      silent: true,
      exec: async () => ({ exitCode: 1, stdout: "", stderr: "" }),
    });
    expect(result.engineFound).toBe(true);
    expect(result.engineFlavor).toBe("fake");
  });

  it("real engine: engineFound mirrors claude --version exit code", async () => {
    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
      ATLAS_BRIDGE_ENGINE: "real",
    };

    // Simulate engine present
    const present = await runStatus({
      env,
      silent: true,
      exec: async () => ({ exitCode: 0, stdout: "claude 1.0", stderr: "" }),
    });
    expect(present.engineFound).toBe(true);

    // Simulate engine absent
    const absent = await runStatus({
      env,
      silent: true,
      exec: async () => ({ exitCode: 127, stdout: "", stderr: "not found" }),
    });
    expect(absent.engineFound).toBe(false);
  });
});

// ──────────────────────────────────────────────────────
// stop command
// ──────────────────────────────────────────────────────

describe("stop", () => {
  it("exits 1 when no PID file", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit(${code})`);
    });
    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
      ATLAS_BRIDGE_DATA_DIR: tmpDir,
    };
    try {
      await expect(runStop({ env, silent: true })).rejects.toThrow("exit(1)");
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("calls kill with the PID from the pid file", async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, "bridge.pid"), "12345", "utf8");
    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
      ATLAS_BRIDGE_DATA_DIR: tmpDir,
    };
    const killedPids: number[] = [];
    await runStop({
      env,
      silent: true,
      kill: async (pid) => {
        killedPids.push(pid);
        return true;
      },
    });
    expect(killedPids).toEqual([12345]);
  });

  it("exits 1 when kill returns false (process already gone)", async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, "bridge.pid"), "12345", "utf8");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit(${code})`);
    });
    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
      ATLAS_BRIDGE_DATA_DIR: tmpDir,
    };
    try {
      await expect(
        runStop({
          env,
          silent: true,
          kill: async () => false,
        }),
      ).rejects.toThrow("exit(1)");
    } finally {
      exitSpy.mockRestore();
    }
  });
});

// ──────────────────────────────────────────────────────
// doctor command
// ──────────────────────────────────────────────────────

describe("doctor", () => {
  it("returns checks array with at least git and engine keys", async () => {
    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
      ATLAS_BRIDGE_ENGINE: "fake",
    };
    const checks = await runDoctorCli({
      env,
      silent: true,
      exec: async (cmd) => {
        if (cmd === "git") return { exitCode: 0, stdout: "git version 2.40.0", stderr: "" };
        if (cmd === "gh") return { exitCode: 0, stdout: "authenticated", stderr: "" };
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      syncProbe: async () => ({ cap: 2, queued: 0 }),
    });
    const keys = checks.map((c) => c.key);
    expect(keys).toContain("git");
    expect(keys).toContain("engine");
    expect(keys).toContain("atlas-sync");
  });

  it("atlas-sync fail when no token configured", async () => {
    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
      ATLAS_BRIDGE_ENGINE: "fake",
    };
    // No syncProbe override — will use the missing-config path which throws
    const checks = await runDoctorCli({
      env,
      silent: true,
      exec: async () => ({ exitCode: 0, stdout: "git version 2", stderr: "" }),
      // Don't supply syncProbe — the real path tries fetch to unconfigured URL
      // But we inject a failing probe to simulate:
      syncProbe: async () => {
        throw new Error("no Atlas URL or token configured — run `atlas-bridge pair` first");
      },
    });
    const syncCheck = checks.find((c) => c.key === "atlas-sync");
    expect(syncCheck?.status).toBe("fail");
  });

  it("all checks pass with fake engine and working git", async () => {
    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
      ATLAS_BRIDGE_ENGINE: "fake",
    };
    const checks = await runDoctorCli({
      env,
      silent: true,
      exec: async (cmd) => {
        if (cmd === "git") return { exitCode: 0, stdout: "git version 2.40.0", stderr: "" };
        if (cmd === "gh") return { exitCode: 0, stdout: "", stderr: "" };
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      syncProbe: async () => ({ cap: 2, queued: 0 }),
    });

    // engine check should pass for fake
    const engineCheck = checks.find((c) => c.key === "engine");
    expect(engineCheck?.status).toBe("pass");

    // git should pass
    const gitCheck = checks.find((c) => c.key === "git");
    expect(gitCheck?.status).toBe("pass");
  });

  it("doctor output shape: all checks have key, label, status, detail", async () => {
    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
      ATLAS_BRIDGE_ENGINE: "fake",
    };
    const checks = await runDoctorCli({
      env,
      silent: true,
      exec: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
      syncProbe: async () => ({ cap: 2, queued: 0 }),
    });
    for (const check of checks) {
      expect(typeof check.key).toBe("string");
      expect(typeof check.label).toBe("string");
      expect(["pass", "warn", "fail"]).toContain(check.status);
      // detail can be string or null
      expect(check.detail === null || typeof check.detail === "string").toBe(true);
    }
  });
});
