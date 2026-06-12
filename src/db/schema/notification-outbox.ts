/**
 * M13 — notification_outbox: the durable record of every notification
 * the Notifier composes (charter item 1).
 *
 * THE OUTBOX IS THE AUDIT *AND* THE NO-KEY FALLBACK: a row lands for
 * every composed notification whether or not a RESEND_API_KEY exists;
 * suites and surfaces assert against these rows, never against real
 * delivery. Status vocabulary (charter):
 *
 *   composed            — built; sends when a key + delivery window allow
 *                         (daily-frequency rows carry deliver_after).
 *   sent                — Resend accepted it; provider_id is the receipt.
 *   skipped-quiet-hours — composed inside the recipient's quiet window;
 *                         deliver_after marks the window edge and the
 *                         cron pass delivers it there (ADR-0003).
 *   skipped-pref        — the recipient's preferences said no (channel
 *                         off, event off, frequency folds it away);
 *                         kept as the honest audit of the decision.
 *   failed              — Resend rejected it; error carries the reason.
 *
 * Idempotency is structural, not procedural: ship rows are unique per
 * (recipient, kind, feed_event_id) and digest rows per (recipient, kind,
 * period_key), so the consumer can re-scan the feed outbox on every kick
 * and redelivery composes nothing twice (the daemon-cursor idiom from
 * ADR-0002, anti-join form).
 */
import {
  bigint,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { feedEvents } from "./feed-events";
import { projects } from "./projects";
import { tickets } from "./tickets";

/** ship = per-Ticket Ship Notification (AA); digest = weekly round-up (YY). */
export const notificationKind = pgEnum("notification_kind", ["ship", "digest"]);

export const notificationStatus = pgEnum("notification_status", [
  "composed",
  "sent",
  "skipped-quiet-hours",
  "skipped-pref",
  "failed",
]);

export const notificationOutbox = pgTable(
  "notification_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Neon Auth user id of the recipient (the notification_preferences key). */
    recipientUserId: text("recipient_user_id").notNull(),
    /** the address composed against — frozen at compose time. */
    recipientEmail: text("recipient_email").notNull(),
    kind: notificationKind("kind").notNull(),
    subject: text("subject").notNull(),
    /** rendered editorial HTML; NULL when the recipient prefers plain (CC email format). */
    html: text("html"),
    /** the text/plain body — always composed (the honest fallback). */
    text: text("text").notNull(),
    status: notificationStatus("status").notNull().default("composed"),
    /** Resend message id once sent. */
    providerId: text("provider_id"),
    /** failure reason (status = failed). */
    error: text("error"),
    /** the `shipped` feed row a ship notification answers (ship kind). */
    feedEventId: bigint("feed_event_id", { mode: "number" }).references(() => feedEvents.id),
    ticketId: uuid("ticket_id").references(() => tickets.id),
    projectId: uuid("project_id").references(() => projects.id),
    /** digest idempotency key — ISO week of the digested window ("2026-W24"). */
    periodKey: text("period_key"),
    /** earliest send time — quiet-hours window edge / daily batch edge. */
    deliverAfter: timestamp("deliver_after", { withTimezone: true }),
    /** editorial | plain — the format the row was composed in. */
    emailFormat: text("email_format").notNull().default("editorial"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("notification_outbox_event_unique")
      .on(t.recipientUserId, t.kind, t.feedEventId)
      .where(sql`${t.feedEventId} is not null`),
    uniqueIndex("notification_outbox_period_unique")
      .on(t.recipientUserId, t.kind, t.periodKey)
      .where(sql`${t.periodKey} is not null`),
  ],
);

export type NotificationOutboxRow = typeof notificationOutbox.$inferSelect;
export type NotificationKind = NotificationOutboxRow["kind"];
export type NotificationStatus = NotificationOutboxRow["status"];
