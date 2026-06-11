/**
 * M6 — Runs: one Engine execution (CONTEXT.md — Run replaces Job).
 * M9 — execution deepening: the Bridge/queue/worktree columns, failure
 * kind, diff stats, ship refs, and the answered-question history.
 *
 * The pg enum mirrors `src/domain/run/states.ts` (the source of truth
 * for the state machine — canon §3.3's seven-state vocabulary). The
 * Needs-Input question/answer payloads live in jsonb; their shape is
 * typed + validated in `src/domain/run/needs-input.ts`.
 */
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { bridges } from "./bridges";
import { briefs } from "./briefs";
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

/** M9 — priority lanes: Helper Runs ALWAYS yield to Owner Runs (PRD #21). */
export const runLane = pgEnum("run_lane", ["owner", "helper"]);

/** M9 — what a Helper Run does (CONTEXT.md "Helper Run"; null on owner-lane runs). */
export const runHelperKind = pgEnum("run_helper_kind", [
  "enrich-ticket", //   writes tickets.enrichment (PRD #17)
  "draft-brief", //     drafts the Brief from Ticket + context (PRD #19)
  "ingest-project", //  writes projects.ingest_summary (PRD #29; M7 seam)
]);

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** human ref — "R-12" (seed band; new refs draw from run_ref_seq, migration 0004). */
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
  // ── M9 execution columns (migration 0004) ──
  /** priority lane — owner runs are scheduled before helper runs, always. */
  lane: runLane("lane").notNull().default("owner"),
  /** helper task — null on owner-lane runs. */
  helperKind: runHelperKind("helper_kind"),
  /** the Brief this Run executes (owner runs; finalized at dispatch). */
  briefId: uuid("brief_id").references(() => briefs.id),
  /** which Bridge claimed it (set by the queued→running claim). */
  bridgeId: uuid("bridge_id").references(() => bridges.id),
  /** the per-Run git worktree on the Owner's machine (ADR-0001). */
  worktreePath: text("worktree_path"),
  /** the worktree's branch — "atlas/run/<id>". */
  branch: text("branch"),
  /** queue ordering token within the lane (PRD #7; reorder = swap tokens). */
  queuePosition: integer("queue_position"),
  /** typed failure kind (src/domain/run/failure.ts) — set with state=failed. */
  failureKind: text("failure_kind"),
  /** the failure's raw detail line (stderr tail, git message) — K's guidance reads kind, not this. */
  failureDetail: text("failure_detail"),
  /** RunDiffStats jsonb (src/domain/run/diff-stats.ts) — set at review-ready; feeds KK + the Hints file-sets seam. */
  diffStats: jsonb("diff_stats"),
  /** ship refs (Session B writes these at approve-and-ship; PRD #27). */
  prUrl: text("pr_url"),
  mergeSha: text("merge_sha"),
  /** answered-question history — array of { question, answer } in the M6 jsonb shapes. */
  questionHistory: jsonb("question_history"),
  seeded: boolean("seeded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Run = typeof runs.$inferSelect;
export type RunLane = Run["lane"];
export type RunHelperKind = NonNullable<Run["helperKind"]>;
