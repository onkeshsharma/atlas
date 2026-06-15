/**
 * Athena — the AFK decision delegate (ADR-0006 §4). A second-opinion call that
 * answers a Run's Ask on the Owner's behalf under AFK Mode (or as the
 * unanswered-Ask fallback). Atlas-side: it has the AFK toggle + all the Ask
 * context, and its answer returns through the existing run-answered path.
 *
 * This file is the shape contract. `decide.ts` owns the (LLM-injected) decision
 * logic; the Anthropic adapter + the AFK routing wire it to real Runs.
 */

/** the decision put to Athena (mirrors the engine's ask_owner args). */
export type AthenaAsk = {
  question: string;
  /** discrete choices, when the Ask offered them. */
  options?: string[];
  /**
   * ADR-0007 §4 — the Engine flagged this Ask high-stakes/irreversible
   * (human-only). Athena must escalate it to the Owner unless under Ultra.
   */
  humanOnly?: boolean;
};

/** curated context Athena reasons over — all sourced from Atlas's DB. */
export type AthenaContext = {
  projectName: string;
  runRef: string;
  ticketTitle?: string;
  ticketBody?: string;
  brief?: string;
  /** tail of the Run's stdout so far. */
  recentTranscript?: string;
  /** human summary of the diff-so-far (e.g. "3 files, +120/-8"). */
  diffSummary?: string;
  /**
   * ADR-0007 §7 — the most similar past decisions (decision memory), injected as
   * precedent. Owner precedents are weighted higher at retrieval (memory.ts).
   */
  priorDecisions?: Array<{
    question: string;
    answer: string;
    source: "owner" | "athena";
    rationale?: string;
  }>;
};

/**
 * Athena's verdict. She EITHER answers (high enough confidence) OR abstains so
 * the Ask escalates back to the Owner — abstention is a feature, not a failure
 * (a wrong autonomous answer on an irreversible call is the thing to avoid).
 */
export type AthenaVerdict =
  | {
      answered: true;
      /** set when the Ask had options; one of them. */
      choice?: string;
      /** set for free-text answers. */
      text?: string;
      confidence: number;
      rationale: string;
    }
  | {
      answered: false;
      reason: "low-confidence" | "abstained" | "unparseable" | "high-stakes";
      confidence: number;
      rationale: string;
    };

/** the injected LLM seam — returns the model's raw text for `decide.ts` to parse. */
export type AthenaComplete = (prompt: { system: string; user: string }) => Promise<string>;
