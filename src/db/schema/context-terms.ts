/**
 * M7 — context_terms: a Project's living domain language (PRD #31).
 *
 * The Context viewer (variant P) renders confirmed terms as the
 * "Language" section (P:106–138) and `suggested` rows as "Words the
 * Engine noticed" (P:214–255) with add/dismiss affordances. The Engine
 * itself only starts suggesting at M9 — M7 ships the render states +
 * the add/dismiss mutations over seeded example rows (charter §1).
 *
 * `avoid` marks negative vocabulary ("don't say User") — P:133's rose
 * AVOID badge. `uses` is the Engine's observed occurrence count for
 * suggested terms (P:237 "23 uses").
 */
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { projects } from "./projects";

export const contextTermStatus = pgEnum("context_term_status", [
  "confirmed",
  "suggested",
]);

export const contextTerms = pgTable(
  "context_terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    term: text("term").notNull(),
    /** the definition prose (P's <dd>); empty for fresh Engine suggestions. */
    meaning: text("meaning").notNull(),
    status: contextTermStatus("status").notNull().default("confirmed"),
    /** who put it here — "owner" | "engine" (charter §1). */
    provenance: text("provenance").notNull().default("owner"),
    /** P:133 — negative vocabulary, rendered with the rose AVOID badge. */
    avoid: boolean("avoid").notNull().default(false),
    /** Engine-observed occurrence count for suggested terms (P:237). */
    uses: integer("uses"),
    seeded: boolean("seeded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("context_terms_project_term_unique").on(t.projectId, t.term)],
);

export type ContextTerm = typeof contextTerms.$inferSelect;
export type ContextTermStatus = ContextTerm["status"];
