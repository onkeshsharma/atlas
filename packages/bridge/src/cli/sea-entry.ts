/**
 * BP3 — SEA entry wrapper for atlas-bridge.
 *
 * The main CLI entry (index.ts) uses top-level `await` (dynamic imports in
 * switch cases), which is valid ESM but cannot be compiled to CJS format
 * directly by esbuild. This wrapper wraps everything in an async IIFE so
 * the CJS bundle is valid (CJS doesn't support top-level await).
 *
 * This file is the esbuild input for the SEA artifact only. The normal
 * runtime entry (`src/cli/index.ts` with Node 24 TS-direct execution)
 * is unchanged and continues to work for development + `npx`/`npm install -g`.
 */

// Wrapped in an async IIFE to allow top-level await semantics in CJS output.
(async () => {
  const { BRIDGE_VERSION } = await import("../config.ts");

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
      await runStart();
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
})().catch((err: unknown) => {
  console.error(String(err));
  process.exit(1);
});
