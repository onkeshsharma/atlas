/**
 * M13 — per-user inbox read marks (the high-water-mark design recorded
 * in src/db/schema/inbox-read-marks.ts). The Owner's instance-level
 * read_at stays M6's; these helpers serve the Collaborator inbox only.
 */
import { eq, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { inboxReadMarks } from "@/src/db/schema";

/** highest feed_events.id this user has read; 0 = never marked. */
export async function readMarkFor(userId: string): Promise<number> {
  const [row] = await db
    .select({ mark: inboxReadMarks.lastReadEventId })
    .from(inboxReadMarks)
    .where(eq(inboxReadMarks.userId, userId))
    .limit(1);
  return row?.mark ?? 0;
}

/**
 * "mark all read →" — idempotent upsert; GREATEST keeps the mark
 * monotonic if two tabs race (a cursor never moves backwards).
 */
export async function markAllReadFor(userId: string, upToEventId: number): Promise<void> {
  await db
    .insert(inboxReadMarks)
    .values({ userId, lastReadEventId: upToEventId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: inboxReadMarks.userId,
      set: {
        lastReadEventId: sql`greatest(${inboxReadMarks.lastReadEventId}, ${upToEventId})`,
        updatedAt: new Date(),
      },
    });
}
