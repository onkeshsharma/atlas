/**
 * M9 — the live-command executors (browser → Atlas → Bridge → Engine).
 *
 * M6 reserved the vocabulary (./commands.ts); this makes it real.
 * Steering writes Atlas-first (ADR-0002 §2): each executor flips the run
 * row through a single-statement outbox writer, the browser sees it via
 * ADR-0001's stream, and the SAME outbox row reaches the daemon as its
 * command (run-cancelled / run-answered). Late Engine posts lose cleanly
 * on the conditional claims. v2.0 steering is exactly these two verbs
 * (PRD: watch + cancel + answer-when-asked).
 */
import { eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import { runs } from "@/src/db/schema";

import { recordDecision } from "../athena/memory";
import { answerRun } from "../run/bridge-writers";
import { parseNeedsInputQuestion } from "../run/needs-input";
import { ACTIVE_STATES } from "../run/states";
import { applyRunTransition } from "../run/transitions";
import { applyTicketTransition } from "../ticket/mutations";
import type { LiveCommand } from "./commands";

export type ExecuteResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "not-active" | "not-claimed" | "missing-payload" };

export async function executeLiveCommand(
  command: LiveCommand,
  actor: string,
): Promise<ExecuteResult> {
  const [run] = await db
    .select({
      id: runs.id,
      state: runs.state,
      ticketId: runs.ticketId,
      lane: runs.lane,
      projectId: runs.projectId,
      question: runs.question,
    })
    .from(runs)
    .where(eq(runs.id, command.runId))
    .limit(1);
  if (!run) return { ok: false, reason: "not-found" };

  switch (command.type) {
    case "cancel-run": {
      if (!(ACTIVE_STATES as readonly string[]).includes(run.state)) {
        return { ok: false, reason: "not-active" };
      }
      const flipped = await applyRunTransition({
        runId: run.id,
        from: run.state,
        to: "cancelled",
        actor,
      });
      if (!flipped.ok) return { ok: false, reason: "not-claimed" };
      // ticket follow-up: a cancelled Run hands the Ticket back to
      // approved (still ready, nothing landed — ticket-transitions doc).
      // Its own atomic statement; a lost race here means someone else
      // already moved the ticket, which is fine.
      if (run.ticketId && run.lane === "owner") {
        await applyTicketTransition({
          ticketId: run.ticketId,
          from: "in-progress",
          to: "approved",
          actor,
          note: "Run cancelled",
        });
      }
      return { ok: true };
    }
    case "answer-run": {
      if (run.state !== "needs-input") return { ok: false, reason: "not-active" };
      const answered = await answerRun({
        runId: run.id,
        answer: command.answer,
        actor,
      });
      if (!answered.ok) return { ok: false, reason: "not-claimed" };
      // ADR-0007 §7 — learn from the Owner's decision (weighted highest at
      // retrieval). Best-effort: a memory write must never fail the answer.
      const q = parseNeedsInputQuestion(run.question);
      if (q) {
        await recordDecision({
          runId: run.id,
          projectId: run.projectId,
          question: q.prompt,
          options: q.options ?? null,
          choice: command.answer.choice ?? null,
          text: command.answer.text ?? null,
          source: "owner",
          confidence: command.answer.confidence ?? null,
          rationale: command.answer.rationale ?? null,
        }).catch(() => {});
      }
      return { ok: true };
    }
  }
}
