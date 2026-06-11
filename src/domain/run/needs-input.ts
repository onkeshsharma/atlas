/**
 * M6 — Needs-Input payload shapes (charter §2).
 *
 * The Engine blocks on either a free-form question or a permission
 * prompt with options (CONTEXT.md "Needs Input"). The payloads live in
 * `runs.question` / `runs.answer` jsonb and travel the live seam, so
 * both sides parse through these validators — never trust raw jsonb.
 *
 * The answer executor (Atlas → Bridge → Engine) is M9's; the shapes are
 * fixed here so M9 plugs in without protocol changes.
 */

export type NeedsInputQuestion = {
  /** "question" = free-form; "permission" = pick-an-option prompt. */
  kind: "question" | "permission";
  /** the Engine's prompt, verbatim. */
  prompt: string;
  /** permission prompts enumerate their choices. */
  options?: string[];
  /** optional context line (file path, command, etc.). */
  context?: string;
  /** ISO timestamp the Engine raised it. */
  raisedAt: string;
};

export type NeedsInputAnswer = {
  /** free-form reply (question kind) — at least one of text/choice present. */
  text?: string;
  /** chosen option (permission kind). */
  choice?: string;
  /** display name of who answered — the Owner. */
  answeredBy: string;
  /** ISO timestamp. */
  answeredAt: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Parse jsonb into a NeedsInputQuestion; null when malformed. */
export function parseNeedsInputQuestion(value: unknown): NeedsInputQuestion | null {
  if (!isRecord(value)) return null;
  if (value.kind !== "question" && value.kind !== "permission") return null;
  if (typeof value.prompt !== "string" || value.prompt.length === 0) return null;
  if (typeof value.raisedAt !== "string") return null;
  if (
    value.options !== undefined &&
    (!Array.isArray(value.options) || value.options.some((o) => typeof o !== "string"))
  ) {
    return null;
  }
  if (value.context !== undefined && typeof value.context !== "string") return null;
  return {
    kind: value.kind,
    prompt: value.prompt,
    options: value.options as string[] | undefined,
    context: value.context as string | undefined,
    raisedAt: value.raisedAt,
  };
}

/** Parse jsonb into a NeedsInputAnswer; null when malformed. */
export function parseNeedsInputAnswer(value: unknown): NeedsInputAnswer | null {
  if (!isRecord(value)) return null;
  if (typeof value.answeredBy !== "string" || value.answeredBy.length === 0) return null;
  if (typeof value.answeredAt !== "string") return null;
  const text = value.text;
  const choice = value.choice;
  if (text !== undefined && typeof text !== "string") return null;
  if (choice !== undefined && typeof choice !== "string") return null;
  if (text === undefined && choice === undefined) return null;
  return {
    text: text as string | undefined,
    choice: choice as string | undefined,
    answeredBy: value.answeredBy,
    answeredAt: value.answeredAt,
  };
}
