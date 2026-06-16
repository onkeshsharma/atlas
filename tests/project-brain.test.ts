/**
 * ADR-0008 Phase 2 — Project Brain capabilities facet. Pure parse + integration
 * against the REAL Neon dev DB (the harvest writer reconciles the registry).
 * Self-cleaning (marker slug).
 */
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/src/db/client";
import { projects, projectSkills, runs, skillUsage } from "@/src/db/schema";
import {
  applyProjectBrain,
  parseProjectBrainBody,
  parseSkillUsageBody,
  projectSkillsList,
  recordSkillUsage,
  skillUsageCounts,
} from "@/src/domain/project/brain";

const MARK = `BRAIN-${Date.now()}`;
let projectId: string;

beforeAll(async () => {
  const [p] = await db
    .insert(projects)
    .values({ name: `${MARK} project`, slug: `${MARK}-slug` })
    .returning({ id: projects.id });
  projectId = p.id;
});

afterAll(async () => {
  try {
    await db.delete(skillUsage).where(eq(skillUsage.projectId, projectId));
    await db.delete(projectSkills).where(eq(projectSkills.projectId, projectId));
    await db.delete(runs).where(eq(runs.projectId, projectId));
  } finally {
    if (projectId) await db.delete(projects).where(inArray(projects.id, [projectId]));
  }
});

describe("parseProjectBrainBody", () => {
  it("accepts a well-formed body and rejects malformed ones", () => {
    expect(
      parseProjectBrainBody({
        skills: [{ name: "grill", description: "x", modelInvocable: true, userInvocable: false }],
        constitutionHash: "abc",
      }),
    ).toEqual({
      skills: [{ name: "grill", description: "x", modelInvocable: true, userInvocable: false }],
      constitutionHash: "abc",
    });
    expect(parseProjectBrainBody({ skills: [], constitutionHash: "" })).toEqual({ skills: [], constitutionHash: "" });
    expect(parseProjectBrainBody(null)).toBeNull();
    expect(parseProjectBrainBody({ skills: [], constitutionHash: 5 })).toBeNull();
    expect(parseProjectBrainBody({ skills: [{ name: "x" }], constitutionHash: "h" })).toBeNull(); // missing flags
    expect(parseProjectBrainBody({ skills: "nope", constitutionHash: "h" })).toBeNull();
  });
});

describe("applyProjectBrain (real DB)", () => {
  it("upserts the inventory, stores the hash, and reconciles on the next harvest", async () => {
    await applyProjectBrain(projectId, {
      skills: [
        { name: "grill", description: "interview", modelInvocable: true, userInvocable: true },
        { name: "triage", modelInvocable: true, userInvocable: true },
      ],
      constitutionHash: "hash-1",
    });
    let list = await projectSkillsList(projectId);
    expect(list.map((s) => s.name)).toEqual(["grill", "triage"]);
    expect(list.find((s) => s.name === "grill")?.description).toBe("interview");
    const [p1] = await db.select({ h: projects.constitutionHash }).from(projects).where(eq(projects.id, projectId));
    expect(p1.h).toBe("hash-1");

    // next harvest: triage gone, a new skill, grill's description changed.
    await applyProjectBrain(projectId, {
      skills: [
        { name: "grill", description: "interview hard", modelInvocable: true, userInvocable: false },
        { name: "tdd", modelInvocable: true, userInvocable: true },
      ],
      constitutionHash: "hash-2",
    });
    list = await projectSkillsList(projectId);
    expect(list.map((s) => s.name)).toEqual(["grill", "tdd"]); // triage soft-deleted, tdd added
    expect(list.find((s) => s.name === "grill")?.description).toBe("interview hard"); // updated
    expect(list.find((s) => s.name === "grill")?.userInvocable).toBe(false);
    const [p2] = await db.select({ h: projects.constitutionHash }).from(projects).where(eq(projects.id, projectId));
    expect(p2.h).toBe("hash-2");

    // a later harvest that re-adds triage un-removes it (no duplicate row).
    await applyProjectBrain(projectId, {
      skills: [{ name: "triage", modelInvocable: true, userInvocable: true }],
      constitutionHash: "hash-3",
    });
    list = await projectSkillsList(projectId);
    expect(list.map((s) => s.name)).toEqual(["triage"]); // grill + tdd now removed, triage back
  });
});

describe("skill usage (real DB)", () => {
  it("parses the body, records per-(run,skill) idempotently, and aggregates by skill", () => {
    expect(parseSkillUsageBody({ skills: [{ skill: "grill", count: 2 }] })).toEqual({
      skills: [{ skill: "grill", count: 2 }],
    });
    expect(parseSkillUsageBody({ skills: [{ skill: "x", count: 0 }] })).toBeNull(); // count must be ≥ 1
    expect(parseSkillUsageBody({ skills: [{ skill: "", count: 1 }] })).toBeNull();
    expect(parseSkillUsageBody(null)).toBeNull();
  });

  it("aggregates usage across runs and re-posts idempotently", async () => {
    const mk = async (ref: string) => {
      const [r] = await db
        .insert(runs)
        .values({ ref, projectId, title: ref, state: "shipped", lane: "owner" })
        .returning({ id: runs.id });
      return r.id;
    };
    const runA = await mk(`${MARK}-RA`);
    const runB = await mk(`${MARK}-RB`);

    expect((await recordSkillUsage(runA, [{ skill: "grill", count: 2 }, { skill: "tdd", count: 1 }])).ok).toBe(true);
    expect((await recordSkillUsage(runB, [{ skill: "grill", count: 3 }])).ok).toBe(true);

    let counts = await skillUsageCounts(projectId);
    expect(counts.get("grill")).toBe(5); // 2 + 3 across runs
    expect(counts.get("tdd")).toBe(1);

    // re-post run A SETS (not accumulates) — idempotent.
    await recordSkillUsage(runA, [{ skill: "grill", count: 2 }, { skill: "tdd", count: 1 }]);
    counts = await skillUsageCounts(projectId);
    expect(counts.get("grill")).toBe(5);

    expect((await recordSkillUsage("00000000-0000-4000-8000-000000000000", [{ skill: "x", count: 1 }])).ok).toBe(false);
  });
});
