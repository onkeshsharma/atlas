/**
 * Athena's LLM seam — the real `complete` (ADR-0006 §4 / ADR-0007). One call at
 * the highest model + `xhigh` effort (the grill ruling: decisions are rare and
 * costly to get wrong, so spend on quality). Runs server-side in Atlas (Node).
 *
 * The API key resolves per call: in-app encrypted key (ADR-0007 §3) → explicit
 * opt → `ATHENA_API_KEY` → `ANTHROPIC_API_KEY`. Resolved at call time (not at
 * construction) so a key set in Settings takes effect with no redeploy.
 */
import Anthropic from "@anthropic-ai/sdk";

import { athenaApiKey } from "../settings/instance";
import type { AthenaComplete } from "./types";

/** highest available model (grill ruling); xhigh = second-highest thinking. */
export const ATHENA_MODEL = "claude-opus-4-8";

export function createAnthropicAthenaComplete(opts: {
  apiKey?: string;
  maxTokens?: number;
} = {}): AthenaComplete {
  const maxTokens = opts.maxTokens ?? 4096;

  return async ({ system, user }) => {
    const key =
      opts.apiKey ??
      (await athenaApiKey()) ??
      process.env.ATHENA_API_KEY ??
      process.env.ANTHROPIC_API_KEY;
    const client = new Anthropic(key ? { apiKey: key } : {});

    const res = await client.messages.create({
      model: ATHENA_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
      thinking: { type: "adaptive" },
      output_config: { effort: "xhigh" },
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  };
}
