/**
 * M9 — instance settings reads/writes (single row, id = 1).
 *
 * The Run concurrency cap (PRD #8). Zero-config: reads fall back to the
 * default when no row exists; the Owner-facing dial is M10's settings
 * shell (the write path exists now so tests + the dispatcher can set it).
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { instanceSettings } from "@/src/db/schema";
import { decryptSecret, encryptSecret } from "@/src/lib/secret";

export const DEFAULT_RUN_CAP = 2;

export async function runCap(): Promise<number> {
  const rows = await db.select({ cap: instanceSettings.runCap }).from(instanceSettings);
  return rows[0]?.cap ?? DEFAULT_RUN_CAP;
}

/** upsert the single row (id = 1). */
export async function setRunCap(cap: number): Promise<void> {
  const value = Math.max(1, Math.floor(cap));
  await db.execute(sql`
    insert into instance_settings (id, run_cap, updated_at)
    values (1, ${value}, now())
    on conflict (id) do update set run_cap = ${value}, updated_at = now()
  `);
}

/**
 * AFK level (ADR-0007 §4) — the three-level dial.
 *  - off:   Asks go to the Owner (Athena fallback after the timeout).
 *  - on:    Athena answers, but the safety rail holds (human-only → Owner).
 *  - ultra: Athena answers everything (rail off; machine-safety floor stays).
 */
export type AfkLevel = "off" | "on" | "ultra";
export const AFK_LEVELS: readonly AfkLevel[] = ["off", "on", "ultra"];
export const DEFAULT_AFK_FALLBACK_MINUTES = 10;

export async function afkLevel(): Promise<AfkLevel> {
  const rows = await db.select({ level: instanceSettings.afkLevel }).from(instanceSettings);
  const v = rows[0]?.level;
  return (AFK_LEVELS as readonly string[]).includes(v ?? "") ? (v as AfkLevel) : "off";
}

/**
 * AFK Mode (ADR-0006 §4) — kept as a boolean derive (level !== 'off') for any
 * caller that only needs "is AFK active". New code should prefer `afkLevel()`.
 */
export async function afkMode(): Promise<boolean> {
  return (await afkLevel()) !== "off";
}

/** upsert the single row (id = 1) — writes BOTH columns so the v0.1 boolean reader stays correct. */
export async function setAfkLevel(level: AfkLevel): Promise<void> {
  const on = level !== "off";
  await db.execute(sql`
    insert into instance_settings (id, afk_level, afk_mode, updated_at)
    values (1, ${level}, ${on}, now())
    on conflict (id) do update set afk_level = ${level}, afk_mode = ${on}, updated_at = now()
  `);
}

/** back-compat shim — maps the old boolean setter onto the level dial. */
export async function setAfkMode(on: boolean): Promise<void> {
  await setAfkLevel(on ? "on" : "off");
}

/** minutes an unanswered Ask waits before Athena's fallback (AFK off). */
export async function afkFallbackMinutes(): Promise<number> {
  const rows = await db
    .select({ m: instanceSettings.afkFallbackMinutes })
    .from(instanceSettings);
  return rows[0]?.m ?? DEFAULT_AFK_FALLBACK_MINUTES;
}

/** upsert the single row (id = 1). 0 = never (Athena never auto-takes-over when AFK off). */
export async function setAfkFallbackMinutes(minutes: number): Promise<void> {
  const value = Math.max(0, Math.floor(minutes));
  await db.execute(sql`
    insert into instance_settings (id, afk_fallback_minutes, updated_at)
    values (1, ${value}, now())
    on conflict (id) do update set afk_fallback_minutes = ${value}, updated_at = now()
  `);
}

/**
 * Where Athena consults run (ADR-0007 §2): 'cloud' (Atlas API call) or 'bridge'
 * (a repo-aware consult on the Run's bridge — no Atlas key). Owner-selectable.
 */
export type AthenaLocation = "cloud" | "bridge";
export const ATHENA_LOCATIONS: readonly AthenaLocation[] = ["cloud", "bridge"];

export async function athenaLocation(): Promise<AthenaLocation> {
  const rows = await db
    .select({ loc: instanceSettings.athenaLocation })
    .from(instanceSettings);
  return rows[0]?.loc === "bridge" ? "bridge" : "cloud";
}

export async function setAthenaLocation(loc: AthenaLocation): Promise<void> {
  await db.execute(sql`
    insert into instance_settings (id, athena_location, updated_at)
    values (1, ${loc}, now())
    on conflict (id) do update set athena_location = ${loc}, updated_at = now()
  `);
}

/** ADR-0007 §5 — the Council size (lens-diverse delegates). Odd, default 3. */
export const DEFAULT_COUNCIL_SIZE = 3;

export async function athenaCouncilSize(): Promise<number> {
  const rows = await db
    .select({ n: instanceSettings.athenaCouncilSize })
    .from(instanceSettings);
  return rows[0]?.n ?? DEFAULT_COUNCIL_SIZE;
}

export async function setAthenaCouncilSize(size: number): Promise<void> {
  let v = Math.max(1, Math.min(7, Math.floor(size)));
  if (v % 2 === 0) v -= 1; // keep it odd for clean majorities
  await db.execute(sql`
    insert into instance_settings (id, athena_council_size, updated_at)
    values (1, ${v}, now())
    on conflict (id) do update set athena_council_size = ${v}, updated_at = now()
  `);
}

/**
 * The cloud-tier Anthropic key (ADR-0007 §3), decrypted — or null to fall back
 * to the env var. Stored AES-256-GCM-encrypted; never returned in plaintext to
 * any UI (only `athenaApiKeyIsSet` is surfaced).
 */
export async function athenaApiKey(): Promise<string | null> {
  const rows = await db
    .select({ enc: instanceSettings.athenaApiKeyEnc })
    .from(instanceSettings);
  return decryptSecret(rows[0]?.enc ?? null);
}

/** whether an in-app key is stored (for the masked "set ••••" display). */
export async function athenaApiKeyIsSet(): Promise<boolean> {
  const rows = await db
    .select({ enc: instanceSettings.athenaApiKeyEnc })
    .from(instanceSettings);
  return !!rows[0]?.enc;
}

/** store (encrypted) or clear (null/empty) the in-app key. */
export async function setAthenaApiKey(plaintext: string | null): Promise<void> {
  const enc = plaintext && plaintext.trim() ? encryptSecret(plaintext.trim()) : null;
  await db.execute(sql`
    insert into instance_settings (id, athena_api_key_enc, updated_at)
    values (1, ${enc}, now())
    on conflict (id) do update set athena_api_key_enc = ${enc}, updated_at = now()
  `);
}
