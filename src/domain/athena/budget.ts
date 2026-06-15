/**
 * Athena budget governor (ADR-0007 §7) — bounds the cost of the EXPENSIVE rungs
 * (repo-aware bridge consult + Council). Each expensive rung writes one spend
 * row; `withinBudget` counts the rolling-24h rows against the configured cap and,
 * on cap, the caller fails safe to the Owner (escalate, never silent overspend).
 *
 * Cheap quick consults are NOT metered — only escalations cost real spend, so
 * only escalations are governed (the grill ruling).
 */
import { gte, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { athenaSpend } from "@/src/db/schema";

import { athenaDailyEscalationCap } from "../settings/instance";

export type SpendTier = "repo" | "council";

const DAY_MS = 24 * 60 * 60 * 1000;

/** record one expensive-rung spend (best-effort metering; never throws to caller). */
export async function recordSpend(tier: SpendTier, runId?: string | null): Promise<void> {
  await db.execute(sql`
    insert into athena_spend (tier, run_id) values (${tier}, ${runId ?? null})
  `);
}

/** how many expensive rungs were spent in the rolling window (default 24h). */
export async function escalationsSince(nowMs: number, windowMs = DAY_MS): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(athenaSpend)
    .where(gte(athenaSpend.createdAt, new Date(nowMs - windowMs)));
  return row?.n ?? 0;
}

/**
 * Is there budget left for another expensive rung? True when the cap is 0
 * (unlimited) or the rolling-24h count is below it. `nowMs` injectable for tests.
 */
export async function withinBudget(nowMs: number = Date.now()): Promise<boolean> {
  const cap = await athenaDailyEscalationCap();
  if (cap <= 0) return true; // 0 = unlimited
  const spent = await escalationsSince(nowMs);
  return spent < cap;
}
