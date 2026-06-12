/**
 * M13 — per-user inbox read state (charter item 1; HANDOFF-M6
 * deviation 10 parked this for the Collaborator inbox).
 *
 * THE DESIGN (recorded per charter): `feed_events.read_at` stays the
 * Owner's instance-level marker exactly as M6 built it — one Owner, one
 * inbox, per-row unread dots. Collaborators get a HIGH-WATER MARK
 * instead of per-row state: one row per user holding the highest
 * feed_events.id they have marked read. Unread = visible rows with
 * id > mark. This costs one row per person (not one per person×event),
 * needs no backfill when a Collaborator joins (mark starts at 0 — their
 * project's history reads as already-read via the join window), and
 * "mark all read →" is a single idempotent upsert. The bigserial id is
 * already the live seam's monotonic cursor (ADR-0001), so it is the
 * natural read cursor too.
 */
import { bigint, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const inboxReadMarks = pgTable("inbox_read_marks", {
  /** Neon Auth user id (text — the notification_preferences convention). */
  userId: text("user_id").primaryKey(),
  /** highest feed_events.id this user has read; 0 = nothing marked yet. */
  lastReadEventId: bigint("last_read_event_id", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InboxReadMark = typeof inboxReadMarks.$inferSelect;
