/**
 * BP1 — persistent config file for the published CLI.
 *
 * File: ~/.atlas-bridge/config.json (override root via ATLAS_BRIDGE_HOME).
 * chmod 600 on write (token security — ADR-0004 §4).
 *
 * Schema: { url, token, name, engine?, cap?, dataDir?, lockPort? }
 *
 * Precedence (highest → lowest):
 *   1. Explicit flag passed at the call site
 *   2. Env var (preserves every ATLAS_BRIDGE_* var from config.ts)
 *   3. Config file
 *   4. Built-in default
 *
 * The daemon STILL boots from pure env vars (e2e recipe depends on it —
 * ADR-0004 §4 "the daemon must still boot from pure env vars exactly as
 * today"). This module is additive: loadConfigFull() builds BridgeConfig
 * by layering file values under env-var values. loadConfig() in config.ts
 * is untouched.
 */
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type ConfigFileSchema = {
  /** Atlas base URL, e.g. https://atlas.example.com */
  url?: string;
  /** raw bearer token (written by `pair`; NEVER printed after write) */
  token?: string;
  /** display name for this machine, e.g. "work-laptop" */
  name?: string;
  /** "real" | "fake" (defaults to "real") */
  engine?: string;
  /** run concurrency cap override */
  cap?: number;
  /** data dir for worktrees/sandboxes (defaults to the config dir itself) */
  dataDir?: string;
  /** TCP port for the single-instance lock (default 9123) */
  lockPort?: number;
};

function configDir(env: NodeJS.ProcessEnv = process.env): string {
  const home = env.ATLAS_BRIDGE_HOME ?? join(homedir(), ".atlas-bridge");
  return home;
}

export function configFilePath(env: NodeJS.ProcessEnv = process.env): string {
  return join(configDir(env), "config.json");
}

export async function readConfigFile(
  env: NodeJS.ProcessEnv = process.env,
): Promise<ConfigFileSchema | null> {
  const path = configFilePath(env);
  try {
    const raw = await readFile(path, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return parsed as ConfigFileSchema;
  } catch {
    return null;
  }
}

export async function writeConfigFile(
  data: ConfigFileSchema,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const dir = configDir(env);
  const path = configFilePath(env);
  await mkdir(dir, { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o600 });
  // Re-apply chmod 600 after write in case the file already existed with looser perms
  // (writeFile mode only applies to new files on some platforms).
  await chmod(path, 0o600).catch(() => {
    // Windows does not support POSIX modes — best-effort only.
  });
}

export async function mergeConfigFile(
  update: Partial<ConfigFileSchema>,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const existing = (await readConfigFile(env)) ?? {};
  await writeConfigFile({ ...existing, ...update }, env);
}
