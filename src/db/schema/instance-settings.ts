/**
 * M9 — instance-level settings (single row, id = 1).
 *
 * The Run concurrency cap is the Owner's machine-load dial (PRD #8) —
 * INSTANCE state, not a per-user preference, so it lives here rather
 * than in `user_preferences` (which is keyed on Neon Auth user ids and
 * carries UI prefs). Charter §2 left the placement to M9 — recorded in
 * notes/M9A-handoff.md. Exactly one row; reads fall back to the default
 * when the row hasn't been created yet (honest zero-config start).
 * The Owner-facing dial surface is M10's settings shell.
 */
import { boolean, check, integer, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const instanceSettings = pgTable(
  "instance_settings",
  {
    /** always 1 — the single-row lock. */
    id: smallint("id").primaryKey().default(1),
    /** how many Engine sessions the Bridge may run at once (PRD #8). */
    runCap: integer("run_cap").notNull().default(2),
    /**
     * AFK Mode (ADR-0006 §4): when on, a Run's Ask is auto-answered by Athena
     * instead of waiting for the Owner. Instance-level (one Owner), so the
     * token-authed bridge routes can read it without a user session.
     * Kept in sync with `afkLevel` (= level !== 'off') for back-compat with the
     * v0.1 deployed reader.
     */
    afkMode: boolean("afk_mode").notNull().default(false),
    /**
     * ADR-0007 §4 — the three-level AFK dial: 'off' | 'on' | 'ultra'.
     * 'on' keeps the safety rail (human-only Asks escalate); 'ultra' drops the
     * rail (Athena answers everything; the machine-safety floor still holds).
     */
    afkLevel: text("afk_level").notNull().default("off"),
    /** ADR-0007 §4 — minutes an unanswered Ask waits before Athena's fallback (AFK off). */
    afkFallbackMinutes: integer("afk_fallback_minutes").notNull().default(10),
    /**
     * ADR-0007 §3 — the cloud-tier Anthropic key, AES-256-GCM ciphertext
     * (src/lib/secret.ts). Null = use the env var. Never the plaintext.
     */
    athenaApiKeyEnc: text("athena_api_key_enc"),
    /**
     * ADR-0007 §2 (Phase 2) — where Athena consults run: 'cloud' (Atlas API
     * call) or 'bridge' (a repo-aware consult on the Run's bridge, no key).
     */
    athenaLocation: text("athena_location").notNull().default("cloud"),
    /**
     * ADR-0007 §5 (Phase 3) — the Council size: N lens-diverse delegates that
     * vote when a single consult wasn't confident. Odd; default 3.
     */
    athenaCouncilSize: integer("athena_council_size").notNull().default(3),
    /**
     * ADR-0007 §7 (Phase 4) — the daily budget governor: max EXPENSIVE rungs
     * (repo-aware bridge consult + Council convening) Athena may spend per
     * rolling 24h. On cap she fails safe to the Owner (escalate, never silent
     * overspend). 0 = unlimited. Cheap quick consults are never metered.
     */
    athenaDailyEscalationCap: integer("athena_daily_escalation_cap").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("instance_settings_single_row", sql`${t.id} = 1`)],
);

export type InstanceSettings = typeof instanceSettings.$inferSelect;
