/**
 * BP1 — `atlas-bridge status`
 *
 * Prints the machine's-eye status line ONLY (ADR-0004 §2):
 *   online | paired-as | atlas url | engine binary found? | N running
 *
 * Sources of truth (in order):
 *   - Config file / env vars for url, name, engine flavor
 *   - PID file for "is the daemon running"
 *   - `claude --version` for "engine binary found"
 *
 * No run list (ADR-0004 §2: "No run list, no session manager, no second
 * dashboard"). The cockpit is the eyes.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readConfigFile } from "../config-file.ts";
import { execProbe } from "../doctor.ts";

export type StatusResult = {
  running: boolean;
  pid: number | null;
  pairedAs: string | null;
  atlasUrl: string | null;
  engineFound: boolean;
  engineFlavor: string;
};

export async function runStatus(
  opts: {
    env?: NodeJS.ProcessEnv;
    silent?: boolean;
    /** injectable exec seam (for tests) */
    exec?: (cmd: string, args: string[]) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  } = {},
): Promise<StatusResult> {
  const env = opts.env ?? process.env;
  const silent = opts.silent ?? false;
  const log = silent ? () => {} : console.log.bind(console);

  const file = await readConfigFile(env);

  // Resolve data dir
  let dataDir = env.ATLAS_BRIDGE_DATA_DIR ?? file?.dataDir;
  if (!dataDir) {
    const { homedir } = await import("node:os");
    dataDir = join(homedir(), ".atlas-bridge");
  }

  // Is the daemon running? (check PID file)
  let pid: number | null = null;
  let running = false;
  const pidPath = join(dataDir, "bridge.pid");
  try {
    const raw = (await readFile(pidPath, "utf8")).trim();
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) {
      pid = n;
      // Verify the process is actually alive
      try {
        process.kill(pid, 0); // signal 0 = existence check, no signal sent
        running = true;
      } catch {
        running = false; // stale PID
      }
    }
  } catch {
    running = false;
  }

  const atlasUrl = env.ATLAS_URL?.replace(/\/$/, "") ?? file?.url ?? null;
  const pairedAs = file?.name ?? null;
  const engineFlavor = env.ATLAS_BRIDGE_ENGINE ?? file?.engine ?? "real";

  // Check engine binary
  const execFn = opts.exec ?? execProbe;
  let engineFound = false;
  if (engineFlavor === "fake") {
    engineFound = true; // fake engine is always "found"
  } else {
    const result = await execFn("claude", ["--version"]);
    engineFound = result.exitCode === 0;
  }

  const result: StatusResult = {
    running,
    pid,
    pairedAs,
    atlasUrl,
    engineFound,
    engineFlavor,
  };

  if (!silent) {
    const onlineLabel = running ? `online (pid ${pid})` : "offline";
    const pairedLabel = pairedAs ? `paired as "${pairedAs}"` : "not paired";
    const atlasLabel = atlasUrl ?? "no Atlas URL configured";
    const engineLabel = engineFlavor === "fake"
      ? "fake engine"
      : engineFound
      ? "engine binary found"
      : "engine binary NOT found";

    log(`status:   ${onlineLabel}`);
    log(`bridge:   ${pairedLabel}`);
    log(`atlas:    ${atlasLabel}`);
    log(`engine:   ${engineLabel}`);
  }

  return result;
}
