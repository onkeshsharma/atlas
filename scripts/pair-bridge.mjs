/**
 * M9 — dev/CLI Bridge pairing (ADR-0002 §1). Generates a bearer token,
 * stores ONLY its sha-256 hash in `bridges`, prints the token once —
 * the M10 surface owns the XX show-once panel, rotate and revoke.
 *
 *   node scripts/pair-bridge.mjs [--name <machine-name>]
 *
 * Re-running with the same name rotates that bridge's token.
 */
import { createHash, randomBytes } from "node:crypto";

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing — see .env.example");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const nameIdx = process.argv.indexOf("--name");
const name = nameIdx >= 0 ? process.argv[nameIdx + 1] : "local-bridge";
if (!name) {
  console.error("--name needs a value");
  process.exit(1);
}

const token = `atlas-bridge-${randomBytes(24).toString("hex")}`;
const hash = createHash("sha256").update(token, "utf8").digest("hex");

const existing = await sql`select id from bridges where name = ${name}`;
if (existing.length) {
  await sql`update bridges set token_hash = ${hash} where name = ${name}`;
  console.log(`rotated token for bridge "${name}"`);
} else {
  await sql`insert into bridges (name, token_hash) values (${name}, ${hash})`;
  console.log(`paired bridge "${name}"`);
}

console.log("");
console.log("ATLAS_BRIDGE_TOKEN (shown once — Atlas stores only the hash):");
console.log(token);
