/**
 * Athena's decision logic (ADR-0006 §4) — pure and LLM-injected, so it
 * unit-tests without a network call. The Anthropic adapter supplies `complete`.
 *
 * Conservative by design: Athena answers only when confident, prefers the safe /
 * reversible option, and ABSTAINS on risky, irreversible, or genuinely ambiguous
 * decisions so they escalate to the Owner. A wrong autonomous answer on an
 * irreversible call is the failure mode we refuse to risk.
 */
import type { AthenaAsk, AthenaComplete, AthenaContext, AthenaVerdict } from "./types";

/** below this, Athena abstains and the Ask goes (back) to the Owner. */
export const ATHENA_MIN_CONFIDENCE = 0.6;

const SYSTEM = [
  "You are Athena, the trusted decision delegate for the Owner of Atlas (an engineering",
  "orchestration cockpit). While the Owner is away (AFK), an AI engineering Run has paused",
  "to ask a question. Answer ON THE OWNER'S BEHALF, exactly as a careful senior engineer",
  "who knows this project would — but only when you are genuinely confident.",
  "",
  "Principles:",
  "- Prefer the safe, reversible, convention-following option.",
  "- If the decision is destructive, irreversible, high-stakes, or genuinely ambiguous,",
  '  mark "stakes": "high" AND set a LOW confidence so it escalates to the human.',
  "  Abstaining is correct, not a failure.",
  "- If options were given, your choice MUST be exactly one of them.",
  "",
  'Respond with ONLY a JSON object: {"choice": <one of the options, or null>,',
  '"answer": <free-text answer when no options, else null>, "confidence": <0..1>,',
  '"stakes": "low" | "high" (high = destructive / irreversible / high-stakes),',
  '"rationale": <one or two sentences>}. No prose outside the JSON.',
].join("\n");

export function buildAthenaPrompt(ask: AthenaAsk, context: AthenaContext): {
  system: string;
  user: string;
} {
  const lines: string[] = [];
  lines.push(`Project: ${context.projectName}`);
  lines.push(`Run: ${context.runRef}`);
  if (context.ticketTitle) lines.push(`Ticket: ${context.ticketTitle}`);
  if (context.ticketBody) lines.push(`Ticket detail:\n${context.ticketBody}`);
  if (context.brief) lines.push(`Brief:\n${context.brief}`);
  if (context.diffSummary) lines.push(`Diff so far: ${context.diffSummary}`);
  if (context.recentTranscript) lines.push(`Recent transcript (tail):\n${context.recentTranscript}`);
  if (context.priorDecisions?.length) {
    // ADR-0007 §7 — the Owner's precedents on similar past Asks. Follow them
    // unless this Ask genuinely differs; Owner precedents carry the most weight.
    lines.push("");
    lines.push("Similar past decisions (precedent — follow them unless this Ask differs):");
    for (const p of context.priorDecisions) {
      const who = p.source === "owner" ? "Owner" : "Athena";
      const why = p.rationale ? ` (${p.rationale})` : "";
      lines.push(`- [${who}] Asked "${p.question}" → answered "${p.answer}"${why}`);
    }
  }
  lines.push("");
  lines.push(`The Run asks: ${ask.question}`);
  if (ask.options?.length) lines.push(`Options: ${ask.options.map((o) => `"${o}"`).join(", ")}`);
  return { system: SYSTEM, user: lines.join("\n") };
}

type ParsedAthena = {
  choice?: string;
  text?: string;
  confidence: number;
  rationale: string;
  stakes?: "low" | "high";
};

/**
 * Extract Athena's JSON verdict from raw model text. Tolerant of code fences or
 * surrounding prose: finds the first balanced top-level `{...}` and parses it.
 */
export function parseAthenaResponse(raw: string): ParsedAthena | null {
  const json = extractFirstJsonObject(raw);
  if (!json) return null;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (typeof obj.confidence !== "number" || Number.isNaN(obj.confidence)) return null;
  const confidence = Math.min(1, Math.max(0, obj.confidence));
  const rationale = typeof obj.rationale === "string" ? obj.rationale : "";
  const choice =
    typeof obj.choice === "string" && obj.choice.length > 0 ? obj.choice : undefined;
  const text = typeof obj.answer === "string" && obj.answer.length > 0 ? obj.answer : undefined;
  if (choice === undefined && text === undefined) return null;
  const stakes = obj.stakes === "high" ? "high" : obj.stakes === "low" ? "low" : undefined;
  return { choice, text, confidence, rationale, ...(stakes ? { stakes } : {}) };
}

function extractFirstJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

export async function decideWithAthena(input: {
  ask: AthenaAsk;
  context: AthenaContext;
  complete: AthenaComplete;
  minConfidence?: number;
  /** ADR-0007 §4 — Ultra Athena lifts the high-stakes/human-only rail. */
  ultra?: boolean;
}): Promise<AthenaVerdict> {
  const prompt = buildAthenaPrompt(input.ask, input.context);
  let raw: string;
  try {
    raw = await input.complete(prompt);
  } catch (err) {
    return {
      answered: false,
      reason: "abstained",
      confidence: 0,
      rationale: `Athena call failed: ${String(err)}`,
    };
  }
  return gateAthenaVerdict(raw, {
    ask: input.ask,
    ...(input.ultra ? { ultra: true } : {}),
    ...(input.minConfidence !== undefined ? { minConfidence: input.minConfidence } : {}),
  });
}

/**
 * Gate a raw model verdict into an AthenaVerdict: parse → option check →
 * high-stakes rail (ADR-0007 §4) → confidence threshold. The single decision
 * brain shared by the cloud path (decideWithAthena) and the bridge consult
 * (the consult-result route hands the raw text straight here — Phase 2).
 */
export function gateAthenaVerdict(
  raw: string,
  input: { ask: AthenaAsk; ultra?: boolean; minConfidence?: number },
): AthenaVerdict {
  const minConfidence = input.minConfidence ?? ATHENA_MIN_CONFIDENCE;
  const parsed = parseAthenaResponse(raw);
  if (!parsed) {
    return {
      answered: false,
      reason: "unparseable",
      confidence: 0,
      rationale: "Athena returned no parseable verdict",
    };
  }

  // a choice must be one of the offered options — otherwise abstain (don't guess).
  if (input.ask.options?.length && parsed.choice && !input.ask.options.includes(parsed.choice)) {
    return {
      answered: false,
      reason: "abstained",
      confidence: parsed.confidence,
      rationale: `Proposed "${parsed.choice}", not among the offered options`,
    };
  }

  // safety rail: human-only (Engine-flagged) or self-judged high-stakes escalates
  // to the Owner regardless of confidence — UNLESS Ultra Athena lifts the rail.
  if (!input.ultra && (input.ask.humanOnly || parsed.stakes === "high")) {
    return {
      answered: false,
      reason: "high-stakes",
      confidence: parsed.confidence,
      rationale:
        parsed.rationale ||
        (input.ask.humanOnly ? "flagged human-only by the Engine" : "high-stakes decision"),
    };
  }

  if (parsed.confidence < minConfidence) {
    return {
      answered: false,
      reason: "low-confidence",
      confidence: parsed.confidence,
      rationale: parsed.rationale || "below confidence threshold",
    };
  }

  return {
    answered: true,
    ...(parsed.choice ? { choice: parsed.choice } : {}),
    ...(parsed.text ? { text: parsed.text } : {}),
    confidence: parsed.confidence,
    rationale: parsed.rationale,
  };
}
