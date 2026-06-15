/**
 * AFK routing (ADR-0006 §4) — turns a Run's pending Ask into either an
 * Athena-authored answer or an escalation back to the Owner.
 *
 * Policy:
 *   - mark the Run Athena-attempted FIRST (one shot per Ask — never re-attempt
 *     on the next heartbeat sweep, whether Athena answers or abstains),
 *   - ask Athena (decide.ts); if she answers, write it through the EXISTING
 *     answerRun path with actor "Athena" + answer.answeredBy "Athena" (that IS
 *     the delegate-answered audit — no new feed kind),
 *   - if she abstains, leave the Run in needs-input for the Owner.
 *
 * Triggered two ways (wired separately): immediately when a needs-input lands
 * under AFK Mode, and as the unanswered-Ask fallback after the timeout.
 * Dependencies are injected so this orchestration is unit-tested without DB/LLM.
 */
import { decideWithAthena } from "./decide";
import type { AthenaAsk, AthenaComplete, AthenaContext } from "./types";

const ATHENA_ACTOR = "Athena";

export type AthenaAnswer = {
  text?: string;
  choice?: string;
  answeredBy: string;
  answeredAt: string;
  /** ADR-0007 — Athena's reasoning + confidence, recorded for the audit. */
  rationale?: string;
  confidence?: number;
};

export type AthenaResolveDeps = {
  /** load the Run's pending Ask + curated context, or null if it isn't waiting. */
  loadAsk: (runId: string) => Promise<{ ask: AthenaAsk; context: AthenaContext } | null>;
  /** the LLM seam (anthropic.ts in prod). */
  complete: AthenaComplete;
  /** answerRun(...) — needs-input → running with the answer; false if the run moved. */
  answer: (runId: string, answer: AthenaAnswer) => Promise<boolean>;
  /** stamp athena_attempted_at so the fallback sweep won't re-try this Ask. */
  markAttempted: (runId: string) => Promise<void>;
  /** injected clock (server-side Date in prod). */
  now?: () => string;
  /**
   * ADR-0007 §7 — record this resolution into Athena's decision memory (source
   * "athena"), so future consults retrieve it as precedent. Best-effort.
   */
  remember?: (decision: {
    ask: AthenaAsk;
    choice?: string;
    text?: string;
    confidence: number;
    rationale?: string;
  }) => Promise<void>;
  minConfidence?: number;
  /** ADR-0007 §4 — Ultra Athena: lift the high-stakes/human-only rail. */
  ultra?: boolean;
  /**
   * ADR-0007 §5 — the Council: convened when a single consult wasn't confident
   * (not on the high-stakes rail). Majority answers; a split returns unanswered.
   */
  council?: (
    ask: AthenaAsk,
    context: AthenaContext,
  ) => Promise<
    | { answered: true; choice?: string; text?: string; confidence: number; rationale: string }
    | { answered: false }
  >;
  /**
   * ADR-0007 §7 — the budget governor: false when the daily expensive-rung cap
   * is spent. The Council is gated on it; on cap Athena fails safe to the Owner.
   */
  budgetOk?: () => Promise<boolean>;
};

export type AthenaResolveOutcome =
  | { status: "answered"; confidence: number }
  | { status: "escalated"; reason: string; confidence: number }
  | { status: "skipped"; reason: "no-pending-ask" | "run-moved" };

export async function resolveRunWithAthena(
  runId: string,
  deps: AthenaResolveDeps,
): Promise<AthenaResolveOutcome> {
  const loaded = await deps.loadAsk(runId);
  if (!loaded) return { status: "skipped", reason: "no-pending-ask" };

  // one shot: claim the attempt before deciding so a concurrent sweep + the
  // immediate AFK trigger can't both answer the same Ask.
  await deps.markAttempted(runId);

  let verdict = await decideWithAthena({
    ask: loaded.ask,
    context: loaded.context,
    complete: deps.complete,
    ...(deps.minConfidence !== undefined ? { minConfidence: deps.minConfidence } : {}),
    ...(deps.ultra ? { ultra: true } : {}),
  });

  // ADR-0007 §5 — a single consult that wasn't confident escalates to the
  // Council (NOT high-stakes, which is the Owner's rail). Majority answers; a
  // split leaves the verdict unanswered → Owner.
  if (!verdict.answered && verdict.reason !== "high-stakes" && deps.council) {
    // ADR-0007 §7 — gate the expensive rung on the budget; on cap, fail safe to
    // the Owner rather than convene the Council (never silent overspend).
    if (deps.budgetOk && !(await deps.budgetOk())) {
      return { status: "escalated", reason: "budget", confidence: verdict.confidence };
    }
    const cv = await deps.council(loaded.ask, loaded.context);
    if (cv.answered) {
      verdict = {
        answered: true,
        ...(cv.choice ? { choice: cv.choice } : {}),
        ...(cv.text ? { text: cv.text } : {}),
        confidence: cv.confidence,
        rationale: cv.rationale,
      };
    }
  }

  if (!verdict.answered) {
    // abstain → the Ask stays in needs-input for the Owner (audited as attempted).
    return { status: "escalated", reason: verdict.reason, confidence: verdict.confidence };
  }

  const now = deps.now ?? (() => new Date().toISOString());
  const applied = await deps.answer(runId, {
    ...(verdict.choice ? { choice: verdict.choice } : {}),
    ...(verdict.text ? { text: verdict.text } : {}),
    answeredBy: ATHENA_ACTOR,
    answeredAt: now(),
    ...(verdict.rationale ? { rationale: verdict.rationale } : {}),
    confidence: verdict.confidence,
  });

  if (applied && deps.remember) {
    // ADR-0007 §7 — learn from this answer (best-effort; never fail the resolve).
    await deps
      .remember({
        ask: loaded.ask,
        ...(verdict.choice ? { choice: verdict.choice } : {}),
        ...(verdict.text ? { text: verdict.text } : {}),
        confidence: verdict.confidence,
        ...(verdict.rationale ? { rationale: verdict.rationale } : {}),
      })
      .catch(() => {});
  }

  return applied
    ? { status: "answered", confidence: verdict.confidence }
    : { status: "skipped", reason: "run-moved" };
}
