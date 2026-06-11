/**
 * M10 — Bridge pairing: ONE domain function shared by the UI's guided
 * pairing flow (N + XX's show-once panel, PRD #33) and
 * `scripts/pair-bridge.mjs` (charter item 3 — the script's M9 logic
 * rewritten here, both callers share it).
 *
 * Token story (ADR-0002 §1 / HANDOFF-M9): the bearer token is generated
 * server-side, shown ONCE, and only its sha-256 hex is stored. Pairing
 * an existing name ROTATES that bridge's token (and clears revocation);
 * the upsert is one atomic statement on `bridges_name_unique` with its
 * `bridge-paired` outbox row (THE OUTBOX RULE), so racing pairs can't
 * duplicate a machine.
 *
 * IMPORTS ARE RELATIVE ON PURPOSE: `node scripts/pair-bridge.mjs` runs
 * this file directly under Node's type stripping, which cannot resolve
 * the `@/` tsconfig alias. Keep every transitive import alias-free.
 */
import { createHash, randomBytes } from "node:crypto";

import { sql } from "drizzle-orm";

import { db } from "../../db/client";

/** sha-256 hex — the only form a bridge token is ever stored in. */
export function hashBridgeToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** the M9 wire format, kept — the daemon's env var carries it verbatim. */
export function generateBridgeToken(): string {
  return `atlas-bridge-${randomBytes(24).toString("hex")}`;
}

export type PairBridgeResult = {
  /** shown once; never stored, never logged by Atlas. */
  token: string;
  bridgeId: string;
  /** false = a new machine row; true = an existing name's token rotated. */
  rotated: boolean;
};

export type BridgeNameValidation = { ok: true; name: string } | { ok: false; message: string };

/** §2.13-grade validation — machine names are mono, short, unsurprising. */
export function validateBridgeName(raw: string): BridgeNameValidation {
  const name = raw.trim();
  if (name.length === 0) return { ok: false, message: "name the machine first" };
  if (name.length > 64) return { ok: false, message: "keep it under 64 characters" };
  if (!/^[a-zA-Z0-9][a-zA-Z0-9 ._-]*$/.test(name)) {
    return { ok: false, message: "letters, digits, dots, dashes and spaces only" };
  }
  return { ok: true, name };
}

/**
 * Pair (or re-pair) a Bridge by machine name. One statement: upsert the
 * row + the `bridge-paired` feed row. Returns the plaintext token —
 * the caller renders it once (XX:104's amber panel / the script's
 * stdout) and forgets it.
 */
export async function pairBridge(input: {
  name: string;
  actor?: string;
}): Promise<PairBridgeResult> {
  const valid = validateBridgeName(input.name);
  if (!valid.ok) throw new Error(`invalid bridge name: ${valid.message}`);

  const token = generateBridgeToken();
  const hash = hashBridgeToken(token);

  const result = (await db.execute(sql`
    with up as (
      insert into bridges (name, token_hash)
      values (${valid.name}, ${hash})
      on conflict (name) do update
        set token_hash = excluded.token_hash,
            revoked_at = null
      returning id, name, (xmax = 0) as created
    )
    insert into feed_events (kind, actor, summary, payload, seeded)
    select 'bridge-paired', ${input.actor ?? "you"},
           up.name || case when up.created then '' else ' — token rotated' end,
           jsonb_build_object('bridgeId', up.id),
           false
    from up
    returning (select id::text from up) as bridge_id,
              (select created from up) as created
  `)) as unknown as { rows: Array<{ bridge_id: string; created: boolean }> };

  const row = result.rows[0];
  if (!row) throw new Error("pairing wrote no row");
  return { token, bridgeId: row.bridge_id, rotated: !row.created };
}

/**
 * Revoke a Bridge's token (N's "revoke ✕"). The mark beats a delete —
 * runs keep their FK, history stays honest, and the daemon's next
 * request 401s into a fatal stop (ADR-0002 §1). One conditional
 * statement + the `bridge-revoked` outbox row.
 */
export async function revokeBridge(input: {
  bridgeId: string;
  actor?: string;
}): Promise<{ ok: true } | { ok: false; reason: "not-claimed" }> {
  const result = (await db.execute(sql`
    with target as (
      update bridges
      set revoked_at = now()
      where id = ${input.bridgeId} and revoked_at is null
      returning id, name
    )
    insert into feed_events (kind, actor, summary, payload, seeded)
    select 'bridge-revoked', ${input.actor ?? "you"},
           target.name || ' — token revoked',
           jsonb_build_object('bridgeId', target.id),
           false
    from target
    returning id
  `)) as unknown as { rows: unknown[] };
  return result.rows.length ? { ok: true } : { ok: false, reason: "not-claimed" };
}
