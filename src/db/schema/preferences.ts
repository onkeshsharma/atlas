/**
 * M6 — per-user preferences.
 *
 * Canon §2.1: the expanded sidebar state is persisted in
 * `users.preferences.sidebar_collapsed`. Identity lives in Neon Auth's
 * managed schema, so Atlas keeps its preference column here keyed on the
 * Neon Auth user id (same convention as memberships.user_id).
 */
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const userPreferences = pgTable("user_preferences", {
  /** Neon Auth user id (neon_auth.user.id — text). */
  userId: text("user_id").primaryKey(),
  /** §2.1 — collapsed 56px rail is the canon default shell. */
  sidebarCollapsed: boolean("sidebar_collapsed").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
