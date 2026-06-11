/**
 * M11 — the project-visibility guard (charter item 1; M13 enforces it
 * on every Collaborator surface).
 *
 * THE TWO-TABLE RULE (full statement in src/db/schema/project-members.ts):
 *
 *   instance `memberships`  → MAY this person sign in, and as what role?
 *   `project_members`       → WHICH projects may a Collaborator see?
 *
 * A Collaborator sees a project iff BOTH hold: a memberships row
 * (role = collaborator) AND a project_members row for that project.
 * The Owner holds the instance — every project is visible, no roster
 * row exists or is consulted. This module is the ONE place that answers
 * the question; surfaces and M13's collab routes call these helpers and
 * never re-derive the join inline.
 */
import { and, eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import { memberships, projectMembers } from "@/src/db/schema";

export type ProjectAccess =
  | { ok: true; role: "owner" | "collaborator" }
  | { ok: false; reason: "no-membership" | "not-on-roster" };

/**
 * The two-table check. Pass the caller's membership role when a guard
 * already resolved it (saves the first lookup); omit it to resolve from
 * the DB.
 */
export async function projectAccessFor(
  userId: string,
  projectId: string,
  knownRole?: "owner" | "collaborator" | null,
): Promise<ProjectAccess> {
  const role =
    knownRole !== undefined
      ? knownRole
      : ((
          await db.query.memberships.findFirst({
            where: eq(memberships.userId, userId),
          })
        )?.role ?? null);
  if (role === null) return { ok: false, reason: "no-membership" };
  if (role === "owner") return { ok: true, role }; // the Owner sees everything
  const roster = await db.query.projectMembers.findFirst({
    where: and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)),
  });
  if (!roster) return { ok: false, reason: "not-on-roster" };
  return { ok: true, role };
}

/** Convenience boolean for list filtering. */
export async function canSeeProject(
  userId: string,
  projectId: string,
  knownRole?: "owner" | "collaborator" | null,
): Promise<boolean> {
  return (await projectAccessFor(userId, projectId, knownRole)).ok;
}

/**
 * The Collaborator's visible project ids — M13's list-scoping query
 * (inbox, ticket lists, project pickers). Owner callers should not use
 * this: their answer is "all projects" and no roster rows exist to say so.
 */
export async function visibleProjectIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));
  return rows.map((r) => r.projectId);
}
