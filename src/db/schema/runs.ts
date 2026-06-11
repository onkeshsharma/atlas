/**
 * M6 — Runs: one Engine execution (CONTEXT.md — Run replaces Job).
 *
 * The pg enum mirrors `src/domain/run/states.ts` (the source of truth
 * for the state machine — canon §3.3's seven-state vocabulary). The
 * Needs-Input question/answer payloads live in jsonb; their shape is
 * typed + validated in `src/domain/run/needs-input.ts`.
 *
 * Execution/orchestration (Bridge, worktrees, queue lanes) is M9's —
 * this table carries exactly what the cockpit needs to render and what
 * the state machine needs to transition.
 */
import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { projects } from "./projects";
import { tickets } from "./tickets";

/** §3.3 — queued → running → needs-input → review-ready | shipped | failed | cancelled. */
export const runState = pgEnum("run_state", [
  "queued",
  "running",
  "needs-input",
  "review-ready",
  "shipped",
  "failed",
  "cancelled",
]);

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** human ref — "Run #142" (dev-kit AmberPanel rows). */
  ref: text("ref").notNull(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  /** Helper Runs may not have a Ticket (CONTEXT.md). */
  ticketId: uuid("ticket_id").references(() => tickets.id),
  /** display title — what the Run is doing. */
  title: text("title").notNull(),
  state: runState("state").notNull().default("queued"),
  /** NeedsInputQuestion jsonb (domain/run/needs-input.ts) — set on needs-input. */
  question: jsonb("question"),
  /** NeedsInputAnswer jsonb — set when the Owner answers (M9 wires the action). */
  answer: jsonb("answer"),
  seeded: boolean("seeded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Run = typeof runs.$inferSelect;
