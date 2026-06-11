/**
 * M9 — per-Run stdout storage (PRD #5).
 *
 * Stdout NEVER rides `feed_events` (charter hard rule — it would bury
 * the activity record under terminal noise and wake every open cockpit
 * tab per chunk). This table carries its OWN cursor: `seq` is the
 * Bridge-assigned per-run monotonic number, so ingest is idempotent
 * (unique (run_id, seq) + ON CONFLICT DO NOTHING) and the browser's
 * per-run SSE stream resumes from Last-Event-ID = seq
 * (docs/adr/0002-bridge-transport.md).
 */
import {
  bigserial,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { runs } from "./runs";

export const runStdoutChunks = pgTable(
  "run_stdout_chunks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id),
    /** Bridge-assigned per-run sequence — the stdout stream's cursor. */
    seq: integer("seq").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("run_stdout_run_seq_unique").on(t.runId, t.seq)],
);

export type RunStdoutChunk = typeof runStdoutChunks.$inferSelect;
