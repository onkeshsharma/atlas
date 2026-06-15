/**
 * The Council (ADR-0007 §5) — Athena's top consult rung. N delegates reason with
 * DISTINCT lenses over the same model, then vote: the Council answers on a
 * majority (≥⌈N/2⌉+... actually ⌊N/2⌋+1), and escalates to the Owner on a split.
 * Pure + LLM-injected (the `complete` seam), so it unit-tests without network.
 *
 * Convened only when a single consult wasn't confident (cost-bounded) — see the
 * cloud escalation in run-resolver.ts.
 */
import { buildAthenaPrompt, gateAthenaVerdict } from "./decide";
import type { AthenaAsk, AthenaComplete, AthenaContext } from "./types";

/** distinct lenses — perspective diversity catches failure modes redundancy can't. */
export const COUNCIL_LENSES: ReadonlyArray<{ key: string; directive: string }> = [
  {
    key: "cautious",
    directive:
      "the CAUTIOUS REVIEWER — weigh what could go wrong; prefer the safe, reversible option; surface risks the others might miss.",
  },
  {
    key: "pragmatist",
    directive:
      "the SHIP-IT PRAGMATIST — prefer the option that unblocks the Run with the least fuss, without ignoring genuine risk.",
  },
  {
    key: "correctness",
    directive:
      "the CORRECTNESS CHECKER — judge strictly against the Brief, the Ticket, and the code: does this match the stated intent?",
  },
  {
    key: "user-impact",
    directive:
      "the USER-IMPACT JUDGE — reason from what the Owner and end-users actually need from this Run.",
  },
  {
    key: "skeptic",
    directive:
      "the SKEPTIC — actively try to find why the obvious answer is wrong; only agree if it survives scrutiny.",
  },
  {
    key: "domain",
    directive:
      "the DOMAIN EXPERT — apply conventions and best practices for this kind of system to the decision.",
  },
  {
    key: "minimalist",
    directive:
      "the MINIMALIST — prefer the smallest change that correctly resolves the Ask; resist scope creep.",
  },
];

export const DEFAULT_COUNCIL_SIZE = 3;

export type CouncilVerdict =
  | {
      answered: true;
      choice?: string;
      text?: string;
      confidence: number;
      rationale: string;
      votes: number;
      size: number;
    }
  | { answered: false; reason: "no-consensus" | "all-abstained"; size: number; tally: string };

function clampSize(n: number): number {
  const v = Math.max(1, Math.min(COUNCIL_LENSES.length, Math.floor(n)));
  // even sizes can't form a strict majority cleanly; round down to odd.
  return v % 2 === 0 ? v - 1 : v;
}

export async function runCouncil(input: {
  ask: AthenaAsk;
  context: AthenaContext;
  complete: AthenaComplete;
  size?: number;
  ultra?: boolean;
  minConfidence?: number;
}): Promise<CouncilVerdict> {
  const size = clampSize(input.size ?? DEFAULT_COUNCIL_SIZE);
  const lenses = COUNCIL_LENSES.slice(0, size);
  const base = buildAthenaPrompt(input.ask, input.context);
  const gateOpts = {
    ask: input.ask,
    ...(input.ultra ? { ultra: true } : {}),
    ...(input.minConfidence !== undefined ? { minConfidence: input.minConfidence } : {}),
  };

  const verdicts = await Promise.all(
    lenses.map(async (lens) => {
      let raw = "";
      try {
        raw = await input.complete({
          system: `${base.system}\n\nFor this judgement you are ${lens.directive}`,
          user: base.user,
        });
      } catch {
        raw = "";
      }
      return gateAthenaVerdict(raw, gateOpts);
    }),
  );

  const answered = verdicts.filter((v) => v.answered);
  const majority = Math.floor(size / 2) + 1;
  if (answered.length === 0) {
    return { answered: false, reason: "all-abstained", size, tally: `0/${size} answered` };
  }

  // option Asks: tally by choice; free-text: tally by answered-count + best confidence.
  if (input.ask.options?.length) {
    const counts = new Map<string, { votes: number; confSum: number; rationale: string }>();
    for (const v of answered) {
      if (!v.answered || !v.choice) continue;
      const cur = counts.get(v.choice) ?? { votes: 0, confSum: 0, rationale: v.rationale };
      cur.votes += 1;
      cur.confSum += v.confidence;
      counts.set(v.choice, cur);
    }
    let best: { choice: string; votes: number; confSum: number; rationale: string } | null = null;
    for (const [choice, c] of counts) {
      if (!best || c.votes > best.votes) best = { choice, ...c };
    }
    const tally = [...counts.entries()].map(([c, v]) => `${c}:${v.votes}`).join(", ") || "—";
    if (best && best.votes >= majority) {
      return {
        answered: true,
        choice: best.choice,
        confidence: best.confSum / best.votes,
        rationale: `Council majority (${best.votes}/${size}): ${best.rationale}`,
        votes: best.votes,
        size,
      };
    }
    return { answered: false, reason: "no-consensus", size, tally };
  }

  // free-text: consensus = a majority were confident enough to answer; take the
  // highest-confidence answer as the Council's (no exact-string agreement test).
  if (answered.length >= majority) {
    const top = answered.reduce((a, b) => (b.confidence > a.confidence ? b : a));
    if (top.answered) {
      return {
        answered: true,
        ...(top.text ? { text: top.text } : {}),
        ...(top.choice ? { choice: top.choice } : {}),
        confidence: top.confidence,
        rationale: `Council majority (${answered.length}/${size}): ${top.rationale}`,
        votes: answered.length,
        size,
      };
    }
  }
  return { answered: false, reason: "no-consensus", size, tally: `${answered.length}/${size} answered` };
}
