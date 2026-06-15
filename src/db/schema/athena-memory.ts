/**
 * Phase 4 (ADR-0007 §7) — Athena's decision memory: the per-instance corpus of
 * resolved Asks that future consults retrieve from. Recorded on EVERY resolution
 * (Owner and Athena) so Athena learns the Owner's precedents; Owner decisions are
 * weighted higher at retrieval (decide.ts) to avoid an echo chamber.
 *
 * Deliberately a SEPARATE store from `runs.question_history` (the Engine's
 * resume transcript): memory is prunable from the Athena activity view, and
 * pruning the Engine transcript would corrupt session resume. Soft-delete via
 * `pruned_at` so a pruned precedent stays auditable but drops out of retrieval.
 */
import { jsonb, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const athenaMemory = pgTable("athena_memory", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** the Run this decision resolved (loose ref — kept even if the run is gone). */
  runId: uuid("run_id"),
  projectId: uuid("project_id"),
  /** the Ask's question text — the retrieval key (lexical similarity in decide.ts). */
  question: text("question").notNull(),
  /** the offered options, when the Ask had them (string[]); null for free-text. */
  options: jsonb("options"),
  /** the chosen option (option Asks) … */
  answerChoice: text("answer_choice"),
  /** … or the free-text answer. */
  answerText: text("answer_text"),
  /** 'owner' (weighted higher) | 'athena' (un-overridden delegate answer). */
  source: text("source").notNull(),
  confidence: real("confidence"),
  rationale: text("rationale"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /** soft-delete: pruned precedents stay auditable but drop out of retrieval. */
  prunedAt: timestamp("pruned_at", { withTimezone: true }),
});

export type AthenaMemoryRow = typeof athenaMemory.$inferSelect;

/**
 * Phase 4 (ADR-0007 §7) — the spend ledger that bounds Athena's cost. One row
 * per EXPENSIVE rung run (repo-aware bridge consult / Council convening); the
 * daily budget governor (budget.ts) counts the rolling-24h rows and, on cap,
 * fails safe to the Owner (escalate, never silent overspend). Cheap quick
 * consults are not metered.
 */
export const athenaSpend = pgTable("athena_spend", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id"),
  /** which expensive rung: 'repo' (bridge repo-aware) | 'council'. */
  tier: text("tier").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AthenaSpendRow = typeof athenaSpend.$inferSelect;
