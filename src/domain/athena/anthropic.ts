/**
 * Athena's LLM seam — the real `complete` (ADR-0006 §4). A single Sonnet 4.6
 * call (the second-opinion delegate; Owner-chosen model) returning the model's
 * raw text for `decide.ts` to parse. Runs server-side in Atlas (Node runtime).
 *
 * Kept separate from decide.ts so the decision logic stays pure + unit-tested
 * and this thin adapter carries the only network dependency.
 */
import Anthropic from "@anthropic-ai/sdk";

import type { AthenaComplete } from "./types";

/** Owner-chosen model (claude-api skill, 2026-06-15). Bare id — no date suffix. */
export const ATHENA_MODEL = "claude-sonnet-4-6";

export function createAnthropicAthenaComplete(opts: {
  apiKey?: string;
  maxTokens?: number;
} = {}): AthenaComplete {
  // ATHENA_API_KEY lets Athena use a separate key/budget; falls back to the
  // SDK's default ANTHROPIC_API_KEY resolution.
  const apiKey = opts.apiKey ?? process.env.ATHENA_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  const client = new Anthropic(apiKey ? { apiKey } : {});
  const maxTokens = opts.maxTokens ?? 1024;

  return async ({ system, user }) => {
    const res = await client.messages.create({
      model: ATHENA_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  };
}
