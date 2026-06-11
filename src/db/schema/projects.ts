/**
 * M6 — Projects (minimal vertical slice for the cockpit).
 *
 * Today's pinned strip + "Other projects" rail (E:180–244, E:449–478)
 * read these rows; pin/unpin curation + the full Project surface arrive
 * with M7 (PRD #29–32). `seeded` marks demo provenance — every seed row
 * carries it so honest data and demo data are always distinguishable.
 */
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** display name — "acme-website" (E:198). */
  name: text("name").notNull(),
  /** Today's pinned strip renders only pinned projects (E:9, PRD #10). */
  pinned: boolean("pinned").notNull().default(false),
  /** seed provenance (M6 charter §1) — demo rows are marked, never silent. */
  seeded: boolean("seeded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
