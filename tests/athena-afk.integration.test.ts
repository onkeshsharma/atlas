/**
 * Athena AFK routing — integration against the REAL Neon dev DB (ADR-0006 §4).
 *
 * Proves the production bindings end-to-end: loadAsk reads the pending Ask +
 * context, Athena's verdict drives answerRun (answeredBy="Athena", the
 * delegate-answered audit), markAttempted is one-shot, and abstain leaves the
 * Run in needs-input. Scoped to a Run created here (the heartbeat SWEEP is
 * unscoped — its selection is exercised in the Playwright e2e against the
 * disposable e2e branch, so it never mutates seeded rows). Self-cleaning (marker).
 */
import { and, eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/src/db/client";
import { athenaMemory, athenaSpend, feedEvents, projects, runs } from "@/src/db/schema";
import { fakeAthenaComplete } from "@/src/domain/athena/complete";
import {
  dispatchConsult,
  resolveConsultResult,
  resolveRunWithAthenaReal,
} from "@/src/domain/athena/run-resolver";
import { parseNeedsInputAnswer } from "@/src/domain/run/needs-input";
import { setAfkLevel, setAthenaDailyEscalationCap } from "@/src/domain/settings/instance";
import type { AthenaComplete } from "@/src/domain/athena/types";

const MARK = `IT-AFK-${Date.now()}`;
let projectId: string;
const runIds: string[] = [];

const lowConf: AthenaComplete = async () =>
  JSON.stringify({ choice: "drop", confidence: 0.2, rationale: "irreversible — unsure" });

async function seedNeedsInput(opts: {
  ref: string;
  options?: string[];
  humanOnly?: boolean;
}): Promise<string> {
  const [row] = await db
    .insert(runs)
    .values({
      ref: opts.ref,
      projectId,
      title: `${MARK} ${opts.ref}`,
      state: "needs-input",
      lane: "owner",
      question: {
        kind: "question",
        prompt: "Migrate the old rows or drop them?",
        ...(opts.options ? { options: opts.options } : {}),
        ...(opts.humanOnly ? { humanOnly: true } : {}),
        raisedAt: new Date().toISOString(),
      },
    })
    .returning({ id: runs.id });
  runIds.push(row.id);
  return row.id;
}

beforeAll(async () => {
  const [p] = await db
    .insert(projects)
    .values({ name: `${MARK} project`, slug: `it-afk-${Date.now()}`, seeded: false })
    .returning({ id: projects.id });
  projectId = p.id;
});

afterAll(async () => {
  // Row cleanup (FK-safe order) is wrapped so a throw can't skip the instance-
  // config restores in `finally` — leaving AFK on / a cap set poisons every
  // later run on this shared DB (the trap that bit the prod verify test).
  try {
    await db.delete(feedEvents).where(like(feedEvents.summary, `%${MARK}%`));
    // Phase 4 — the resolve/dispatch paths now write memory + spend; clean both.
    if (runIds.length) {
      await db.delete(athenaMemory).where(inArray(athenaMemory.runId, runIds));
      await db.delete(athenaSpend).where(inArray(athenaSpend.runId, runIds));
      await db.delete(runs).where(inArray(runs.id, runIds));
    }
    await db.delete(projects).where(eq(projects.id, projectId));
  } finally {
    // instance-config restores MUST always run (best-effort, never mask a throw above).
    await setAfkLevel("off").catch(() => {}); // restore dev default
    await setAthenaDailyEscalationCap(0).catch(() => {}); // restore unlimited
  }
});

describe("resolveRunWithAthenaReal (real DB bindings)", () => {
  it("answers a confident option Ask AS Athena — run resumes, audit recorded", async () => {
    const runId = await seedNeedsInput({ ref: `${MARK}-A`, options: ["migrate", "drop"] });

    const out = await resolveRunWithAthenaReal(runId, { complete: fakeAthenaComplete() });
    expect(out.status).toBe("answered");

    const [row] = await db.select().from(runs).where(eq(runs.id, runId));
    expect(row.state).toBe("running"); // needs-input → running
    expect(row.athenaAttemptedAt).not.toBeNull(); // one-shot stamp
    const ans = parseNeedsInputAnswer(row.answer);
    expect(ans?.answeredBy).toBe("Athena");
    expect(ans?.choice).toBe("migrate"); // fake delegate picks the first option
    // question_history captured the { question, answer } pair
    expect(Array.isArray(row.questionHistory)).toBe(true);

    // the delegate-answered audit: an `answered` feed row with actor Athena
    const feed = await db
      .select()
      .from(feedEvents)
      .where(eq(feedEvents.runId, runId))
      .then((rows) => rows.filter((r) => r.kind === "answered"));
    expect(feed).toHaveLength(1);
    expect(feed[0].actor).toBe("Athena");
  });

  it("escalates (leaves needs-input) when Athena is not confident — but marks attempted", async () => {
    const runId = await seedNeedsInput({ ref: `${MARK}-B`, options: ["migrate", "drop"] });

    const out = await resolveRunWithAthenaReal(runId, { complete: lowConf });
    expect(out).toMatchObject({ status: "escalated", reason: "low-confidence" });

    const [row] = await db.select().from(runs).where(eq(runs.id, runId));
    expect(row.state).toBe("needs-input"); // stays for the Owner
    expect(row.athenaAttemptedAt).not.toBeNull(); // one-shot: never re-swept
    expect(row.answer).toBeNull();
    const feed = await db
      .select()
      .from(feedEvents)
      .where(eq(feedEvents.runId, runId))
      .then((rows) => rows.filter((r) => r.kind === "answered"));
    expect(feed).toHaveLength(0); // no answer written
  });

  it("answers a free-text Ask (no options) with Athena's text", async () => {
    const runId = await seedNeedsInput({ ref: `${MARK}-C` });
    const out = await resolveRunWithAthenaReal(runId, { complete: fakeAthenaComplete() });
    expect(out.status).toBe("answered");

    const [row] = await db.select().from(runs).where(eq(runs.id, runId));
    const ans = parseNeedsInputAnswer(row.answer);
    expect(ans?.answeredBy).toBe("Athena");
    expect(ans?.text).toBe("proceed");
  });

  it("escalates a human-only Ask (standard rail), but Ultra Athena answers it", async () => {
    // standard: human-only flag → escalate, stays needs-input
    const a = await seedNeedsInput({ ref: `${MARK}-HO`, options: ["yes", "no"], humanOnly: true });
    const standard = await resolveRunWithAthenaReal(a, { complete: fakeAthenaComplete(), ultra: false });
    expect(standard).toMatchObject({ status: "escalated", reason: "high-stakes" });
    const [r1] = await db.select().from(runs).where(eq(runs.id, a));
    expect(r1.state).toBe("needs-input");

    // ultra: rail lifted → answers it (fresh run; the first is now attempted)
    const b = await seedNeedsInput({ ref: `${MARK}-HO2`, options: ["yes", "no"], humanOnly: true });
    const ultra = await resolveRunWithAthenaReal(b, { complete: fakeAthenaComplete(), ultra: true });
    expect(ultra.status).toBe("answered");
    const [r2] = await db.select().from(runs).where(eq(runs.id, b));
    expect(r2.state).toBe("running");
  });

  it("bridge tier: dispatchConsult emits a consult-requested command (prompt + repoAware) and marks attempted", async () => {
    const [row] = await db
      .insert(runs)
      .values({
        ref: `${MARK}-C1`,
        projectId,
        title: `${MARK} C1`,
        state: "needs-input",
        lane: "owner",
        worktreePath: "C:/tmp/wt",
        question: {
          kind: "question",
          prompt: "Which migration path?",
          options: ["a", "b"],
          raisedAt: new Date().toISOString(),
        },
      })
      .returning({ id: runs.id });
    runIds.push(row.id);

    expect(await dispatchConsult(row.id)).toBe("dispatched");
    const [run] = await db.select().from(runs).where(eq(runs.id, row.id));
    expect(run.athenaAttemptedAt).not.toBeNull();

    const [feed] = await db
      .select()
      .from(feedEvents)
      .where(and(eq(feedEvents.runId, row.id), eq(feedEvents.kind, "consult-requested")));
    const payload = feed.payload as { prompt?: { user: string }; repoAware?: boolean };
    expect(payload.repoAware).toBe(true);
    expect(payload.prompt?.user).toContain("Which migration path?");
  });

  it("bridge tier: resolveConsultResult gates a confident verdict → answers as Athena", async () => {
    const id = await seedNeedsInput({ ref: `${MARK}-C2`, options: ["migrate", "drop"] });
    const out = await resolveConsultResult(
      id,
      JSON.stringify({ choice: "migrate", confidence: 0.9, rationale: "reversible" }),
    );
    expect(out.status).toBe("answered");
    const [run] = await db.select().from(runs).where(eq(runs.id, id));
    expect(run.state).toBe("running");
    expect(parseNeedsInputAnswer(run.answer)?.answeredBy).toBe("Athena");
    expect(parseNeedsInputAnswer(run.answer)?.choice).toBe("migrate");
  });

  it("bridge tier: resolveConsultResult escalates a high-stakes verdict (rail), leaves needs-input", async () => {
    await setAfkLevel("on"); // ensure NOT ultra, so the rail holds
    const id = await seedNeedsInput({ ref: `${MARK}-C3`, options: ["yes", "no"] });
    const out = await resolveConsultResult(
      id,
      JSON.stringify({ choice: "yes", confidence: 0.95, stakes: "high", rationale: "irreversible" }),
    );
    expect(out).toMatchObject({ status: "escalated", reason: "high-stakes" });
    const [run] = await db.select().from(runs).where(eq(runs.id, id));
    expect(run.state).toBe("needs-input");
  });

  it("is a no-op once the Run has left needs-input (one shot per Ask)", async () => {
    const runId = await seedNeedsInput({ ref: `${MARK}-D`, options: ["a", "b"] });
    const first = await resolveRunWithAthenaReal(runId, { complete: fakeAthenaComplete() });
    expect(first.status).toBe("answered");
    // run is now `running` — a second pass finds nothing pending
    const second = await resolveRunWithAthenaReal(runId, { complete: fakeAthenaComplete() });
    expect(second).toEqual({ status: "skipped", reason: "no-pending-ask" });
  });
});

describe("Phase 4 — learning + budget (real DB bindings)", () => {
  it("learning: a resolved decision is recorded into memory (source athena)", async () => {
    const id = await seedNeedsInput({ ref: `${MARK}-MEM`, options: ["migrate", "drop"] });
    await resolveConsultResult(
      id,
      JSON.stringify({ choice: "migrate", confidence: 0.9, rationale: "reversible" }),
    );
    const mem = await db.select().from(athenaMemory).where(eq(athenaMemory.runId, id));
    expect(mem).toHaveLength(1);
    expect(mem[0].source).toBe("athena");
    expect(mem[0].answerChoice).toBe("migrate");
  });

  it("budget: dispatchConsult meters a repo spend", async () => {
    const [row] = await db
      .insert(runs)
      .values({
        ref: `${MARK}-SP`,
        projectId,
        title: `${MARK} SP`,
        state: "needs-input",
        lane: "owner",
        worktreePath: "C:/tmp/wt",
        question: {
          kind: "question",
          prompt: "Spend metering path?",
          options: ["a", "b"],
          raisedAt: new Date().toISOString(),
        },
      })
      .returning({ id: runs.id });
    runIds.push(row.id);
    expect(await dispatchConsult(row.id)).toBe("dispatched");
    const spend = await db.select().from(athenaSpend).where(eq(athenaSpend.runId, row.id));
    expect(spend).toHaveLength(1);
    expect(spend[0].tier).toBe("repo");
  });

  it("budget: dispatchConsult fails safe to the Owner when the cap is spent", async () => {
    // there is already ≥1 spend row in the rolling 24h (the test above); cap=1.
    await setAthenaDailyEscalationCap(1);
    const [row] = await db
      .insert(runs)
      .values({
        ref: `${MARK}-CAP`,
        projectId,
        title: `${MARK} CAP`,
        state: "needs-input",
        lane: "owner",
        worktreePath: "C:/tmp/wt",
        question: {
          kind: "question",
          prompt: "Over-budget path?",
          options: ["a", "b"],
          raisedAt: new Date().toISOString(),
        },
      })
      .returning({ id: runs.id });
    runIds.push(row.id);

    expect(await dispatchConsult(row.id)).toBe("skipped");
    // no consult-requested command emitted …
    const feed = await db
      .select()
      .from(feedEvents)
      .where(and(eq(feedEvents.runId, row.id), eq(feedEvents.kind, "consult-requested")));
    expect(feed).toHaveLength(0);
    // … but the one shot is consumed → it's handed to the Owner (still needs-input).
    const [run] = await db.select().from(runs).where(eq(runs.id, row.id));
    expect(run.athenaAttemptedAt).not.toBeNull();
    expect(run.state).toBe("needs-input");
    await setAthenaDailyEscalationCap(0);
  });
});
