/**
 * M8 — ticket_links: declared blocks / blocked-by edges (PRD #16).
 *
 * One row = "blocker blocks blocked". The hard-dependency input to the
 * Hints engine (src/domain/hints/): an open blocker yields a 🔴
 * `blocked-by` Sequence Hint on the blocked card and the `blocked` Ship
 * Group kind in Review. Soft hints (parallel-safe / recommended-after)
 * come from file-set knowledge, not from rows here.
 */
import { boolean, check, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { tickets } from "./tickets";

export const ticketLinks = pgTable(
  "ticket_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** the ticket that must land first. */
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => tickets.id),
    /** the ticket waiting on it. */
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => tickets.id),
    seeded: boolean("seeded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ticket_links_edge_unique").on(t.blockerId, t.blockedId),
    check("ticket_links_no_self", sql`${t.blockerId} <> ${t.blockedId}`),
  ],
);

export type TicketLink = typeof ticketLinks.$inferSelect;
