/**
 * M6 — Tickets (durable record); M8 — lifecycle deepening.
 *
 * The cockpit reads tickets for the hero counts (E:122–140) and the
 * Recent feed (E:248–286). M8 (the Ticket-lifecycle deep module —
 * src/domain/ticket/) owns the state vocabulary, the legal-transition
 * table and the Category derivation; this table carries exactly what
 * those modules and the four work surfaces (G/I/F/S) need.
 *
 * Enum values use dashes so the §3.3 meta-line word is the value itself
 * ("review-ready" → "review ready" via the kit's dash-to-space rule).
 */
import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { projects } from "./projects";

/**
 * E:531–546 census vocabulary + the M8 lifecycle additions (appended —
 * pg enums extend via ALTER TYPE … ADD VALUE only):
 * - "needs-info" — Owner asked the reporter for more (triage I's third
 *   action); Category Triage, waiting on the reporter.
 * - "approved"   — Owner approved, ready to dispatch (PRD #14's source
 *   state); Category Active. Dispatch itself is M9.
 * Transition law lives in src/domain/ticket/transitions.ts.
 */
export const ticketState = pgEnum("ticket_state", [
  "triage",
  "backlog",
  "in-progress",
  "review-ready",
  "shipped",
  "failed",
  "declined",
  "needs-info",
  "approved",
]);

/** S:120–130 — Bug / Enhancement / Something else. Null = unset (Atlas guesses at enrichment). */
export const ticketKind = pgEnum("ticket_kind", ["bug", "enhancement", "other"]);

/** S:138–151 — Whenever / Soon / Today / Broken now ("Whenever" is S's default segment). */
export const ticketPriority = pgEnum("ticket_priority", [
  "whenever",
  "soon",
  "today",
  "broken-now",
]);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** human ref — "T-247" (E:164, Z meta lines). New refs draw from ticket_ref_seq (migration 0002). */
    ref: text("ref").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    title: text("title").notNull(),
    /** long-form body — markdown-ish prose the detail page renders as paragraphs (F:168–174, PRD #18). */
    body: text("body").notNull().default(""),
    state: ticketState("state").notNull().default("triage"),
    /** reporter's classification (S kind segmented); null until set or enriched. */
    kind: ticketKind("kind"),
    priority: ticketPriority("priority").notNull().default("whenever"),
    /**
     * Helper-Run enrichment payload (PRD #17) — shape typed + parsed in
     * src/domain/ticket/enrichment.ts. NULL = enrichment pending (the
     * honest pre-Helper state; M9 wires the Helper Run that fills it).
     */
    enrichment: jsonb("enrichment"),
    /** display name/email of who filed it — "ada@acme.io", "you" (E:274). */
    reporter: text("reporter").notNull(),
    /**
     * M13 (additive, migration 0009) — the reporter's Neon Auth user id.
     * `reporter` stays the display string; this column is the Notifier's
     * recipient contract (PRD #28: the REPORTING Collaborator gets the
     * ship email — resolved by id, never by re-parsing the display
     * string). NULL on pre-M13 rows and seed rows: no email, honestly.
     */
    reporterUserId: text("reporter_user_id"),
    seeded: boolean("seeded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tickets_ref_unique").on(t.ref)],
);

export type Ticket = typeof tickets.$inferSelect;
export type TicketState = Ticket["state"];
export type TicketKind = NonNullable<Ticket["kind"]>;
export type TicketPriority = Ticket["priority"];
