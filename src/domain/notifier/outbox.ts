/**
 * M13 — notification-outbox writers + read models. Inserts are
 * idempotent BY SCHEMA (the two partial unique indexes —
 * src/db/schema/notification-outbox.ts): redelivery composes nothing
 * twice, so the consumer needs no cursor bookkeeping (ADR-0003).
 */
import { and, count, desc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import {
  notificationOutbox,
  type NotificationKind,
  type NotificationOutboxRow,
  type NotificationStatus,
} from "@/src/db/schema";

export type OutboxInsert = {
  recipientUserId: string;
  recipientEmail: string;
  kind: NotificationKind;
  subject: string;
  html: string | null;
  text: string;
  status: NotificationStatus;
  feedEventId?: number | null;
  ticketId?: string | null;
  projectId?: string | null;
  periodKey?: string | null;
  deliverAfter?: Date | null;
  emailFormat: string;
  error?: string | null;
};

/** insert one composed row; conflict on the idempotency indexes = no-op. */
export async function insertOutboxRow(row: OutboxInsert): Promise<{ inserted: boolean }> {
  const result = await db
    .insert(notificationOutbox)
    .values({
      recipientUserId: row.recipientUserId,
      recipientEmail: row.recipientEmail,
      kind: row.kind,
      subject: row.subject,
      html: row.html,
      text: row.text,
      status: row.status,
      feedEventId: row.feedEventId ?? null,
      ticketId: row.ticketId ?? null,
      projectId: row.projectId ?? null,
      periodKey: row.periodKey ?? null,
      deliverAfter: row.deliverAfter ?? null,
      emailFormat: row.emailFormat,
      error: row.error ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: notificationOutbox.id });
  return { inserted: result.length > 0 };
}

/** rows whose delivery window is open (sent by the cron pass when a key exists). */
export async function dueOutboxRows(now: Date, limit = 50): Promise<NotificationOutboxRow[]> {
  return db
    .select()
    .from(notificationOutbox)
    .where(
      and(
        inArray(notificationOutbox.status, ["composed", "skipped-quiet-hours"]),
        or(isNull(notificationOutbox.deliverAfter), lte(notificationOutbox.deliverAfter, now)),
      ),
    )
    .orderBy(notificationOutbox.createdAt)
    .limit(limit);
}

export async function markOutboxSent(id: string, providerId: string): Promise<void> {
  await db
    .update(notificationOutbox)
    .set({ status: "sent", providerId, sentAt: new Date(), error: null })
    .where(eq(notificationOutbox.id, id));
}

export async function markOutboxFailed(id: string, error: string): Promise<void> {
  await db.update(notificationOutbox).set({ status: "failed", error }).where(eq(notificationOutbox.id, id));
}

/** a delivery attempt that hit the recipient's quiet window — push to the edge. */
export async function pushOutboxDeliverAfter(id: string, deliverAfter: Date): Promise<void> {
  await db
    .update(notificationOutbox)
    .set({ status: "skipped-quiet-hours", deliverAfter })
    .where(eq(notificationOutbox.id, id));
}

// ── read models (surfaces + tests) ─────────────────────────────────────

export async function outboxRowsFor(
  recipientUserId: string,
  limit = 20,
): Promise<NotificationOutboxRow[]> {
  return db
    .select()
    .from(notificationOutbox)
    .where(eq(notificationOutbox.recipientUserId, recipientUserId))
    .orderBy(desc(notificationOutbox.createdAt))
    .limit(limit);
}

export type OutboxTally = { sent: number; composed: number; skipped: number; failed: number };

/** the prefs-page rail's honest numbers (per user or instance-wide). */
export async function outboxTally(recipientUserId?: string): Promise<OutboxTally> {
  const rows = await db
    .select({ status: notificationOutbox.status, n: count() })
    .from(notificationOutbox)
    .where(recipientUserId ? eq(notificationOutbox.recipientUserId, recipientUserId) : undefined)
    .groupBy(notificationOutbox.status);
  const tally: OutboxTally = { sent: 0, composed: 0, skipped: 0, failed: 0 };
  for (const row of rows) {
    const n = Number(row.n);
    if (row.status === "sent") tally.sent += n;
    else if (row.status === "composed") tally.composed += n;
    else if (row.status === "failed") tally.failed += n;
    else tally.skipped += n;
  }
  return tally;
}

/** shipped feed rows not yet answered by ANY outbox decision (catch-up scan). */
export async function unprocessedShippedEventIds(limit = 100): Promise<number[]> {
  const result = (await db.execute(sql`
    select fe.id from feed_events fe
    where fe.kind = 'shipped'
      and fe.seeded = false
      and fe.ticket_id is not null
      and fe.created_at > now() - interval '14 days'
      and not exists (select 1 from notification_outbox o where o.feed_event_id = fe.id)
    order by fe.id asc
    limit ${limit}
  `)) as unknown as { rows: Array<{ id: number | string }> };
  return result.rows.map((r) => Number(r.id));
}
