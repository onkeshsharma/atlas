/**
 * M12 — search ranking (pure; PRD #50–#51).
 *
 * One rank law for every corpus (charter item 1): exact ref beats
 * prefix beats substring, then recency. No engine, no embeddings —
 * honest v2.0 ILIKE candidates ranked by these table-driven rules.
 */

/** lower is better; null = no match (the candidate drops out). */
export type MatchTier = 0 | 1 | 2;

export const TIER_EXACT_REF: MatchTier = 0;
export const TIER_PREFIX: MatchTier = 1;
export const TIER_SUBSTRING: MatchTier = 2;

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** escape ILIKE wildcards so a literal "%"/"_" in a query stays literal. */
export function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Classify how a candidate matches the query.
 * - exact ref: the query IS the candidate's ref ("t-247" → T-247);
 * - prefix: any text field starts with the query;
 * - substring: any text field contains it.
 */
export function matchTier(
  query: string,
  candidate: { ref?: string | null; texts: readonly string[] },
): MatchTier | null {
  const q = normalize(query);
  if (!q) return null;
  if (candidate.ref && normalize(candidate.ref) === q) return TIER_EXACT_REF;
  const texts = candidate.ref ? [candidate.ref, ...candidate.texts] : candidate.texts;
  let tier: MatchTier | null = null;
  for (const raw of texts) {
    const text = normalize(raw);
    if (!text) continue;
    if (text.startsWith(q)) return TIER_PREFIX;
    if (text.includes(q)) tier = TIER_SUBSTRING;
  }
  return tier;
}

export type Ranked = { tier: MatchTier; at?: Date | null };

/**
 * Sort comparator: tier ascending, then recency descending; undated
 * rows keep their input order at the tail of their tier (stable sort —
 * callers use Array.prototype.sort, which is stable per spec).
 */
export function compareRanked(a: Ranked, b: Ranked): number {
  if (a.tier !== b.tier) return a.tier - b.tier;
  const at = a.at?.getTime() ?? 0;
  const bt = b.at?.getTime() ?? 0;
  return bt - at;
}

/**
 * LL's "...the export should include..." snippet line: the fragment of
 * `text` around the first case-insensitive match, single-spaced, capped
 * at `span` chars. Undefined when the body doesn't contain the query.
 */
export function snippetAround(text: string, query: string, span = 140): string | undefined {
  const q = normalize(query);
  if (!q) return undefined;
  const flat = text.replace(/\s+/g, " ").trim();
  const idx = flat.toLowerCase().indexOf(q);
  if (idx < 0) return undefined;
  const lead = Math.floor((span - q.length) / 2);
  const start = Math.max(0, idx - lead);
  const end = Math.min(flat.length, start + span);
  const core = flat.slice(start, end).trim();
  return `${start > 0 ? "…" : ""}${core}${end < flat.length ? "…" : ""}`;
}
