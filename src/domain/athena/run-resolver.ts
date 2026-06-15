/**
 * Athena ↔ real Atlas wiring (ADR-0006 §4): the production bindings for
 * resolveRunWithAthena (loadAsk from the DB, answer via answerRun, markAttempted
 * via the one-shot column) plus the AFK fallback sweep the heartbeat drives.
 */
import { and, asc, eq, isNull, lte } from "drizzle-orm";

import { db } from "@/src/db/client";
import { briefs, projects, runs, tickets } from "@/src/db/schema";
import { sql } from "drizzle-orm";

import { afkFallbackMinutes, afkLevel } from "../settings/instance";
import { parseRunDiffStats } from "../run/diff-stats";
import { parseNeedsInputQuestion } from "../run/needs-input";
import { answerRun } from "../run/bridge-writers";
import { stdoutTail } from "../run/stdout";
import { athenaComplete } from "./complete";
import { resolveRunWithAthena, type AthenaResolveDeps, type AthenaResolveOutcome } from "./resolve";
import type { AthenaAsk, AthenaComplete, AthenaContext } from "./types";

const TRANSCRIPT_TAIL_LINES = 40;
const SWEEP_BATCH = 5;

/** load a Run's pending Ask + curated context, or null if it isn't waiting. */
async function loadAsk(
  runId: string,
): Promise<{ ask: AthenaAsk; context: AthenaContext } | null> {
  const [row] = await db
    .select({
      state: runs.state,
      ref: runs.ref,
      question: runs.question,
      diffStats: runs.diffStats,
      ticketId: runs.ticketId,
      projectName: projects.name,
      ticketTitle: tickets.title,
      ticketBody: tickets.body,
    })
    .from(runs)
    .innerJoin(projects, eq(runs.projectId, projects.id))
    .leftJoin(tickets, eq(runs.ticketId, tickets.id))
    .where(eq(runs.id, runId))
    .limit(1);

  if (!row || row.state !== "needs-input") return null;
  const q = parseNeedsInputQuestion(row.question);
  if (!q) return null;

  // brief body (latest for the ticket, if any) — best-effort context.
  let brief: string | undefined;
  if (row.ticketId) {
    const [b] = await db
      .select({ body: briefs.body })
      .from(briefs)
      .where(eq(briefs.ticketId, row.ticketId))
      .orderBy(asc(briefs.updatedAt))
      .limit(1);
    brief = b?.body ?? undefined;
  }

  const tail = await stdoutTail(runId, TRANSCRIPT_TAIL_LINES).catch(() => ({ lines: [] as { text: string }[] }));
  const recentTranscript = tail.lines.length
    ? tail.lines.map((l) => l.text).join("\n")
    : undefined;

  const diff = parseRunDiffStats(row.diffStats);
  const diffSummary = diff
    ? `${diff.filesChanged} file(s), +${diff.insertions}/-${diff.deletions}`
    : undefined;

  // human-only flag (ADR-0007 §4): the Engine may stamp it on the question jsonb
  // (parseNeedsInputQuestion drops unknown fields, so read it from the raw row).
  const humanOnly =
    typeof row.question === "object" &&
    row.question !== null &&
    (row.question as Record<string, unknown>).humanOnly === true;
  const ask: AthenaAsk = {
    question: q.prompt,
    ...(q.options && q.options.length ? { options: q.options } : {}),
    ...(humanOnly ? { humanOnly: true } : {}),
  };
  const context: AthenaContext = {
    projectName: row.projectName,
    runRef: row.ref,
    ...(row.ticketTitle ? { ticketTitle: row.ticketTitle } : {}),
    ...(row.ticketBody ? { ticketBody: row.ticketBody } : {}),
    ...(brief ? { brief } : {}),
    ...(recentTranscript ? { recentTranscript } : {}),
    ...(diffSummary ? { diffSummary } : {}),
  };
  return { ask, context };
}

async function markAttempted(runId: string): Promise<void> {
  await db.execute(
    sql`update runs set athena_attempted_at = now() where id = ${runId} and athena_attempted_at is null`,
  );
}

/**
 * Production resolve: real bindings; `complete`/`ultra` overridable for tests.
 * When `ultra` isn't supplied it's derived from the live AFK level (Ultra
 * Athena lifts the high-stakes rail).
 */
export async function resolveRunWithAthenaReal(
  runId: string,
  override: Partial<Pick<AthenaResolveDeps, "complete" | "now" | "minConfidence" | "ultra">> = {},
): Promise<AthenaResolveOutcome> {
  const complete: AthenaComplete = override.complete ?? athenaComplete();
  const ultra = override.ultra ?? (await afkLevel()) === "ultra";
  return resolveRunWithAthena(runId, {
    loadAsk,
    complete,
    answer: async (rid, ans) => {
      const r = await answerRun({ runId: rid, answer: ans, actor: ans.answeredBy });
      return r.ok;
    },
    markAttempted,
    ...(override.now ? { now: override.now } : {}),
    ...(override.minConfidence !== undefined ? { minConfidence: override.minConfidence } : {}),
    ...(ultra ? { ultra: true } : {}),
  });
}

/**
 * AFK fallback sweep (heartbeat-driven, ADR-0007 §4). Resolves never-attempted
 * needs-input Runs by AFK level: **on/ultra → immediately**; **off → only those
 * idle past the configurable fallback window** (0 minutes = never). Ultra lifts
 * the high-stakes rail for the consults it triggers. Capped per pass; failures
 * are swallowed so a heartbeat never fails because of Athena.
 */
export async function sweepAfk(
  override: Partial<Pick<AthenaResolveDeps, "complete">> & { nowMs?: number; limit?: number } = {},
): Promise<AthenaResolveOutcome[]> {
  const level = await afkLevel();
  const ultra = level === "ultra";
  const nowMs = override.nowMs ?? Date.now();

  let cutoff: Date;
  if (level === "off") {
    const minutes = await afkFallbackMinutes();
    if (minutes <= 0) return []; // 0 = never auto-take-over while AFK is off
    cutoff = new Date(nowMs - minutes * 60_000);
  } else {
    cutoff = new Date(nowMs); // on / ultra → immediate
  }

  const candidates = await db
    .select({ id: runs.id })
    .from(runs)
    .where(
      and(
        eq(runs.state, "needs-input"),
        isNull(runs.athenaAttemptedAt),
        lte(runs.updatedAt, cutoff),
      ),
    )
    .orderBy(asc(runs.updatedAt))
    .limit(override.limit ?? SWEEP_BATCH);

  const outcomes: AthenaResolveOutcome[] = [];
  for (const c of candidates) {
    try {
      outcomes.push(
        await resolveRunWithAthenaReal(c.id, {
          ultra,
          ...(override.complete ? { complete: override.complete } : {}),
        }),
      );
    } catch {
      // never let one bad Ask abort the sweep / fail the heartbeat.
    }
  }
  return outcomes;
}
