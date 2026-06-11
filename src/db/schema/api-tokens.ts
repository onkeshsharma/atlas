/**
 * M10 — API tokens: machine access governance (PRD #36; charter §5).
 *
 * The XX surface's record: show-once secrets (only the sha-256 hex is
 * stored — same at-rest rule as `bridges.token_hash`, ADR-0002 §1),
 * scopes, expiry, rotate, revoke. HONESTY (charter item 5): nothing
 * CONSUMES these tokens yet — the public API is no module's charter —
 * so `last_used_at` stays NULL and the page copy says so. Scopes are
 * recorded intent, enforced the day a consumer ships.
 *
 * The Bridge daemon's token story stays separate on `bridges`
 * (HANDOFF-M9 "Token story") — this table is for everything else.
 */
import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const apiTokens = pgTable("api_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** the Owner's label — "ci-runner · github-actions" (XX:28). */
  name: text("name").notNull(),
  /** sha-256 hex of the bearer token; the plaintext is shown once, never stored. */
  tokenHash: text("token_hash").notNull(),
  /** display prefix — "atp_94ac…" (XX:172's truncated form); never enough to use. */
  prefix: text("prefix").notNull(),
  /** scope strings (src/domain/tokens/api-tokens.ts owns the vocabulary). */
  scopes: jsonb("scopes").notNull(),
  /** tokens always expire (XX:217's rotation-is-the-default stance, made real). */
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  /** honest NULL until a public API consumes tokens (charter item 5). */
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  /** revocation is a mark, not a delete — the governance record survives. */
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  seeded: boolean("seeded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ApiToken = typeof apiTokens.$inferSelect;
