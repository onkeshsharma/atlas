/**
 * M9 Session B — unified-diff parsing for the KK diff viewer (PRD #24).
 *
 * The run's worktree lives on the Owner's machine; the Bridge uploads
 * `git diff --cached` text with the numstat at review-ready
 * (runs.diff_patch, migration 0005) so the cloud can render real hunks.
 * This module parses that text into the KK shape (file → hunks → lines
 * with emerald/rose wash kinds — KK:189–224). Pure, total: malformed
 * input degrades to fewer files, never throws.
 */

export type DiffLineKind = "context" | "add" | "remove";

export type DiffLine = {
  kind: DiffLineKind;
  /** display line number — new-file side for context/add, old side for remove (KK:201 single-column gutter). */
  n: string;
  text: string;
};

export type DiffHunk = {
  /** the raw `@@ -a,b +c,d @@` header (KK:186). */
  header: string;
  lines: DiffLine[];
};

export type ParsedDiffFile = {
  path: string;
  status: "new" | "modified" | "deleted";
  added: number;
  removed: number;
  hunks: DiffHunk[];
};

/** Bridge-side cap mirrors DIFF_PATCH_MAX_CHARS; the marker is honest UI copy. */
export const DIFF_TRUNCATION_MARKER = "\n…atlas: diff truncated…\n";

const HUNK_RE = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export function parseDiffPatch(patch: string | null | undefined): ParsedDiffFile[] {
  if (!patch) return [];
  const files: ParsedDiffFile[] = [];
  let file: ParsedDiffFile | null = null;
  let hunk: DiffHunk | null = null;
  let oldN = 0;
  let newN = 0;

  const pushFile = () => {
    if (file) files.push(file);
    file = null;
    hunk = null;
  };

  for (const raw of patch.split("\n")) {
    if (raw.startsWith("diff --git ")) {
      pushFile();
      // `diff --git a/<path> b/<path>` — take the b-side (rename-safe enough for v2.0).
      const m = raw.match(/^diff --git a\/(.*) b\/(.*)$/);
      file = {
        path: m ? m[2] : raw.slice("diff --git ".length),
        status: "modified",
        added: 0,
        removed: 0,
        hunks: [],
      };
      continue;
    }
    if (!file) continue;
    if (raw.startsWith("new file mode")) {
      file.status = "new";
      continue;
    }
    if (raw.startsWith("deleted file mode")) {
      file.status = "deleted";
      continue;
    }
    if (raw.startsWith("Binary files")) {
      // binary — no hunks; the file row still lists (numstat reports 0/0).
      continue;
    }
    const hunkMatch = raw.match(HUNK_RE);
    if (hunkMatch) {
      oldN = Number(hunkMatch[1]);
      newN = Number(hunkMatch[2]);
      hunk = { header: raw, lines: [] };
      file.hunks.push(hunk);
      continue;
    }
    if (!hunk) continue; // ---/+++/index headers
    if (raw.startsWith("+")) {
      hunk.lines.push({ kind: "add", n: String(newN), text: raw.slice(1) });
      file.added += 1;
      newN += 1;
    } else if (raw.startsWith("-")) {
      hunk.lines.push({ kind: "remove", n: String(oldN), text: raw.slice(1) });
      file.removed += 1;
      oldN += 1;
    } else if (raw.startsWith(" ") || raw === "") {
      hunk.lines.push({ kind: "context", n: String(newN), text: raw.slice(1) });
      oldN += 1;
      newN += 1;
    } else if (raw.startsWith("\\")) {
      // "\ No newline at end of file" — annotation, not a line.
      continue;
    }
  }
  pushFile();
  return files;
}

/** Was the uploaded patch cut at the Bridge's cap? (honest UI line) */
export function diffPatchTruncated(patch: string | null | undefined): boolean {
  return Boolean(patch && patch.includes(DIFF_TRUNCATION_MARKER.trim()));
}
