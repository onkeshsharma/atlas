/**
 * M6 — Tickets (durable record; minimal state vocabulary).
 *
 * The cockpit reads tickets for the hero counts (E:122–140) and the
 * Recent feed (E:248–286). Lifecycle derivation stays minimal here by
 * charter — M8 owns the Ticket-lifecycle deep module (states + Category
 * derivation) and may extend this enum with a migration.
 *
 * Enum values use dashes so the §3.3 meta-line word is the value itself
 * ("review-ready" → "review ready" via the kit's dash-to-space rule).
 */
import { boolean, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { projects } from "./projects";

/** E:531–546 census vocabulary (v2 spelling; M8 deepens). */
export const ticketState = pgEnum("ticket_state", [
  "triage",
  "backlog",
  "in-progress",
  "review-ready",
  "shipped",
  "failed",
  "declined",
]);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** human ref — "T-247" (E:164, Z meta lines). */
    ref: text("ref").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    title: text("title").notNull(),
    state: ticketState("state").notNull().default("triage"),
    /** display name/email of who filed it — "ada@acme.io", "you" (E:274). */
    reporter: text("reporter").notNull(),
    seeded: boolean("seeded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tickets_ref_unique").on(t.ref)],
);

export type Ticket = typeof tickets.$inferSelect;
export type TicketState = Ticket["state"];
