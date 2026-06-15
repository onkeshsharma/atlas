/**
 * Athena decision memory (ADR-0007 §7) — record every resolved Ask, and retrieve
 * the most similar past decisions to inject as precedent into the next consult.
 *
 * Retrieval is **lexical** (Jaccard over normalized question tokens) — pure,
 * deterministic, and unit-testable, with no embeddings API dependency. The
 * scoring is the seam: swap in vector similarity later without touching callers.
 *
 * Learning policy (the grill ruling): learn from BOTH the Owner's answers and
 * Athena's own un-overridden answers, but weight the Owner's precedents higher
 * (OWNER_WEIGHT) so the corpus tracks the Owner's judgement, not an echo chamber.
 */
import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { athenaMemory } from "@/src/db/schema";

export type MemorySource = "owner" | "athena";

/** a past decision retrieved as precedent for the next consult. */
export type PriorDecision = {
  question: string;
  answer: string;
  source: MemorySource;
  confidence?: number;
  rationale?: string;
};

/** a memory row as surfaced to the activity view (with its id, for pruning). */
export type MemoryEntry = PriorDecision & {
  id: string;
  options?: string[];
  at: Date;
};

/** Owner precedents outrank an equally-similar Athena precedent at retrieval. */
export const OWNER_WEIGHT = 1;
export const ATHENA_WEIGHT = 0.6;
const DEFAULT_K = 3;
const SCAN_LIMIT = 500;

const STOP = new Set([
  "the", "a", "an", "to", "of", "and", "or", "for", "in", "on", "is", "are",
  "should", "we", "i", "do", "be", "this", "that", "it", "with", "as", "if",
  "would", "you", "your", "which", "what", "when", "how", "can", "could",
]);

/** lowercase → split on non-alphanumerics → drop stopwords + 1-char tokens. */
export function normalizeTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length > 1 && !STOP.has(raw)) out.add(raw);
  }
  return out;
}

/** Jaccard similarity of two token sets: |A∩B| / |A∪B| (0 when both empty). */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

type Candidate = PriorDecision & { options?: string[] };

/**
 * Pure ranker: score each candidate by source-weighted lexical similarity to the
 * question, drop zero-overlap ones, return the top K. Exported for unit tests.
 */
export function rankSimilar(
  question: string,
  candidates: Candidate[],
  k = DEFAULT_K,
): PriorDecision[] {
  const q = normalizeTokens(question);
  const scored = candidates
    .map((c) => {
      const sim = jaccard(q, normalizeTokens(c.question));
      const weight = c.source === "owner" ? OWNER_WEIGHT : ATHENA_WEIGHT;
      return { c, score: sim * weight };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  return scored.map(({ c }) => ({
    question: c.question,
    answer: c.answer,
    source: c.source,
    ...(c.confidence !== undefined ? { confidence: c.confidence } : {}),
    ...(c.rationale ? { rationale: c.rationale } : {}),
  }));
}

/** record a resolved Ask into the memory corpus (best-effort; never throws to caller). */
export async function recordDecision(input: {
  runId?: string | null;
  projectId?: string | null;
  question: string;
  options?: string[] | null;
  choice?: string | null;
  text?: string | null;
  source: MemorySource;
  confidence?: number | null;
  rationale?: string | null;
}): Promise<void> {
  const optionsJson = input.options && input.options.length ? JSON.stringify(input.options) : null;
  await db.execute(sql`
    insert into athena_memory
      (run_id, project_id, question, options, answer_choice, answer_text, source, confidence, rationale)
    values (
      ${input.runId ?? null}, ${input.projectId ?? null}, ${input.question},
      ${optionsJson}::jsonb, ${input.choice ?? null}, ${input.text ?? null},
      ${input.source}, ${input.confidence ?? null}, ${input.rationale ?? null}
    )
  `);
}

/** the top-K precedents most similar to `question` (non-pruned), Owner-weighted. */
export async function retrieveSimilar(question: string, k = DEFAULT_K): Promise<PriorDecision[]> {
  const rows = await db
    .select({
      question: athenaMemory.question,
      choice: athenaMemory.answerChoice,
      text: athenaMemory.answerText,
      source: athenaMemory.source,
      confidence: athenaMemory.confidence,
      rationale: athenaMemory.rationale,
    })
    .from(athenaMemory)
    .where(isNull(athenaMemory.prunedAt))
    .orderBy(desc(athenaMemory.createdAt))
    .limit(SCAN_LIMIT);

  const candidates: Candidate[] = rows.map((r) => ({
    question: r.question,
    answer: r.choice ?? r.text ?? "—",
    source: r.source === "owner" ? "owner" : "athena",
    ...(r.confidence !== null ? { confidence: r.confidence } : {}),
    ...(r.rationale ? { rationale: r.rationale } : {}),
  }));
  return rankSimilar(question, candidates, k);
}

/** the most recent memories for the activity view (non-pruned). */
export async function listMemories(limit = 50): Promise<MemoryEntry[]> {
  const rows = await db
    .select({
      id: athenaMemory.id,
      question: athenaMemory.question,
      options: athenaMemory.options,
      choice: athenaMemory.answerChoice,
      text: athenaMemory.answerText,
      source: athenaMemory.source,
      confidence: athenaMemory.confidence,
      rationale: athenaMemory.rationale,
      createdAt: athenaMemory.createdAt,
    })
    .from(athenaMemory)
    .where(isNull(athenaMemory.prunedAt))
    .orderBy(desc(athenaMemory.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    question: r.question,
    answer: r.choice ?? r.text ?? "—",
    source: r.source === "owner" ? "owner" : "athena",
    ...(Array.isArray(r.options) ? { options: r.options as string[] } : {}),
    ...(r.confidence !== null ? { confidence: r.confidence } : {}),
    ...(r.rationale ? { rationale: r.rationale } : {}),
    at: r.createdAt,
  }));
}

/** soft-delete a precedent so it drops out of retrieval (stays auditable). */
export async function pruneMemory(id: string): Promise<void> {
  await db
    .update(athenaMemory)
    .set({ prunedAt: new Date() })
    .where(and(eq(athenaMemory.id, id), isNull(athenaMemory.prunedAt)));
}
