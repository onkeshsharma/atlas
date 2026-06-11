/**
 * M9 Session B — line diff for W's "Diff from auto-draft" tab (W:131).
 * Plain LCS over lines — Briefs are small documents; O(n·m) is nothing.
 * Pure and shared so the tab and its tests see the same rows.
 */

export type DiffRow = { kind: "same" | "add" | "remove"; text: string };

export function lineDiff(before: string, after: string): DiffRow[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const n = a.length;
  const m = b.length;
  // lcs[i][j] = LCS length of a[i:], b[j:]
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ kind: "same", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      rows.push({ kind: "remove", text: a[i] });
      i++;
    } else {
      rows.push({ kind: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) rows.push({ kind: "remove", text: a[i++] });
  while (j < m) rows.push({ kind: "add", text: b[j++] });
  return rows;
}

/** true when the two bodies differ at all (the tab's empty message). */
export function hasDiff(rows: DiffRow[]): boolean {
  return rows.some((r) => r.kind !== "same");
}
