/**
 * M11 — project_members: per-project rosters with roles (PRD #38).
 *
 * THE TWO-TABLE RULE (load-bearing — M13 enforces it on every
 * Collaborator surface):
 *
 *   `memberships` (M5) stays the INSTANCE-level auth source of truth —
 *   whether a person may sign in to this Atlas at all, and as what role.
 *   `project_members` scopes per-project VISIBILITY — which projects a
 *   Collaborator can see, file Tickets against, and get Ship
 *   Notifications for. A Collaborator must hold BOTH an instance
 *   membership AND ≥1 roster row for a project to see that project
 *   (src/domain/people/guard.ts is the one helper that answers this —
 *   never re-derive it inline).
 *
 *   The Owner is NOT rostered: exactly one Owner per instance
 *   (memberships_one_owner) and the Owner sees everything — a roster row
 *   for the Owner would be a second, contradictable copy of that truth.
 *   Roster rows are Collaborator grants.
 *
 * Removing a roster row ≠ revoking instance membership: the first takes
 * one project out of view, the second (deleting the memberships row)
 * removes the person. Both writers live in src/domain/people/roster.ts
 * and follow THE OUTBOX RULE (single statement + feed row).
 */
import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { membershipRole } from "./auth";
import { projects } from "./projects";

export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    /** Neon Auth user id (neon_auth.user.id — text, managed schema). */
    userId: text("user_id").notNull(),
    /**
     * Per-project role. v2.0 grants are always `collaborator` (the Owner
     * is never rostered — see header); the column exists so M13+ can
     * grade access without a schema change.
     */
    role: membershipRole("role").notNull().default("collaborator"),
    /** Neon Auth user id of the granting Owner ("added by you" — M:264). */
    addedBy: text("added_by").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("project_members_project_user_unique").on(t.projectId, t.userId)],
);

export type ProjectMember = typeof projectMembers.$inferSelect;
