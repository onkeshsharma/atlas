/**
 * M7 — prose segmenter for Engine-written paragraphs (pure).
 *
 * Variant J's editorial paragraphs bold subsystem/tech names and mono
 * file paths inside prose (J:148–172, J:184–196). The Engine writes
 * PLAIN text at M9; the render derives those emphases from the
 * summary's own vocabulary (architecture names + stack names → strong,
 * smell files / path-shaped tokens → mono) so the markup matches the
 * variant without storing markup.
 */

export type ProseSegment =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "mono"; text: string };

/** longest-first so "Next.js 15" wins over "Next.js". */
function byLengthDesc(a: string, b: string): number {
  return b.length - a.length;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split a paragraph into segments, marking occurrences of `strong`
 * terms (semibold names) and `mono` terms (file paths, machine words).
 * First match wins; overlapping later terms don't re-split.
 */
export function segmentProse(
  text: string,
  vocabulary: { strong?: string[]; mono?: string[] },
): ProseSegment[] {
  const strong = [...new Set(vocabulary.strong ?? [])].filter(Boolean).sort(byLengthDesc);
  const mono = [...new Set(vocabulary.mono ?? [])].filter(Boolean).sort(byLengthDesc);
  if (strong.length === 0 && mono.length === 0) {
    return text ? [{ kind: "text", text }] : [];
  }

  const alternatives = [
    ...strong.map((t) => ({ kind: "strong" as const, term: t })),
    ...mono.map((t) => ({ kind: "mono" as const, term: t })),
  ];
  // one pass, longest alternative first at any position.
  const pattern = new RegExp(
    alternatives
      .map((a) => escapeRegExp(a.term))
      .sort(byLengthDesc)
      .join("|"),
    "g",
  );
  const kindOf = new Map(alternatives.map((a) => [a.term, a.kind]));

  const segments: ProseSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index;
    if (at > cursor) segments.push({ kind: "text", text: text.slice(cursor, at) });
    segments.push({ kind: kindOf.get(match[0]) ?? "text", text: match[0] });
    cursor = at + match[0].length;
  }
  if (cursor < text.length) segments.push({ kind: "text", text: text.slice(cursor) });
  return segments;
}
