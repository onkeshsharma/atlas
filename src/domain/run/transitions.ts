/**
 * M6 — applyRunTransition: flip a Run's state AND append its feed-outbox
 * row in ONE SQL statement.
 *
 * neon-http has no interactive transactions (M5 law) — atomicity comes
 * from a single statement: the UPDATE claims the row conditionally
 * (WHERE state = expected `from`, so concurrent writers lose cleanly)
 * and the CTE INSERT writes the feed_events outbox row from the updated
 * row. Either both happen or neither; the live seam can't observe a
 * half-applied transition (docs/adr/0001-live-transport.md).
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";

import { transitionFeedKind } from "../feed/kinds";
import type { NeedsInputAnswer, NeedsInputQuestion } from "./needs-input";
import { transition, type RunState } from "./states";

export type ApplyTransitionInput = {
  runId: string;
  /** the state we believe the run is in — the conditional claim. */
  from: RunState;
  to: RunState;
  /** display actor for the feed row — "Engine", "you". */
  actor: string;
  /** required when to === "needs-input". */
  question?: NeedsInputQuestion;
  /** required when answering (from === "needs-input" && to === "running"). */
  answer?: NeedsInputAnswer;
};

export type ApplyTransitionResult =
  | { ok: true; feedEventId: number }
  | { ok: false; reason: "illegal-transition" | "missing-payload" | "not-claimed" };

export async function applyRunTransition(
  input: ApplyTransitionInput,
): Promise<ApplyTransitionResult> {
  const check = transition(input.from, input.to);
  if (!check.ok) return { ok: false, reason: "illegal-transition" };
  if (input.to === "needs-input" && !input.question) {
    return { ok: false, reason: "missing-payload" };
  }
  const answering = input.from === "needs-input" && input.to === "running";
  if (answering && !input.answer) return { ok: false, reason: "missing-payload" };

  const kind = transitionFeedKind(input.from, input.to);
  const payload = {
    from: input.from,
    to: input.to,
    ...(input.question ? { question: input.question } : {}),
    ...(input.answer ? { answer: input.answer } : {}),
  };
  const questionJson = input.question ? JSON.stringify(input.question) : null;
  const answerJson = input.answer ? JSON.stringify(input.answer) : null;

  const result = await db.execute(sql`
    with updated as (
      update runs
      set state = ${input.to},
          question = coalesce(${questionJson}::jsonb, question),
          answer = coalesce(${answerJson}::jsonb, answer),
          updated_at = now()
      where id = ${input.runId} and state = ${input.from}
      returning id, ref, project_id, ticket_id, title
    )
    insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, payload, seeded)
    select
      ${kind},
      ${input.actor},
      updated.ref || ' — ' || updated.title,
      updated.project_id,
      updated.ticket_id,
      updated.id,
      (select t.ref from tickets t where t.id = updated.ticket_id),
      ${JSON.stringify(payload)}::jsonb,
      false
    from updated
    returning id
  `);

  const rows = result.rows as Array<{ id: number | string }>;
  if (!rows.length) return { ok: false, reason: "not-claimed" };
  return { ok: true, feedEventId: Number(rows[0].id) };
}
