/**
 * M10 — notification preferences (CC; PRD #48's storage half).
 *
 * Stored HONESTLY (charter item 1): these rows are what the Notifier
 * (M13) will read — email DELIVERY is the Notifier's job and does not
 * exist yet, so nothing here may imply an email sends today. The in-app
 * inbox is the one channel that delivers now (locked "always on" in CC).
 *
 * Keyed on the Neon Auth user id (the user_preferences convention) —
 * Collaborators get the same shape when their surfaces ship (M13).
 */
import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const notificationPreferences = pgTable("notification_preferences", {
  /** Neon Auth user id (neon_auth.user.id — text). */
  userId: text("user_id").primaryKey(),
  /** Email channel switch (CC "Where") — honored by M13's Notifier. */
  emailEnabled: boolean("email_enabled").notNull().default(true),
  /** instant | daily | weekly | off (CC "How often"). */
  frequency: text("frequency").notNull().default("instant"),
  /** per-event-kind switches — map of event key → boolean (CC "What you care about"). */
  events: jsonb("events").notNull().default({}),
  /** quiet hours — "22:00"/"08:00" local-time strings; null = no quiet window. */
  quietFrom: text("quiet_from"),
  quietUntil: text("quiet_until"),
  /** IANA zone the quiet window is anchored to (CC:243 "detected from browser"). */
  timezone: text("timezone"),
  /** editorial | plain (CC "Email format") — read by M13's composer. */
  emailFormat: text("email_format").notNull().default("editorial"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
