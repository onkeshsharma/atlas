/**
 * ADR-0008 Phase 2 — the Project Brain's capabilities facet (skills) + freshness.
 *
 * The Bridge harvests the skill inventory + a constitution hash from the live
 * worktree and posts them here. `applyProjectBrain` reconciles the registry:
 * upsert what's present, soft-delete what's gone, and store the hash. neon-http
 * has no interactive transactions, so this is a sequence of idempotent
 * statements (the M5 law) — a partial apply is self-healing on the next harvest.
 */
import { and, asc, desc, eq, isNull, notInArray, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { projects, projectSkills, runs, skillUsage } from "@/src/db/schema";

export type ProjectSkillInput = {
  name: string;
  description?: string;
  modelInvocable: boolean;
  userInvocable: boolean;
};

export type ProjectBrainBody = {
  skills: ProjectSkillInput[];
  constitutionHash: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** validate the Bridge's brain payload (never trust the wire — the M6 law). */
export function parseProjectBrainBody(value: unknown): ProjectBrainBody | null {
  if (!isRecord(value)) return null;
  if (typeof value.constitutionHash !== "string") return null;
  if (!Array.isArray(value.skills)) return null;
  const skills: ProjectSkillInput[] = [];
  for (const s of value.skills) {
    if (!isRecord(s) || typeof s.name !== "string" || !s.name) return null;
    if (s.description !== undefined && typeof s.description !== "string") return null;
    if (typeof s.modelInvocable !== "boolean" || typeof s.userInvocable !== "boolean") return null;
    skills.push({
      name: s.name,
      ...(s.description ? { description: s.description } : {}),
      modelInvocable: s.modelInvocable,
      userInvocable: s.userInvocable,
    });
  }
  return { skills, constitutionHash: value.constitutionHash };
}

/** reconcile the project's skill registry + store the constitution hash. */
export async function applyProjectBrain(
  projectId: string,
  body: ProjectBrainBody,
): Promise<{ ok: boolean }> {
  // upsert each present skill (re-surfaces a previously-removed one).
  for (const s of body.skills) {
    await db.execute(sql`
      insert into project_skills
        (project_id, name, description, model_invocable, user_invocable, first_seen_at, last_seen_at)
      values (${projectId}, ${s.name}, ${s.description ?? null}, ${s.modelInvocable}, ${s.userInvocable}, now(), now())
      on conflict (project_id, name) do update set
        description = ${s.description ?? null},
        model_invocable = ${s.modelInvocable},
        user_invocable = ${s.userInvocable},
        last_seen_at = now(),
        removed_at = null
    `);
  }
  // soft-delete the skills this harvest no longer found.
  const names = body.skills.map((s) => s.name);
  await db
    .update(projectSkills)
    .set({ removedAt: new Date() })
    .where(
      and(
        eq(projectSkills.projectId, projectId),
        isNull(projectSkills.removedAt),
        names.length ? notInArray(projectSkills.name, names) : sql`true`,
      ),
    );
  // store the freshness hash.
  await db.update(projects).set({ constitutionHash: body.constitutionHash }).where(eq(projects.id, projectId));
  return { ok: true };
}

export type ProjectSkillView = {
  name: string;
  description: string | null;
  modelInvocable: boolean;
  userInvocable: boolean;
  lastSeenAt: Date;
};

// ── usage ledger (ADR-0008 Phase 2) ────────────────────────────────────

export type SkillUsageInput = { skill: string; count: number };

export function parseSkillUsageBody(value: unknown): { skills: SkillUsageInput[] } | null {
  if (!isRecord(value) || !Array.isArray(value.skills)) return null;
  const skills: SkillUsageInput[] = [];
  for (const s of value.skills) {
    if (!isRecord(s) || typeof s.skill !== "string" || !s.skill) return null;
    if (typeof s.count !== "number" || !Number.isFinite(s.count) || s.count < 1) return null;
    skills.push({ skill: s.skill, count: Math.floor(s.count) });
  }
  return { skills };
}

/**
 * Record a Run's skill invocations. Looks up the run's project; upserts one row
 * per (run, skill) so a re-post is idempotent (set, not accumulate). Returns
 * ok:false when the run is gone.
 */
export async function recordSkillUsage(
  runId: string,
  skills: SkillUsageInput[],
): Promise<{ ok: boolean }> {
  const [run] = await db.select({ projectId: runs.projectId }).from(runs).where(eq(runs.id, runId)).limit(1);
  if (!run) return { ok: false };
  for (const s of skills) {
    await db.execute(sql`
      insert into skill_usage (run_id, project_id, skill, count)
      values (${runId}, ${run.projectId}, ${s.skill}, ${s.count})
      on conflict (run_id, skill) do update set count = ${s.count}, created_at = now()
    `);
  }
  return { ok: true };
}

/** per-skill invocation totals for a project (most-used first). */
export async function skillUsageCounts(projectId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ skill: skillUsage.skill, total: sql<number>`sum(${skillUsage.count})::int` })
    .from(skillUsage)
    .where(eq(skillUsage.projectId, projectId))
    .groupBy(skillUsage.skill)
    .orderBy(desc(sql`sum(${skillUsage.count})`));
  return new Map(rows.map((r) => [r.skill, r.total]));
}

/** the live (non-removed) skill inventory for a project, sorted by name. */
export async function projectSkillsList(projectId: string): Promise<ProjectSkillView[]> {
  const rows = await db
    .select({
      name: projectSkills.name,
      description: projectSkills.description,
      modelInvocable: projectSkills.modelInvocable,
      userInvocable: projectSkills.userInvocable,
      lastSeenAt: projectSkills.lastSeenAt,
    })
    .from(projectSkills)
    .where(and(eq(projectSkills.projectId, projectId), isNull(projectSkills.removedAt)))
    .orderBy(asc(projectSkills.name));
  return rows;
}
