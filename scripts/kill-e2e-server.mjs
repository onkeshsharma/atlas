#!/usr/bin/env node
/**
 * M16 consecutive-run fix (Layer 3): before every `pnpm test:e2e` run,
 * kill any process already listening on the e2e port AND wipe the .next-e2e
 * cache directory so Playwright always starts with a clean dev server.
 *
 * WHY — two compounding issues:
 *
 * 1. PROCESS REUSE: `reuseExistingServer: !CI` in playwright.config.ts keeps
 *    the dev server alive between `pnpm test:e2e` invocations locally.
 *    After ~15 minutes of operation the Next.js 16 dev mode route resolver
 *    degrades: `/api/bridge/runs/[id]/claim` starts returning 404.
 *
 * 2. CACHE CORRUPTION: Even after the old process is killed, the `.next-e2e`
 *    directory retains a stale cache from the degraded server. A fresh Node
 *    process that inherits this cache reproduces the same 404s immediately.
 *    Deleting the cache directory forces a full re-compilation on the next
 *    `pnpm dev --port 3100` invocation (~30 s), giving a genuinely clean slate.
 *
 * Runs as the `pretest:e2e` npm lifecycle hook so it fires automatically
 * before every `pnpm test:e2e` call.  Failure is non-fatal — the suite
 * proceeds even if the kill or cache wipe fails.
 *
 * Cross-platform: `net` probes the port; `netstat` (Windows) or `lsof`
 * (macOS/Linux) locates the PID; `taskkill /F` (Windows) or SIGTERM
 * (macOS/Linux) terminates the process; port-free confirmation before wipe.
 *
 * IMPORTANT — Windows SIGTERM caveat: Node.js on Windows does not honour
 * SIGTERM reliably (the process may ignore it). We use `taskkill /F /PID`
 * on Windows which is a hard kernel-level termination that cannot be ignored,
 * then verify the port is actually free before deleting the cache.  If we
 * delete the cache while the server is still alive we corrupt its build state
 * and dynamic routes (like /api/bridge/runs/[id]/claim) start returning 404.
 */

import { execSync } from "child_process";
import { rmSync, existsSync } from "fs";
import { resolve } from "path";
import net from "net";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const PORT = Number(process.env.ATLAS_E2E_PORT ?? 3100);
const DIST_DIR = process.env.ATLAS_E2E_DISTDIR ?? ".next-e2e";
// Script lives in scripts/, cwd is the repo root when run via pnpm lifecycle.
const DIST_PATH = resolve(process.cwd(), DIST_DIR);

/** Returns true if something is already listening on PORT. */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", (err) => {
      if (err.code === "EADDRINUSE") resolve(true);
      else resolve(false);
    });
    srv.once("listening", () => {
      srv.close(() => resolve(false));
    });
    srv.listen(port, "127.0.0.1");
  });
}

/** Find PIDs listening on PORT via platform-specific command. */
function findPids(port) {
  try {
    const isWindows = process.platform === "win32";
    if (isWindows) {
      // netstat -ano -p TCP | findstr :<PORT>  (LISTENING lines)
      const out = execSync(
        `netstat -ano -p TCP 2>nul | findstr ":${port} "`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
      );
      const pids = new Set();
      for (const line of out.split("\n")) {
        if (!line.includes("LISTENING")) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(pid)) pids.add(pid);
      }
      return [...pids];
    } else {
      // lsof -ti TCP:PORT (macOS + Linux)
      const out = execSync(`lsof -ti TCP:${port}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      return out
        .trim()
        .split("\n")
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0);
    }
  } catch {
    return [];
  }
}

/**
 * Kill a PID.  On Windows we use `taskkill /F /PID` which is a hard kernel-
 * level termination.  On POSIX we send SIGTERM and let the process clean up.
 */
function killPid(pid) {
  if (process.platform === "win32") {
    try {
      // /T kills the whole process tree (parent + any spawned workers).
      // /F forces immediate termination without waiting for graceful exit.
      execSync(`taskkill /F /T /PID ${pid} 2>nul`, {
        stdio: "ignore",
        encoding: "utf8",
      });
      console.log(`[kill-e2e-server] taskkill /F /T /PID ${pid} on port ${PORT}`);
    } catch (err) {
      console.error(
        `[kill-e2e-server] taskkill failed for PID ${pid}: ${err.message}`
      );
    }
  } else {
    try {
      process.kill(pid, "SIGTERM");
      console.log(`[kill-e2e-server] SIGTERM PID ${pid} on port ${PORT}`);
    } catch (err) {
      console.error(
        `[kill-e2e-server] could not kill PID ${pid}: ${err.message}`
      );
    }
  }
}

/**
 * Wait until PORT is no longer in use, up to maxMs milliseconds.
 * Returns true if the port freed within the deadline, false otherwise.
 */
async function waitForPortFree(port, maxMs = 8_000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const inUse = await isPortInUse(port);
    if (!inUse) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/** Delete the Next.js e2e dev cache so the new server compiles clean. */
function wipeCacheDir(dirPath) {
  if (!existsSync(dirPath)) return;
  try {
    rmSync(dirPath, { recursive: true, force: true });
    console.log(`[kill-e2e-server] wiped ${dirPath}`);
  } catch (err) {
    console.error(
      `[kill-e2e-server] could not wipe ${dirPath}: ${err.message} (non-fatal)`
    );
  }
}

async function main() {
  const inUse = await isPortInUse(PORT);

  if (inUse) {
    const pids = findPids(PORT);
    if (pids.length === 0) {
      console.error(
        `[kill-e2e-server] port ${PORT} appears in use but PID lookup failed — proceeding anyway`
      );
    }
    for (const pid of pids) {
      killPid(pid);
    }

    // Wait until the port is actually free before we wipe the cache.
    // This is critical on Windows: if the server is still alive and we
    // delete .next-e2e under it, dynamic API routes (e.g. /api/bridge/runs/
    // [id]/claim) immediately start returning 404 because their compiled
    // bundles are gone.  On Windows taskkill /F is synchronous (the process
    // is dead when the command returns) so this loop exits almost immediately.
    const freed = await waitForPortFree(PORT, 8_000);
    if (!freed) {
      console.error(
        `[kill-e2e-server] port ${PORT} did not free within 8 s — wiping cache anyway (risky)`
      );
    } else {
      console.log(`[kill-e2e-server] port ${PORT} is free`);
    }
  }

  // ALWAYS wipe the cache, whether or not a server was running.
  // A stale .next-e2e left by a previously degraded server reproduces the
  // same 404s even with a brand-new Node process.
  wipeCacheDir(DIST_PATH);

  process.exit(0);
}

main().catch((err) => {
  console.error(`[kill-e2e-server] unexpected error: ${err.message}`);
  process.exit(0); // non-fatal — always let the suite proceed
});
