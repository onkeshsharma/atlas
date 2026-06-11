/**
 * M7 — ticket_pins: per-Ticket pin marks for the Project landing's
 * "Pinned" section (O:193–229, charter §3).
 *
 * A SEPARATE table on purpose: the tickets table is M8's (M7's hard
 * wall — tickets/runs schema is read-only), and pinning is Project-
 * landing curation, not Ticket lifecycle. M7 ships the render state
 * over seeded pins; the pin/unpin affordance on tickets themselves
 * belongs to M8's board/detail surfaces (noted in HANDOFF-M7).
 */
import { boolean, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { tickets } from "./tickets";

export const ticketPins = pgTable("ticket_pins", {
  /** one pin per ticket — the pk IS the FK. */
  ticketId: uuid("ticket_id")
    .primaryKey()
    .references(() => tickets.id),
  seeded: boolean("seeded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TicketPin = typeof ticketPins.$inferSelect;
