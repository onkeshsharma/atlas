/**
 * ADR-0008 Phase 2 — the capabilities facet of the Project Brain: the skills
 * (`.claude/skills/<name>/SKILL.md`) a project ships, harvested by the Bridge
 * from the live worktree on each run.
 *
 * A registry, not an event log: one row per (project, skill), upserted on every
 * harvest. A skill that disappears from the repo is SOFT-deleted (`removedAt`)
 * so its history stays auditable and it drops out of the live inventory — the
 * same freshness posture as the rest of the Brain.
 */
import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { projects } from "./projects";

export const projectSkills = pgTable(
  "project_skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    /** the skill's invocation name (frontmatter `name`, else its directory). */
    name: text("name").notNull(),
    description: text("description"),
    /** false when frontmatter sets `disable-model-invocation: true`. */
    modelInvocable: boolean("model_invocable").notNull().default(true),
    /** false when frontmatter sets `user-invocable: false`. */
    userInvocable: boolean("user_invocable").notNull().default(true),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    /** soft-delete: set when a harvest no longer finds the skill in the repo. */
    removedAt: timestamp("removed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("project_skills_project_name_unique").on(t.projectId, t.name)],
);

export type ProjectSkillRow = typeof projectSkills.$inferSelect;
