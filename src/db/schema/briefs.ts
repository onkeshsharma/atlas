/**
 * M9 — Briefs: the durable instruction document a Run executes
 * (PRD #19; CONTEXT.md "Brief"). Drafted by a Helper Run from the
 * Ticket + project context; the Owner edits before dispatch (variant W —
 * Session B ports the composer; F:201–243 renders it on the detail page).
 *
 * status: draft → final. Dispatch finalizes the latest draft in the same
 * single statement that creates the Owner Run (src/domain/dispatch/).
 */
import { boolean, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { tickets } from "./tickets";

export const briefStatus = pgEnum("brief_status", ["draft", "final"]);

/** who authored the body — the drafting Helper Run or the Owner's edit (W). */
export const briefSource = pgEnum("brief_source", ["helper-run", "owner"]);

export const briefs = pgTable("briefs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => tickets.id),
  /** markdown body — what the Engine is told to do. */
  body: text("body").notNull(),
  status: briefStatus("status").notNull().default("draft"),
  source: briefSource("source").notNull().default("helper-run"),
  seeded: boolean("seeded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Brief = typeof briefs.$inferSelect;
export type BriefStatus = Brief["status"];
