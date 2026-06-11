/**
 * M6 — Live broker: feed-outbox cursor → typed LiveEvents.
 *
 * Transport decision: docs/adr/0001-live-transport.md. The bigserial id
 * on feed_events is a monotonic cursor; the SSE route polls
 * `pollLiveEvents(since)` and streams whatever appended. Because run
 * transitions write their feed row in the same statement that flips the
 * run (src/domain/run/transitions.ts), a delivered cursor can never
 * have missed a run event — at-least-once without pg_notify's
 * at-most-once gap (v1 T27/T41 prior art, rewritten; see the ADR).
 */
import { asc, desc, gt } from "drizzle-orm";

import { db } from "@/src/db/client";
import { feedEvents, type FeedEvent } from "@/src/db/schema";

import { parseNeedsInputAnswer, parseNeedsInputQuestion } from "../run/needs-input";
import { isRunState } from "../run/states";
import type { FeedEventSnapshot, LiveEvent } from "./events";

export function toSnapshot(row: FeedEvent): FeedEventSnapshot {
  return {
    id: row.id,
    kind: row.kind,
    actor: row.actor,
    summary: row.summary,
    preview: row.preview,
    projectId: row.projectId,
    ticketId: row.ticketId,
    runId: row.runId,
    ticketRef: row.ticketRef,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Pure mapping: one outbox row → 1..3 LiveEvents. Every row is a
 * feed-appended; rows written by a run transition (runId + {from,to}
 * payload) also carry run-state-changed, and needs-input/answered rows
 * raise their dedicated events with the validated payload.
 */
export function rowToLiveEvents(row: FeedEvent): LiveEvent[] {
  const events: LiveEvent[] = [
    { type: "feed-appended", cursor: row.id, event: toSnapshot(row) },
  ];
  const payload =
    typeof row.payload === "object" && row.payload !== null && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : null;
  const at = row.createdAt.toISOString();

  if (row.runId && payload && isRunState(payload.to)) {
    events.push({
      type: "run-state-changed",
      cursor: row.id,
      runId: row.runId,
      projectId: row.projectId,
      from: isRunState(payload.from) ? payload.from : null,
      to: payload.to,
      at,
    });
    if (row.kind === "needs-input") {
      const question = parseNeedsInputQuestion(payload.question);
      if (question) {
        events.push({
          type: "needs-input-raised",
          cursor: row.id,
          runId: row.runId,
          question,
          at,
        });
      }
    }
    if (row.kind === "answered") {
      const answer = parseNeedsInputAnswer(payload.answer);
      if (answer) {
        events.push({
          type: "needs-input-answered",
          cursor: row.id,
          runId: row.runId,
          answer,
          at,
        });
      }
    }
  }
  return events;
}

/** the cursor a fresh subscriber starts from (= newest existing row). */
export async function latestCursor(): Promise<number> {
  const rows = await db
    .select({ id: feedEvents.id })
    .from(feedEvents)
    .orderBy(desc(feedEvents.id))
    .limit(1);
  return rows[0]?.id ?? 0;
}

/** poll the outbox past `since`; returns the mapped events + new cursor. */
export async function pollLiveEvents(
  since: number,
  limit = 100,
): Promise<{ events: LiveEvent[]; cursor: number }> {
  const rows = await db
    .select()
    .from(feedEvents)
    .where(gt(feedEvents.id, since))
    .orderBy(asc(feedEvents.id))
    .limit(limit);
  const events = rows.flatMap(rowToLiveEvents);
  const cursor = rows.length ? rows[rows.length - 1].id : since;
  return { events, cursor };
}
