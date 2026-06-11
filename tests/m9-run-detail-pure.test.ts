/**
 * M9 Session B — pure read-model units: the unified-diff parser KK
 * renders from (runs.diff_patch) and the stdout line assembly the run
 * pages share. No DB, no JSX.
 */
import { describe, expect, it } from "vitest";

import {
  DIFF_TRUNCATION_MARKER,
  diffPatchTruncated,
  parseDiffPatch,
} from "@/src/domain/run/diff-patch";
import { classifyStdoutLine } from "@/src/domain/run/stdout";

const PATCH = [
  "diff --git a/src/lib/ticket-export.ts b/src/lib/ticket-export.ts",
  "new file mode 100644",
  "index 0000000..1111111",
  "--- /dev/null",
  "+++ b/src/lib/ticket-export.ts",
  "@@ -0,0 +1,3 @@",
  '+import { Ticket } from "./types";',
  "+",
  "+export function ticketsToJson() {}",
  "diff --git a/app/page.tsx b/app/page.tsx",
  "index 2222222..3333333 100644",
  "--- a/app/page.tsx",
  "+++ b/app/page.tsx",
  "@@ -42,4 +42,5 @@ export default function Page() {",
  ' <div className="toolbar">',
  "-  <button>Export CSV</button>",
  "+  <ExportMenu",
  "+  />",
  " </div>",
  "diff --git a/gone.txt b/gone.txt",
  "deleted file mode 100644",
  "--- a/gone.txt",
  "+++ /dev/null",
  "@@ -1,1 +0,0 @@",
  "-bye",
].join("\n");

describe("parseDiffPatch", () => {
  it("parses files, statuses, hunks, wash kinds and line numbers from real git output shape", () => {
    const files = parseDiffPatch(PATCH);
    expect(files.map((f) => [f.path, f.status])).toEqual([
      ["src/lib/ticket-export.ts", "new"],
      ["app/page.tsx", "modified"],
      ["gone.txt", "deleted"],
    ]);

    const [created, modified, deleted] = files;
    expect(created.added).toBe(3);
    expect(created.removed).toBe(0);
    expect(created.hunks[0].header).toBe("@@ -0,0 +1,3 @@");
    expect(created.hunks[0].lines[0]).toEqual({
      kind: "add",
      n: "1",
      text: 'import { Ticket } from "./types";',
    });

    // modified: context numbers run on the NEW side, removes on the OLD side (KK:201 gutter)
    expect(modified.hunks[0].lines.map((l) => [l.kind, l.n])).toEqual([
      ["context", "42"],
      ["remove", "43"],
      ["add", "43"],
      ["add", "44"],
      ["context", "45"],
    ]);
    expect(modified.added).toBe(2);
    expect(modified.removed).toBe(1);

    expect(deleted.removed).toBe(1);
  });

  it("degrades quietly: empty / null / garbage input parse to no files", () => {
    expect(parseDiffPatch(null)).toEqual([]);
    expect(parseDiffPatch("")).toEqual([]);
    expect(parseDiffPatch("not a diff at all\njust prose")).toEqual([]);
  });

  it("flags the Bridge's truncation marker (honest cap line)", () => {
    expect(diffPatchTruncated(PATCH)).toBe(false);
    expect(diffPatchTruncated(PATCH + DIFF_TRUNCATION_MARKER)).toBe(true);
  });
});

describe("classifyStdoutLine (§2.20 kind map over real adapter vocabulary)", () => {
  it.each([
    ["✓ pnpm test — 12 passed", "ok"],
    ["answered: staging", "ok"],
    ["wrote e2e-change.md", "tool"],
    ["engine session start — R-501 (acme)", "info"],
    ["reading the Brief…", "info"],
    ["planning the change for T-401", "tool"],
    ["⨯ failure: PR is not mergeable", "active"],
  ] as const)("%s → %s", (line, kind) => {
    expect(classifyStdoutLine(line)).toBe(kind);
  });
});
