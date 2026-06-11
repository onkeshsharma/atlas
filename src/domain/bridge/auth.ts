/**
 * M9 — Bridge token auth (ADR-0002 §1).
 *
 * The daemon sends `Authorization: Bearer <ATLAS_BRIDGE_TOKEN>`; Atlas
 * stores only the sha-256 hex (`bridges.token_hash`) and resolves the
 * row per request. M10: pairing/rotate/revoke live in ./pairing (shared
 * by the UI and scripts/pair-bridge.mjs); hashing is re-exported from
 * there so one implementation exists. A REVOKED bridge no longer
 * resolves — its daemon 401s into the fatal TokenRejectedError stop.
 */
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/src/db/client";
import { bridges, type Bridge } from "@/src/db/schema";

import { hashBridgeToken } from "./pairing";

export { hashBridgeToken };

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
    // M10 — revocation takes effect on the very next request.
    .where(and(eq(bridges.tokenHash, hashBridgeToken(token)), isNull(bridges.revokedAt)))
    .limit(1);
  return rows[0] ?? null;
}
