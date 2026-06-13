#!/usr/bin/env node
/**
 * BP3 — Node SEA build script for atlas-bridge.
 *
 * Produces a self-contained binary by:
 *   1. Bundle src/cli/sea-entry.ts → dist/atlas-bridge.cjs  (esbuild, CJS)
 *   2. node --experimental-sea-config sea.config.json       → dist/sea-prep.blob
 *   3. Copy the current node binary → dist/atlas-bridge[.exe|-darwin|-linux]
 *   4. Inject the blob via postject                         → final binary
 *
 * Owner-gated steps (NOT done here, documented in notes/BP3-packaging-runbook.md):
 *   - Code-signing with signtool (Windows EV cert)
 *   - notarytool + stapling (macOS — must be done on a Mac)
 *   - Building the macOS/Linux binary (macOS: run this script on a Mac;
 *     Linux: run on a Linux host or in a Linux container)
 *
 * Usage (Windows, this machine):
 *   node scripts/build-sea.mjs                    # build for current platform
 *
 * Outputs:
 *   dist/atlas-bridge.cjs        — bundled CJS entry (all platforms share this)
 *   dist/sea-prep.blob           — SEA blob
 *   dist/atlas-bridge.exe        — Windows binary (built here if on win32)
 *   dist/atlas-bridge-darwin     — macOS binary  (Owner-built on Mac)
 *   dist/atlas-bridge-linux      — Linux binary   (Owner-built on Linux/container)
 *
 * Per ADR-0004 §3: Node-SEA, not Tauri. No Rust, no Xcode, no heavy toolchains.
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");

const isWin = process.platform === "win32";

// Helper: run a command with shell:false; on Windows route through cmd.exe /C.
function run(cmd, args, opts = {}) {
  const spawnCmd = isWin && !cmd.endsWith(".exe") ? "cmd.exe" : cmd;
  const spawnArgs = isWin && !cmd.endsWith(".exe") ? ["/C", cmd, ...args] : args;
  const result = spawnSync(spawnCmd, spawnArgs, {
    stdio: "inherit",
    cwd: ROOT,
    shell: false,
    ...opts,
  });
  if (result.status !== 0) {
    const label = [cmd, ...args].join(" ");
    console.error(`\nFailed: ${label} (exit ${result.status ?? "signal"})`);
    process.exit(1);
  }
}

// Helper: resolve a local bin (node_modules/.bin/<name>) — handles .cmd on win.
function localBin(name) {
  return isWin
    ? join(ROOT, "node_modules/.bin", `${name}.cmd`)
    : join(ROOT, "node_modules/.bin", name);
}

console.log("\natlas-bridge SEA build");
console.log(`  Node:     ${process.version}`);
console.log(`  Platform: ${process.platform}`);
console.log(`  Dist:     ${DIST}\n`);

mkdirSync(DIST, { recursive: true });

// ── 1. Bundle ──────────────────────────────────────────────────────────────
console.log("Step 1/4 — bundle src/cli/sea-entry.ts → dist/atlas-bridge.cjs (esbuild)");

// On Windows, esbuild's bin is a .cmd — route via cmd /C
run("npx", [
  "esbuild",
  join(ROOT, "src/cli/sea-entry.ts"),
  "--bundle",
  "--platform=node",
  "--format=cjs",
  "--target=node24",
  `--outfile=${join(DIST, "atlas-bridge.cjs")}`,
  "--define:process.env.NODE_ENV=\"production\"",
  // Keep node: built-ins external — they live in the node binary itself.
  "--external:node:*",
  "--log-level=info",
]);
console.log("  ✓ dist/atlas-bridge.cjs written\n");

// ── 2. Generate SEA blob ───────────────────────────────────────────────────
console.log("Step 2/4 — generate SEA blob (node --experimental-sea-config)");

run("node", ["--experimental-sea-config", join(ROOT, "sea.config.json")]);
console.log("  ✓ dist/sea-prep.blob written\n");

// ── 3. Copy node binary ────────────────────────────────────────────────────
const binSuffix = isWin ? ".exe" : process.platform === "darwin" ? "-darwin" : "-linux";
const outBin = join(DIST, `atlas-bridge${binSuffix}`);

console.log(`Step 3/4 — copy node binary → ${outBin}`);
copyFileSync(process.execPath, outBin);
if (!isWin) chmodSync(outBin, 0o755);
console.log("  ✓ node binary copied\n");

// ── 4. Inject blob via postject ────────────────────────────────────────────
console.log("Step 4/4 — inject blob via postject");

const postjectArgs = [
  outBin,
  "NODE_SEA_BLOB",
  join(DIST, "sea-prep.blob"),
  "--sentinel-fuse",
  "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
];
if (process.platform === "darwin") {
  postjectArgs.push("--macho-segment-name", "NODE_SEA");
}

run("npx", ["postject", ...postjectArgs]);

console.log(`\n✓ dist/atlas-bridge${binSuffix} is ready`);
if (isWin) {
  console.log("  Owner-gated next step: sign with signtool (see notes/BP3-packaging-runbook.md §Windows-signing)");
} else if (process.platform === "darwin") {
  console.log("  Owner-gated next step: codesign + notarytool + staple (see runbook §macOS)");
}
console.log("");
