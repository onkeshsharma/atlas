/**
 * Athena activity (ADR-0007 §6) — the delegate-answered audit. Reads the
 * `answered` feed rows whose actor is "Athena" (the decisions Athena made on
 * the Owner's behalf), with the rationale/confidence Athena recorded.
 */
import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { feedEvents, runs } from "@/src/db/schema";

import { parseNeedsInputAnswer } from "../run/needs-input";

const ATHENA_ACTOR = "Athena";

export type AthenaDecision = {
  feedId: number;
  runId: string | null;
  runRef: string | null;
  summary: string;
  at: Date;
  choice?: string;
  text?: string;
  rationale?: string;
  confidence?: number;
};

export async function athenaDecisions(limit = 50): Promise<AthenaDecision[]> {
  const rows = await db
    .select({
      id: feedEvents.id,
      runId: feedEvents.runId,
      summary: feedEvents.summary,
      createdAt: feedEvents.createdAt,
      payload: feedEvents.payload,
      ref: runs.ref,
    })
    .from(feedEvents)
    .leftJoin(runs, eq(feedEvents.runId, runs.id))
    .where(and(eq(feedEvents.kind, "answered"), eq(feedEvents.actor, ATHENA_ACTOR)))
    .orderBy(desc(feedEvents.id))
    .limit(limit);

  return rows.map((r) => {
    const ans = parseNeedsInputAnswer((r.payload as { answer?: unknown } | null)?.answer);
    return {
      feedId: Number(r.id),
      runId: r.runId,
      runRef: r.ref ?? null,
      summary: r.summary,
      at: r.createdAt,
      choice: ans?.choice,
      text: ans?.text,
      rationale: ans?.rationale,
      confidence: ans?.confidence,
    };
  });
}

/** how many decisions Athena has made (optionally since a timestamp) — the chip count. */
export async function athenaDecisionCount(sinceMs?: number): Promise<number> {
  const conds = [eq(feedEvents.kind, "answered"), eq(feedEvents.actor, ATHENA_ACTOR)];
  if (sinceMs !== undefined) conds.push(gte(feedEvents.createdAt, new Date(sinceMs)));
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(feedEvents)
    .where(and(...conds));
  return row?.n ?? 0;
}
