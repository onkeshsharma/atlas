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
 */
import { readConfigFile } from "../config-file.ts";
import { loadConfig, BRIDGE_VERSION } from "../config.ts";
import { AtlasClient } from "../atlas-client.ts";
import { fakeEngineAdapter } from "../engine/fake.ts";
import { realEngineAdapter } from "../engine/real.ts";
import { Daemon } from "../daemon.ts";
import { acquireInstanceLock } from "../single-instance.ts";

export async function runStart(
  opts: { env?: NodeJS.ProcessEnv; silent?: boolean } = {},
): Promise<void> {
  const env = opts.env ?? process.env;
  const silent = opts.silent ?? false;
  const log = silent ? () => {} : console.log.bind(console);

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

  try {
    await daemon.start();
  } catch (err) {
    console.error(`[bridge] fatal: ${(err as Error).message}`);
    await lock.release();
    process.exit(1);
  }
}
