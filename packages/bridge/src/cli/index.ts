#!/usr/bin/env node
/**
 * BP1 — atlas-bridge CLI entry point
 *
 * Commands:
 *   atlas-bridge pair [--name <machine>] [--url <atlas>]
 *   atlas-bridge start
 *   atlas-bridge stop
 *   atlas-bridge status
 *   atlas-bridge doctor
 *   atlas-bridge --version
 *   atlas-bridge --help
 *
 * Node 24 runs this TypeScript directly (erasable syntax, no build step).
 * If publishing demands a dist, a tsc build step is the flagged deviation.
 */
import { BRIDGE_VERSION } from "../config.ts";

const args = process.argv.slice(2);
const command = args[0];

function showHelp(): void {
  console.log(`atlas-bridge v${BRIDGE_VERSION}

Usage: atlas-bridge <command> [options]

Commands:
  pair      Pair this machine with an Atlas instance (ADR-0004 §4 loopback handshake)
  start     Start the Bridge daemon (reads ~/.atlas-bridge/config.json)
  stop      Stop a running Bridge daemon
  status    Print machine's-eye status line (online/offline, paired-as, engine)
  doctor    Run local preflight checks and print results

Options:
  --version  Print version and exit
  --help     Print this help and exit

start flags:
  --detached   Spawn the daemon in the background (no console window) and return
  --foreground Run in the foreground (default; used internally by --detached child)

pair options:
  --name <machine>   Name for this bridge (default: hostname)
  --url <atlas-url>  Atlas URL (default: ATLAS_URL env or config file)

Config file: ~/.atlas-bridge/config.json (override dir: ATLAS_BRIDGE_HOME)

Env vars (override config file):
  ATLAS_URL                  Atlas base URL
  ATLAS_BRIDGE_TOKEN         Auth token (from \`pair\` — never set by hand)
  ATLAS_BRIDGE_ENGINE        "real" | "fake" (default: real)
  ATLAS_BRIDGE_DATA_DIR      Worktrees + sandboxes root
  ATLAS_BRIDGE_LOCK_PORT     Single-instance TCP lock port (default: 9123)
  ATLAS_BRIDGE_TICK_MS       Scheduler tick interval (default: 1000)
  ATLAS_BRIDGE_HEARTBEAT_MS  Heartbeat interval (default: 30000)
`);
}

if (command === "--version" || command === "-v") {
  console.log(`atlas-bridge v${BRIDGE_VERSION}`);
  process.exit(0);
}

if (!command || command === "--help" || command === "-h") {
  showHelp();
  process.exit(command ? 0 : 1);
}

switch (command) {
  case "pair": {
    const nameIdx = args.indexOf("--name");
    const urlIdx = args.indexOf("--url");
    const { runPair } = await import("./pair.ts");
    await runPair({
      name: nameIdx >= 0 ? args[nameIdx + 1] : undefined,
      url: urlIdx >= 0 ? args[urlIdx + 1] : undefined,
    });
    break;
  }

  case "start": {
    const { runStart } = await import("./start.ts");
    // Pass argv slice so start can detect --detached / --foreground flags.
    await runStart({ argv: args });
    break;
  }

  case "stop": {
    const { runStop } = await import("./stop.ts");
    await runStop();
    break;
  }

  case "status": {
    const { runStatus } = await import("./status.ts");
    await runStatus();
    break;
  }

  case "doctor": {
    const { runDoctorCli } = await import("./doctor.ts");
    await runDoctorCli();
    break;
  }

  default: {
    console.error(`Unknown command: ${command}`);
    console.error(`Run "atlas-bridge --help" for usage.`);
    process.exit(1);
  }
}
