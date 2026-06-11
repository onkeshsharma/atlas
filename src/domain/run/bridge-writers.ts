/**
 * M9 — Bridge-posted Run writers: the sibling single-statement
 * update+outbox writers beside M6's `applyRunTransition` (THE OUTBOX
 * RULE — HANDOFF-M6; pattern: src/domain/run/transitions.ts). Each
 * writer claims the row conditionally (`WHERE state = from`) so stale
 * Bridge posts — an Engine finishing a just-cancelled run, two daemons
 * racing a claim — lose cleanly with `not-claimed`.
 *
 * These exist because the M6 writer doesn't know the M9 execution
 * columns (bridge id, worktree, failure kind, diff stats, question
 * history). The legal-transition table stays the single authority.
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";

import type { RunDiffStats } from "./diff-stats";
import type { FailureKind } from "./failure";
import type { NeedsInputAnswer } from "./needs-input";

type WriterResult = { ok: true; feedEventId: number } | { ok: false; reason: "not-claimed" };

function asResult(rows: unknown[]): WriterResult {
  if (!rows.length) return { ok: false, reason: "not-claimed" };
  return { ok: true, feedEventId: Number((rows[0] as { id: number | string }).id) };
}

/**
 * queued → running, assigning the Bridge + worktree in the same claim
 * (`started` outbox row). Worktree fields are null for runs that need no
 * working copy (fake helpers on repo-less projects).
 */
export async function claimRun(input: {
  runId: string;
  bridgeId: string;
  worktreePath: string | null;
  branch: string | null;
  actor?: string;
}): Promise<WriterResult> {
  const payload = JSON.stringify({ from: "queued", to: "running" });
  const result = await db.execute(sql`
    with updated as (
      update runs
      set state = 'running',
          bridge_id = ${input.bridgeId},
          worktree_path = ${input.worktreePath},
          branch = ${input.branch},
          updated_at = now()
      where id = ${input.runId} and state = 'queued'
      returning id, ref, project_id, ticket_id, title
    )
    insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, payload, seeded)
    select
      'started',
      ${input.actor ?? "Engine"},
      updated.ref || ' — ' || updated.title,
      updated.project_id,
      updated.ticket_id,
      updated.id,
      (select t.ref from tickets t where t.id = updated.ticket_id),
      ${payload}::jsonb,
      false
    from updated
    returning id
  `);
  return asResult(result.rows);
}

/** running → review-ready with the run's real diff stats + patch (`review-ready` outbox row). */
export async function completeRun(input: {
  runId: string;
  diffStats: RunDiffStats | null;
  /** the full unified diff (KK's hunks — migration 0005); capped Bridge-side. */
  diffPatch?: string | null;
  actor?: string;
}): Promise<WriterResult> {
  const payload = JSON.stringify({ from: "running", to: "review-ready" });
  const diffJson = input.diffStats ? JSON.stringify(input.diffStats) : null;
  const result = await db.execute(sql`
    with updated as (
      update runs
      set state = 'review-ready',
          diff_stats = coalesce(${diffJson}::jsonb, diff_stats),
          diff_patch = coalesce(${input.diffPatch ?? null}, diff_patch),
          updated_at = now()
      where id = ${input.runId} and state = 'running'
      returning id, ref, project_id, ticket_id, title
    )
    insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, payload, seeded)
    select
      'review-ready',
      ${input.actor ?? "Engine"},
      updated.ref || ' — ' || updated.title,
      updated.project_id,
      updated.ticket_id,
      updated.id,
      (select t.ref from tickets t where t.id = updated.ticket_id),
      ${payload}::jsonb,
      false
    from updated
    returning id
  `);
  return asResult(result.rows);
}

/**
 * running → failed with the typed failure kind (`failed` outbox row).
 * needs-input orphans can't legally fail (needs-input → running|cancelled
 * only) — the daemon cancels those instead; see notes/M9A-handoff.md.
 */
export async function failRun(input: {
  runId: string;
  failureKind: FailureKind;
  failureDetail?: string;
  actor?: string;
}): Promise<WriterResult> {
  const payload = JSON.stringify({
    from: "running",
    to: "failed",
    failureKind: input.failureKind,
  });
  const result = await db.execute(sql`
    with updated as (
      update runs
      set state = 'failed',
          failure_kind = ${input.failureKind},
          failure_detail = ${input.failureDetail ?? null},
          updated_at = now()
      where id = ${input.runId} and state = 'running'
      returning id, ref, project_id, ticket_id, title
    )
    insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, payload, seeded)
    select
      'failed',
      ${input.actor ?? "Engine"},
      updated.ref || ' — ' || updated.title,
      updated.project_id,
      updated.ticket_id,
      updated.id,
      (select t.ref from tickets t where t.id = updated.ticket_id),
      ${payload}::jsonb,
      false
    from updated
    returning id
  `);
  return asResult(result.rows);
}

/**
 * needs-input → running with the Owner's answer, APPENDING the
 * { question, answer } pair to `question_history` in the same claim
 * (`answered` outbox row → the Bridge resumes the Engine session;
 * ADR-0002 §2). The browser's answer executor calls this.
 */
export async function answerRun(input: {
  runId: string;
  answer: NeedsInputAnswer;
  actor?: string;
}): Promise<WriterResult> {
  const answerJson = JSON.stringify(input.answer);
  const payload = JSON.stringify({ from: "needs-input", to: "running", answer: input.answer });
  const result = await db.execute(sql`
    with updated as (
      update runs
      set state = 'running',
          answer = ${answerJson}::jsonb,
          question_history = coalesce(question_history, '[]'::jsonb)
            || jsonb_build_array(jsonb_build_object('question', question, 'answer', ${answerJson}::jsonb)),
          updated_at = now()
      where id = ${input.runId} and state = 'needs-input'
      returning id, ref, project_id, ticket_id, title
    )
    insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, payload, seeded)
    select
      'answered',
      ${input.actor ?? "you"},
      updated.ref || ' — ' || updated.title,
      updated.project_id,
      updated.ticket_id,
      updated.id,
      (select t.ref from tickets t where t.id = updated.ticket_id),
      ${payload}::jsonb,
      false
    from updated
    returning id
  `);
  return asResult(result.rows);
}

/**
 * The Owner's approve-and-ship click (KK's emerald CTA — PRD #25;
 * Session B). The run STAYS review-ready: shipping is the daemon's job
 * (commit/merge from the kept worktree), and the row only flips when the
 * code actually lands (shipRun) or honestly fails (shipFailRun). The
 * `ship-requested` outbox row IS the daemon's `run-ship` command
 * (src/domain/bridge/events.ts); ship_requested_at makes the request
 * durable across daemon downtime (sync carries pending ids — ADR-0002
 * §2: catch-up is DB state). The IS NULL claim makes double-clicks
 * no-ops.
 */
export async function requestShipRun(input: {
  runId: string;
  actor?: string;
}): Promise<WriterResult> {
  const payload = JSON.stringify({ shipRequested: true });
  const result = await db.execute(sql`
    with updated as (
      update runs
      set ship_requested_at = now(),
          updated_at = now()
      where id = ${input.runId} and state = 'review-ready' and ship_requested_at is null
      returning id, ref, project_id, ticket_id, title
    )
    insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, payload, seeded)
    select
      'ship-requested',
      ${input.actor ?? "you"},
      updated.ref || ' — ' || updated.title,
      updated.project_id,
      updated.ticket_id,
      updated.id,
      (select t.ref from tickets t where t.id = updated.ticket_id),
      ${payload}::jsonb,
      false
    from updated
    returning id
  `);
  return asResult(result.rows);
}

/**
 * review-ready → shipped with the landing's refs (`shipped` outbox row,
 * PRD #27). Posted by the daemon's ship executor after the merge is
 * real; pr_url stays null on the local-merge path (no remote).
 */
export async function shipRun(input: {
  runId: string;
  prUrl?: string | null;
  mergeSha?: string | null;
  actor?: string;
}): Promise<WriterResult> {
  const payload = JSON.stringify({ from: "review-ready", to: "shipped" });
  const result = await db.execute(sql`
    with updated as (
      update runs
      set state = 'shipped',
          pr_url = ${input.prUrl ?? null},
          merge_sha = ${input.mergeSha ?? null},
          updated_at = now()
      where id = ${input.runId} and state = 'review-ready'
      returning id, ref, project_id, ticket_id, title
    )
    insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, payload, seeded)
    select
      'shipped',
      ${input.actor ?? "Engine"},
      updated.ref || ' — ' || updated.title,
      updated.project_id,
      updated.ticket_id,
      updated.id,
      (select t.ref from tickets t where t.id = updated.ticket_id),
      ${payload}::jsonb,
      false
    from updated
    returning id
  `);
  return asResult(result.rows);
}

/**
 * review-ready → failed: the SHIP failed (conflict / not-mergeable /
 * gh-cli-error / no-changes — KK honesty; PRD #22–23 feed K's framing).
 * Keeps pr_url when the gh path got as far as opening one (K:307's
 * "PR ↗" stays real on a failed run).
 */
export async function shipFailRun(input: {
  runId: string;
  failureKind: FailureKind;
  failureDetail?: string;
  prUrl?: string | null;
  actor?: string;
}): Promise<WriterResult> {
  const payload = JSON.stringify({
    from: "review-ready",
    to: "failed",
    failureKind: input.failureKind,
  });
  const result = await db.execute(sql`
    with updated as (
      update runs
      set state = 'failed',
          failure_kind = ${input.failureKind},
          failure_detail = ${input.failureDetail ?? null},
          pr_url = coalesce(${input.prUrl ?? null}, pr_url),
          updated_at = now()
      where id = ${input.runId} and state = 'review-ready'
      returning id, ref, project_id, ticket_id, title
    )
    insert into feed_events (kind, actor, summary, project_id, ticket_id, run_id, ticket_ref, payload, seeded)
    select
      'failed',
      ${input.actor ?? "Engine"},
      updated.ref || ' — ' || updated.title,
      updated.project_id,
      updated.ticket_id,
      updated.id,
      (select t.ref from tickets t where t.id = updated.ticket_id),
      ${payload}::jsonb,
      false
    from updated
    returning id
  `);
  return asResult(result.rows);
}

/**
 * Idempotent stdout-chunk ingest — NOT an outbox writer by design:
 * stdout never rides feed_events (charter hard rule; ADR-0002 §4). The
 * unique (run_id, seq) index makes Bridge retries no-ops.
 */
export async function ingestStdoutChunks(
  runId: string,
  chunks: Array<{ seq: number; content: string }>,
): Promise<{ inserted: number }> {
  if (!chunks.length) return { inserted: 0 };
  let inserted = 0;
  for (const chunk of chunks) {
    const result = await db.execute(sql`
      insert into run_stdout_chunks (run_id, seq, content)
      values (${runId}, ${chunk.seq}, ${chunk.content})
      on conflict (run_id, seq) do nothing
      returning id
    `);
    inserted += result.rows.length;
  }
  return { inserted };
}
