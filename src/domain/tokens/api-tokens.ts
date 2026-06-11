/**
 * M10 — API tokens domain (PRD #36; charter item 5): show-once create,
 * scopes, expiry, rotate, revoke over `api_tokens`.
 *
 * HONESTY: no public API consumes these yet (it is no module's charter).
 * The table is the governance RECORD — scopes are stored intent,
 * `last_used_at` is NULL until a consumer exists, and every surface
 * copy says so. The plaintext token exists only in the create/rotate
 * return value; Atlas stores the sha-256 hex (`bridges.token_hash`'s
 * at-rest rule, ADR-0002 §1).
 */
import { createHash, randomBytes } from "node:crypto";

import { desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { apiTokens, type ApiToken } from "@/src/db/schema";

// ── pure vocabulary + helpers (vitest: tests/m10-tokens-pure.test.ts) ──

/**
 * Scope vocabulary — what a public API would govern. Recorded now,
 * enforced the day a consumer ships (the page copy carries this truth).
 * `*` is the everything-scope and must stand alone (XX:255's danger chip).
 */
export const API_TOKEN_SCOPES = [
  "tickets:read",
  "tickets:write",
  "projects:read",
  "runs:read",
  "*",
] as const;

export type ApiTokenScope = (typeof API_TOKEN_SCOPES)[number];

/** expiry choices — rotation is the default posture (XX:217, made real). */
export const API_TOKEN_EXPIRY_DAYS = [30, 90, 365] as const;
export const DEFAULT_EXPIRY_DAYS = 90;

export type ScopeValidation = { ok: true; scopes: ApiTokenScope[] } | { ok: false; message: string };

export function validateScopes(raw: string[]): ScopeValidation {
  const unique = [...new Set(raw)];
  if (unique.length === 0) return { ok: false, message: "pick at least one scope" };
  const known = unique.filter((s): s is ApiTokenScope =>
    (API_TOKEN_SCOPES as readonly string[]).includes(s),
  );
  if (known.length !== unique.length) {
    return { ok: false, message: "unknown scope" };
  }
  if (known.includes("*") && known.length > 1) {
    return { ok: false, message: "the everything-scope stands alone" };
  }
  return { ok: true, scopes: known };
}

export type NameValidation = { ok: true; name: string } | { ok: false; message: string };

export function validateTokenName(raw: string): NameValidation {
  const name = raw.trim();
  if (name.length === 0) return { ok: false, message: "label the token first" };
  if (name.length > 80) return { ok: false, message: "keep it under 80 characters" };
  return { ok: true, name };
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** `atp_` + 48 url-safe hex chars — the one REAL format (rail card truth). */
export function generateApiToken(): string {
  return `atp_${randomBytes(24).toString("hex")}`;
}

/** display prefix — enough to recognise, never enough to use (XX:172). */
export function tokenPrefix(token: string): string {
  return `${token.slice(0, 8)}…`;
}

export function expiryDate(days: number, from: Date = new Date()): Date {
  const allowed = (API_TOKEN_EXPIRY_DAYS as readonly number[]).includes(days)
    ? days
    : DEFAULT_EXPIRY_DAYS;
  return new Date(from.getTime() + allowed * 24 * 60 * 60 * 1000);
}

export type TokenStanding = "active" | "expired" | "revoked";

export function tokenStanding(t: Pick<ApiToken, "revokedAt" | "expiresAt">, now: Date): TokenStanding {
  if (t.revokedAt) return "revoked";
  if (t.expiresAt.getTime() <= now.getTime()) return "expired";
  return "active";
}

/** "in 85 days" / "in 3 hours" / "expired" — XX:180's bare meta form. */
export function expiresLabel(expiresAt: Date, now: Date): string {
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return "expired";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `in ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.max(1, Math.floor(ms / (60 * 60 * 1000)));
  return `in ${hours} hour${hours === 1 ? "" : "s"}`;
}

export function parseScopes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is string => typeof s === "string");
}

// ── writers (real Neon; integration-tested) ──

export type CreatedToken = { token: string; id: string };

/** create — returns the plaintext ONCE; the row stores only the hash. */
export async function createApiToken(input: {
  name: string;
  scopes: string[];
  expiresDays?: number;
}): Promise<CreatedToken> {
  const name = validateTokenName(input.name);
  if (!name.ok) throw new Error(`invalid token name: ${name.message}`);
  const scopes = validateScopes(input.scopes);
  if (!scopes.ok) throw new Error(`invalid scopes: ${scopes.message}`);

  const token = generateApiToken();
  const rows = await db
    .insert(apiTokens)
    .values({
      name: name.name,
      tokenHash: hashApiToken(token),
      prefix: tokenPrefix(token),
      scopes: scopes.scopes,
      expiresAt: expiryDate(input.expiresDays ?? DEFAULT_EXPIRY_DAYS),
    })
    .returning({ id: apiTokens.id });
  return { token, id: rows[0].id };
}

/**
 * rotate — a fresh secret for the same governance row: new hash, new
 * prefix, expiry restarted. One conditional statement (revoked tokens
 * don't rotate — re-create instead).
 */
export async function rotateApiToken(input: { id: string }): Promise<CreatedToken | null> {
  const token = generateApiToken();
  const rows = (await db.execute(sql`
    update api_tokens
    set token_hash = ${hashApiToken(token)},
        prefix = ${tokenPrefix(token)},
        expires_at = ${expiryDate(DEFAULT_EXPIRY_DAYS).toISOString()}::timestamptz,
        created_at = now()
    where id = ${input.id} and revoked_at is null
    returning id::text as id
  `)) as unknown as { rows: Array<{ id: string }> };
  return rows.rows.length ? { token, id: rows.rows[0].id } : null;
}

/** revoke — a mark, not a delete; takes effect before any future consumer. */
export async function revokeApiToken(input: { id: string }): Promise<boolean> {
  const rows = (await db.execute(sql`
    update api_tokens
    set revoked_at = now()
    where id = ${input.id} and revoked_at is null
    returning id
  `)) as unknown as { rows: unknown[] };
  return rows.rows.length > 0;
}

export async function listApiTokens(): Promise<ApiToken[]> {
  return db.select().from(apiTokens).orderBy(desc(apiTokens.createdAt));
}
