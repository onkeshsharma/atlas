/**
 * M9 — Bridge token auth (ADR-0002 §1).
 *
 * The daemon sends `Authorization: Bearer <ATLAS_BRIDGE_TOKEN>`; Atlas
 * stores only the sha-256 hex (`bridges.token_hash`) and resolves the
 * row per request. Pairing: `scripts/pair-bridge.mjs` (M9 dev tool —
 * the M10 surface owns rotate/revoke/show-once).
 */
import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import { bridges, type Bridge } from "@/src/db/schema";

export function hashBridgeToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** resolve the calling daemon from the Bearer header; null = 401. */
export async function bridgeFromRequest(req: Request): Promise<Bridge | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  const token = match[1].trim();
  if (!token) return null;

  const rows = await db
    .select()
    .from(bridges)
    .where(eq(bridges.tokenHash, hashBridgeToken(token)))
    .limit(1);
  return rows[0] ?? null;
}
