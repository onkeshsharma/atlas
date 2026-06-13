/**
 * BP1 — tests for the config file module:
 *   - read returns null when absent
 *   - write + read round-trip
 *   - merge preserves existing keys
 *   - chmod 600 applied (posix only)
 *   - ATLAS_BRIDGE_HOME overrides the path
 */
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  readConfigFile,
  writeConfigFile,
  mergeConfigFile,
  configFilePath,
} from "../src/config-file.ts";

let tmpDir: string;
let env: NodeJS.ProcessEnv;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "bp1-config-"));
  env = { ATLAS_BRIDGE_HOME: tmpDir };
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

describe("config-file", () => {
  it("returns null when the file does not exist", async () => {
    const result = await readConfigFile(env);
    expect(result).toBeNull();
  });

  it("write + read round-trips all fields", async () => {
    await writeConfigFile(
      { url: "https://atlas.example.com", token: "tok", name: "my-laptop", lockPort: 9200 },
      env,
    );
    const result = await readConfigFile(env);
    expect(result).toMatchObject({
      url: "https://atlas.example.com",
      name: "my-laptop",
      lockPort: 9200,
    });
    // token round-trips (we need to read it back to verify the write —
    // it is never PRINTED, but the file must hold it)
    expect(result?.token).toBe("tok");
  });

  it("chmod 600 applied on write (posix only)", async () => {
    await writeConfigFile({ url: "https://example.com" }, env);
    const s = await stat(configFilePath(env));
    if (process.platform !== "win32") {
      // On POSIX, mode & 0o777 should be 0o600
      expect(s.mode & 0o777).toBe(0o600);
    }
    // On Windows the call is best-effort — just assert the file exists
    expect(s.isFile()).toBe(true);
  });

  it("merge preserves keys not in the update", async () => {
    await writeConfigFile({ url: "https://a.com", name: "box", token: "old-tok" }, env);
    await mergeConfigFile({ token: "new-tok" }, env);
    const result = await readConfigFile(env);
    expect(result?.url).toBe("https://a.com");
    expect(result?.name).toBe("box");
    expect(result?.token).toBe("new-tok");
  });

  it("ATLAS_BRIDGE_HOME overrides the config directory", async () => {
    const alt = await mkdtemp(join(tmpdir(), "bp1-alt-"));
    const altEnv: NodeJS.ProcessEnv = { ATLAS_BRIDGE_HOME: alt };
    try {
      await writeConfigFile({ url: "https://alt.com" }, altEnv);
      const result = await readConfigFile(altEnv);
      expect(result?.url).toBe("https://alt.com");
      // original env's config file is still absent
      expect(await readConfigFile(env)).toBeNull();
    } finally {
      await rm(alt, { recursive: true, force: true }).catch(() => {});
    }
  });
});
