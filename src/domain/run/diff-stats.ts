/**
 * M9 — RunDiffStats: the typed shape of `runs.diff_stats` jsonb.
 *
 * Written by the Bridge at review-ready (git numstat over the run's
 * worktree); read by KK (Session B) and by the Hints engine's file-sets
 * seam (`fileSetsFromEnrichment` → real per-Run diffs at the /board call
 * site — HANDOFF-M8). Strict parse, same discipline as needs-input.ts —
 * never trust raw jsonb.
 */

export type RunDiffFile = {
  path: string;
  insertions: number;
  deletions: number;
};

export type RunDiffStats = {
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: RunDiffFile[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isCount(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

/** Parse jsonb into RunDiffStats; null when malformed. */
export function parseRunDiffStats(value: unknown): RunDiffStats | null {
  if (!isRecord(value)) return null;
  if (!isCount(value.filesChanged) || !isCount(value.insertions) || !isCount(value.deletions)) {
    return null;
  }
  if (!Array.isArray(value.files)) return null;
  for (const f of value.files) {
    if (!isRecord(f)) return null;
    if (typeof f.path !== "string" || f.path.length === 0) return null;
    if (!isCount(f.insertions) || !isCount(f.deletions)) return null;
  }
  return value as unknown as RunDiffStats;
}
