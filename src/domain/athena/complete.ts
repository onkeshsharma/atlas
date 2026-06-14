/**
 * Resolve Athena's LLM seam (ADR-0006 §4).
 *
 * `ATLAS_ATHENA_FAKE=1` → a deterministic stub so suites / e2e never spend real
 * tokens (the engine's fake-only test wall extends to the delegate). Otherwise
 * the real Sonnet 4.6 adapter.
 */
import { createAnthropicAthenaComplete } from "./anthropic";
import type { AthenaComplete } from "./types";

export function athenaComplete(): AthenaComplete {
  if (process.env.ATLAS_ATHENA_FAKE === "1") return fakeAthenaComplete();
  return createAnthropicAthenaComplete();
}

/**
 * Deterministic delegate for tests: picks the first offered option when the Ask
 * had options, else a generic free-text answer — always high-confidence so the
 * answer path (not the abstain path) is exercised.
 */
export function fakeAthenaComplete(): AthenaComplete {
  return async ({ user }) => {
    const m = user.match(/^Options: (.+)$/m);
    if (m) {
      const first = m[1].split(",")[0].trim().replace(/^"|"$/g, "");
      return JSON.stringify({ choice: first, confidence: 0.95, rationale: "AFK delegate (fake)" });
    }
    return JSON.stringify({ answer: "proceed", confidence: 0.95, rationale: "AFK delegate (fake)" });
  };
}
