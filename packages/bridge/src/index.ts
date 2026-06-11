/**
 * Atlas Bridge — entry point. `node src/index.ts` (Node ≥ 23 runs the
 * TypeScript directly; erasable syntax only). Configuration is env-only:
 *
 *   ATLAS_URL                 https://your-atlas (or http://localhost:3190)
 *   ATLAS_BRIDGE_TOKEN        from scripts/pair-bridge.mjs (shown once)
 *   ATLAS_BRIDGE_ENGINE       real (default) | fake
 *   ATLAS_BRIDGE_DATA_DIR     default ~/.atlas-bridge
 *   ATLAS_BRIDGE_LOCK_PORT    default 9123
 */
import { AtlasClient } from "./atlas-client.ts";
import { loadConfig, BRIDGE_VERSION } from "./config.ts";
import { fakeEngineAdapter } from "./engine/fake.ts";
import { realEngineAdapter } from "./engine/real.ts";
import { Daemon } from "./daemon.ts";
import { acquireInstanceLock } from "./single-instance.ts";

async function main(): Promise<void> {
  const config = loadConfig();
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
  });

  console.log(
    `[bridge] atlas-bridge ${BRIDGE_VERSION} — engine: ${config.engine} · atlas: ${config.atlasUrl}`,
  );

  const shutdown = async (signal: string) => {
    console.log(`[bridge] ${signal} — shutting down`);
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

void main().catch((err) => {
  console.error(`[bridge] ${(err as Error).message}`);
  process.exit(1);
});
