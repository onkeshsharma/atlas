/**
 * M9 Session B — send-back-to-Engine (PRD #22–23 + KK:281).
 *
 * Two entry shapes, one verb:
 *
 *  - K's Conflict recovery: the run failed AT SHIP (kind `conflict` —
 *    review-ready → failed), the ticket followed to failed. One click
 *    re-Briefs with the conflict context and re-dispatches: ticket
 *    failed → approved → in-progress (failed → in-progress is not a
 *    legal move — the two transitions read honestly in Activity).
 *  - KK's "send back": the Owner declines a review-ready result. The
 *    old run cancels (nothing rests at review-ready that isn't waiting
 *    on the Owner), the ticket takes the legal review-ready →
 *    in-progress edge via redispatchTicket.
 *
 * Re-Brief shape (decision recorded in HANDOFF-M9): a NEW brief row,
 * source `owner` (the Owner's click authored it), body = the executed
 * Brief verbatim + an appendix section telling the Engine why it's
 * running again. The fake Engine re-reads its @fake: directives from
 * the quoted body, so e2e conflict stories replay for real.
 */
import { eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import { runs, tickets } from "@/src/db/schema";

import { applyRunTransition } from "../run/transitions";
import { parseRunDiffStats } from "../run/diff-stats";
import { applyTicketTransition } from "../ticket/mutations";
import { latestBriefForTicket } from "./queries";
import { dispatchTicket, redispatchTicket } from "./mutations";
import { insertDraftBrief } from "./helper-results";

export type SendBackResult =
  | { ok: true; runRef: string }
  | {
      ok: false;
      reason: "not-found" | "not-sendable" | "no-brief" | "raced";
    };

function conflictAppendix(run: {
  failureDetail: string | null;
  diffStats: unknown;
}): string {
  const files = parseRunDiffStats(run.diffStats)?.files.map((f) => f.path) ?? [];
  return [
    "",
    "## Conflict context (appended by Atlas)",
    "",
    "The previous run's merge conflicted — the base branch moved while it worked.",
    run.failureDetail ? `Git said: ${run.failureDetail}` : "",
    files.length ? `The previous run touched: ${files.join(", ")}` : "",
    "Read the current code fresh and re-apply the change against it.",
  ]
    .filter((line, i) => line !== "" || i < 4)
    .join("\n");
}

const REVIEW_APPENDIX = [
  "",
  "## Another pass (appended by Atlas)",
  "",
  "The Owner sent the previous result back. Re-read the Brief and try again.",
].join("\n");

export async function sendBackToEngine(input: {
  runId: string;
  actor: string;
}): Promise<SendBackResult> {
  const [run] = await db
    .select({
      id: runs.id,
      state: runs.state,
      lane: runs.lane,
      ticketId: runs.ticketId,
      briefId: runs.briefId,
      failureKind: runs.failureKind,
      failureDetail: runs.failureDetail,
      diffStats: runs.diffStats,
    })
    .from(runs)
    .where(eq(runs.id, input.runId))
    .limit(1);
  if (!run || !run.ticketId || run.lane !== "owner") {
    return { ok: false, reason: "not-found" };
  }

  const conflictCase = run.state === "failed" && run.failureKind === "conflict";
  const reviewCase = run.state === "review-ready";
  if (!conflictCase && !reviewCase) return { ok: false, reason: "not-sendable" };

  const [ticket] = await db
    .select({ id: tickets.id, state: tickets.state })
    .from(tickets)
    .where(eq(tickets.id, run.ticketId))
    .limit(1);
  if (!ticket) return { ok: false, reason: "not-found" };

  // the Brief the failed/declined run executed — verbatim base for the re-Brief.
  const executed = await latestBriefForTicket(ticket.id);
  if (!executed) return { ok: false, reason: "no-brief" };
  const appendix = conflictCase ? conflictAppendix(run) : REVIEW_APPENDIX;
  // idempotence: clicking twice must not stack appendices.
  const body = executed.body.includes("(appended by Atlas)")
    ? executed.body
    : `${executed.body.trimEnd()}\n${appendix}\n`;
  const reBrief = await insertDraftBrief({
    ticketId: ticket.id,
    body,
    source: "owner",
    actor: input.actor,
  });
  if (!reBrief.ok) return { ok: false, reason: "no-brief" };

  if (reviewCase) {
    // the declined result leaves the stage first (worktree pruned by the
    // daemon's run-cancelled cleanup) …
    const cancelled = await applyRunTransition({
      runId: run.id,
      from: "review-ready",
      to: "cancelled",
      actor: input.actor,
    });
    if (!cancelled.ok) return { ok: false, reason: "raced" };
    // … then the legal review-ready → in-progress edge with the new run.
    const redispatched = await redispatchTicket({
      ticketId: ticket.id,
      briefId: reBrief.briefId,
      actor: input.actor,
    });
    if (!redispatched.ok) return { ok: false, reason: "raced" };
    return { ok: true, runRef: redispatched.ref };
  }

  // conflict case — ticket failed → approved → in-progress.
  if (ticket.state === "failed") {
    const reopened = await applyTicketTransition({
      ticketId: ticket.id,
      from: "failed",
      to: "approved",
      actor: input.actor,
      note: "Sent back to the Engine after the conflict",
    });
    if (!reopened.ok) return { ok: false, reason: "raced" };
  } else if (ticket.state !== "approved") {
    return { ok: false, reason: "raced" };
  }
  const dispatched = await dispatchTicket({
    ticketId: ticket.id,
    briefId: reBrief.briefId,
    actor: input.actor,
  });
  if (!dispatched.ok) return { ok: false, reason: "raced" };
  return { ok: true, runRef: dispatched.ref };
}
