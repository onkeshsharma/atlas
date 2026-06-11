/**
 * M10 — dev/CLI Bridge pairing (ADR-0002 §1). THIN WRAPPER: the logic
 * lives in src/domain/bridge/pairing.ts and is SHARED with the UI's
 * guided pairing flow (charter item 3) — one upsert, one token format,
 * one feed row, both callers. Node ≥23 strips the domain module's types
 * at import time (its import graph is alias-free on purpose).
 *
 *   node scripts/pair-bridge.mjs [--name <machine-name>]
 *
 * Re-running with the same name rotates that bridge's token. The token
 * prints ONCE — Atlas stores only the sha-256 hash.
 */
import { registerHooks } from "node:module";

import { config } from "dotenv";

// The app's TS modules import extensionless (tsconfig bundler
// resolution); Node's ESM loader wants explicit files. This hook tries
// `<specifier>.ts` / `<specifier>/index.ts` for RELATIVE misses only —
// node_modules resolution is untouched.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (specifier.startsWith(".")) {
        try {
          return nextResolve(`${specifier}.ts`, context);
        } catch {
          return nextResolve(`${specifier}/index.ts`, context);
        }
      }
      throw err;
    }
  },
});

config({ path: ".env.local", quiet: true });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing — see .env.example");
  process.exit(1);
}

const nameIdx = process.argv.indexOf("--name");
const name = nameIdx >= 0 ? process.argv[nameIdx + 1] : "local-bridge";
if (!name) {
  console.error("--name needs a value");
  process.exit(1);
}

// dynamic import AFTER dotenv — src/db/client.ts throws without DATABASE_URL.
const { pairBridge, validateBridgeName } = await import("../src/domain/bridge/pairing.ts");

const valid = validateBridgeName(name);
if (!valid.ok) {
  console.error(`invalid name: ${valid.message}`);
  process.exit(1);
}

const result = await pairBridge({ name: valid.name });
console.log(
  result.rotated ? `rotated token for bridge "${valid.name}"` : `paired bridge "${valid.name}"`,
);
console.log("");
console.log("ATLAS_BRIDGE_TOKEN (shown once — Atlas stores only the hash):");
console.log(result.token);
