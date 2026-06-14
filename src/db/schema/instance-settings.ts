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
import { boolean, check, integer, pgTable, smallint, timestamp } from "drizzle-orm/pg-core";
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
     */
    afkMode: boolean("afk_mode").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("instance_settings_single_row", sql`${t.id} = 1`)],
);

export type InstanceSettings = typeof instanceSettings.$inferSelect;
