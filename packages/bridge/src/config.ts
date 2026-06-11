/**
 * Daemon configuration — env-driven (v1 prior art: lib/config.ts +
 * lib/args.ts, simplified: v2 pairing is token-only, no config file).
 */
import { homedir } from "node:os";
import { join } from "node:path";

export type EngineFlavor = "real" | "fake";

export type BridgeConfig = {
  atlasUrl: string;
  token: string;
  engine: EngineFlavor;
  /** worktrees + sandboxes live under here. */
  dataDir: string;
  lockPort: number;
  tickMs: number;
  heartbeatMs: number;
  /** wall clock per Engine session. */
  engineTimeoutMs: number;
};

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BridgeConfig {
  const atlasUrl = env.ATLAS_URL?.replace(/\/$/, "");
  const token = env.ATLAS_BRIDGE_TOKEN;
  if (!atlasUrl) throw new Error("ATLAS_URL is not set");
  if (!token) throw new Error("ATLAS_BRIDGE_TOKEN is not set (scripts/pair-bridge.mjs prints one)");
  const engine: EngineFlavor = env.ATLAS_BRIDGE_ENGINE === "fake" ? "fake" : "real";
  return {
    atlasUrl,
    token,
    engine,
    dataDir: env.ATLAS_BRIDGE_DATA_DIR ?? join(homedir(), ".atlas-bridge"),
    lockPort: intEnv("ATLAS_BRIDGE_LOCK_PORT", 9123),
    tickMs: intEnv("ATLAS_BRIDGE_TICK_MS", 1_000),
    heartbeatMs: intEnv("ATLAS_BRIDGE_HEARTBEAT_MS", 30_000),
    engineTimeoutMs: intEnv("ATLAS_BRIDGE_ENGINE_TIMEOUT_MS", 2 * 60 * 60 * 1000),
  };
}

export const BRIDGE_VERSION = "2.0.0-m9";
