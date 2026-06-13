/**
 * BP1 — `atlas-bridge doctor`
 *
 * Runs the existing M10 doctor checks locally (packages/bridge/src/doctor.ts)
 * and prints them. This is the LOCAL preflight — it doesn't require a running
 * daemon or an Atlas instance to return results (except for the atlas-sync
 * check, which probes the real Atlas if configured).
 *
 * Sources: config file, env vars. The atlas-sync check is skipped if no
 * URL/token is configured (prints warn instead of fail).
 */
import { readConfigFile } from "../config-file.ts";
import { runDoctor, execProbe } from "../doctor.ts";
import { BRIDGE_VERSION } from "../config.ts";
import type { DoctorCheck } from "../protocol.ts";

export async function runDoctorCli(
  opts: {
    env?: NodeJS.ProcessEnv;
    silent?: boolean;
    exec?: Parameters<typeof runDoctor>[0]["exec"];
    syncProbe?: () => Promise<{ cap: number; queued: number }>;
  } = {},
): Promise<DoctorCheck[]> {
  const env = opts.env ?? process.env;
  const silent = opts.silent ?? false;
  const log = silent ? () => {} : console.log.bind(console);

  const file = await readConfigFile(env);
  const atlasUrl = env.ATLAS_URL?.replace(/\/$/, "") ?? file?.url ?? null;
  const token = env.ATLAS_BRIDGE_TOKEN ?? file?.token ?? null;
  const engineFlavor = (env.ATLAS_BRIDGE_ENGINE ?? file?.engine ?? "real") as "real" | "fake";

  let dataDir = env.ATLAS_BRIDGE_DATA_DIR ?? file?.dataDir;
  if (!dataDir) {
    const { homedir } = await import("node:os");
    const { join } = await import("node:path");
    dataDir = join(homedir(), ".atlas-bridge");
  }

  const lockPortRaw = env.ATLAS_BRIDGE_LOCK_PORT ?? (file?.lockPort != null ? String(file.lockPort) : null);
  const lockPort = lockPortRaw ? parseInt(lockPortRaw, 10) : 9123;

  // Build a sync probe: if URL + token present, hit the real endpoint;
  // otherwise skip (warn).
  let syncProbe: () => Promise<{ cap: number; queued: number }>;
  if (opts.syncProbe) {
    syncProbe = opts.syncProbe;
  } else if (atlasUrl && token) {
    syncProbe = async () => {
      const res = await fetch(`${atlasUrl}/api/bridge/sync`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const body = (await res.json()) as { cap?: number; queued?: unknown[] };
      return {
        cap: typeof body.cap === "number" ? body.cap : 0,
        queued: Array.isArray(body.queued) ? body.queued.length : 0,
      };
    };
  } else {
    syncProbe = async () => {
      throw new Error("no Atlas URL or token configured — run `atlas-bridge pair` first");
    };
  }

  const result = await runDoctor({
    projects: [],
    keepWorktreeRunIds: [],
    version: BRIDGE_VERSION,
    engine: engineFlavor,
    lockPort,
    dataDir,
    runningRunIds: [],
    exec: opts.exec ?? execProbe,
    syncProbe,
  });

  if (!silent) {
    log(`atlas-bridge doctor — ${result.ranAt}`);
    log(`version: ${result.version}  engine: ${result.engine}  lock: ${result.lockPort}`);
    log("");
    for (const check of result.checks) {
      const icon = check.status === "pass" ? "✓" : check.status === "warn" ? "⚠" : "✗";
      const detail = check.detail ? `  ${check.detail}` : "";
      log(`  ${icon}  ${check.label}${detail}`);
    }
  }

  return result.checks;
}
