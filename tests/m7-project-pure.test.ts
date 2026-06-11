/**
 * M7 — pure domain tests (charter §5): slug derivation + repo-source
 * classification + new-project validation (slug.ts), the IngestSummary
 * parser + churn comparator (ingest-summary.ts), and the prose
 * segmenter (prose.ts). External behavior only — no DB.
 */
import { describe, expect, it } from "vitest";

import {
  churnComparator,
  parseIngestSummary,
  type IngestSummary,
} from "@/src/domain/project/ingest-summary";
import { segmentProse } from "@/src/domain/project/prose";
import {
  classifyRepoSource,
  deriveSlug,
  validateNewProject,
} from "@/src/domain/project/slug";

describe("deriveSlug", () => {
  it("lowercases and dashes non-alphanumerics", () => {
    expect(deriveSlug("Acme Website")).toBe("acme-website");
    expect(deriveSlug("My_Repo.Name")).toBe("my-repo-name");
  });
  it("trims leading/trailing dashes and collapses runs", () => {
    expect(deriveSlug("--weird  name--")).toBe("weird-name");
    expect(deriveSlug("a!!!b")).toBe("a-b");
  });
  it("returns empty for unsluggable input", () => {
    expect(deriveSlug("!!!")).toBe("");
  });
});

describe("classifyRepoSource", () => {
  it("classifies https URLs and strips .git", () => {
    expect(classifyRepoSource("https://github.com/acme/website.git")).toEqual({
      kind: "url",
      repoUrl: "https://github.com/acme/website.git",
      name: "website",
    });
  });
  it("classifies git ssh form", () => {
    expect(classifyRepoSource("git@github.com:acme/website.git")).toEqual({
      kind: "url",
      repoUrl: "git@github.com:acme/website.git",
      name: "website",
    });
  });
  it("classifies windows and POSIX paths by their last segment", () => {
    expect(classifyRepoSource("C:\\dev\\side-experiment")).toEqual({
      kind: "path",
      localPath: "C:\\dev\\side-experiment",
      name: "side-experiment",
    });
    expect(classifyRepoSource("~/code/atlas-v2")).toEqual({
      kind: "path",
      localPath: "~/code/atlas-v2",
      name: "atlas-v2",
    });
  });
  it("rejects non-repo input", () => {
    expect(classifyRepoSource("")).toBeNull();
    expect(classifyRepoSource("just some words")).toBeNull();
    expect(classifyRepoSource("ftp://example.com/repo")).toBeNull();
    // a bare drive root has no usable name
    expect(classifyRepoSource("C:\\")).toBeNull();
  });
});

describe("validateNewProject (§2.13 messages)", () => {
  it("derives name + slug + repo_url from a URL", () => {
    const v = validateNewProject({ source: "https://github.com/acme/WebShop.git" });
    expect(v).toEqual({
      ok: true,
      value: {
        name: "WebShop",
        slug: "webshop",
        repoUrl: "https://github.com/acme/WebShop.git",
        localPath: null,
      },
    });
  });
  it("derives local_path from a filesystem path", () => {
    const v = validateNewProject({ source: "C:\\dev\\thing" });
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.value.localPath).toBe("C:\\dev\\thing");
      expect(v.value.repoUrl).toBeNull();
    }
  });
  it("speaks quietly on empty + malformed input (sentence case, no !)", () => {
    const empty = validateNewProject({ source: "   " });
    expect(empty).toEqual({
      ok: false,
      error: "paste a repository url or a path on your machine",
    });
    const bad = validateNewProject({ source: "not a repo" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error).not.toMatch(/!/);
      expect(bad.error[0]).toBe(bad.error[0].toLowerCase());
    }
  });
});

/** minimal valid summary for parser round-trips. */
function validSummary(): IngestSummary {
  return {
    schemaVersion: 1,
    tagline: "A storefront.",
    engineRead: ["Reads well."],
    stack: ["Next.js 15"],
    stackProse: "Server-rendered with Next.js 15.",
    architectureProse: "One tier.",
    architecture: [{ name: "Storefront", sub: "Next.js", detail: "Pages." }],
    smells: [
      { severity: "high", title: "Long file", file: "app/page.tsx", detail: "Split it." },
    ],
    health: [{ label: "Tests", value: "ok", ok: true }],
    churnWeeks: [1, 2, 3],
    coverage: [{ area: "Overall", pct: 73, hero: true }],
    stats: { coveragePct: 73, prevCoveragePct: 68, linesOfCode: "~1,000", files: 10 },
    commits: [{ sha: "abc1234", subject: "feat: x", at: "2026-06-11T00:00:00Z" }],
    commitsTotal: 5,
    repo: { branch: "main", commitsSinceIngest: 5 },
  };
}

describe("parseIngestSummary (never trust jsonb)", () => {
  it("accepts the documented shape", () => {
    expect(parseIngestSummary(validSummary())).not.toBeNull();
  });
  it("rejects null / non-objects / wrong schemaVersion", () => {
    expect(parseIngestSummary(null)).toBeNull();
    expect(parseIngestSummary("x")).toBeNull();
    expect(parseIngestSummary({ ...validSummary(), schemaVersion: 2 })).toBeNull();
  });
  it("rejects malformed nested sections", () => {
    expect(
      parseIngestSummary({
        ...validSummary(),
        smells: [{ severity: "catastrophic", title: "x", file: "y", detail: "z" }],
      }),
    ).toBeNull();
    expect(
      parseIngestSummary({ ...validSummary(), churnWeeks: [1, "two"] }),
    ).toBeNull();
    expect(
      parseIngestSummary({
        ...validSummary(),
        stats: { coveragePct: "73", prevCoveragePct: null, linesOfCode: "x", files: 1 },
      }),
    ).toBeNull();
  });
  it("allows prevCoveragePct to be null (first ingest)", () => {
    const s = validSummary();
    s.stats.prevCoveragePct = null;
    expect(parseIngestSummary(s)).not.toBeNull();
  });
});

describe("churnComparator (computed, honest)", () => {
  it("calls a hot week busier than usual", () => {
    expect(churnComparator([3, 3, 3, 9])).toBe("busier than usual");
  });
  it("calls a cold week quieter than usual", () => {
    expect(churnComparator([6, 6, 6, 1])).toBe("quieter than usual");
  });
  it("calls a level week about typical, and degrades gracefully", () => {
    expect(churnComparator([5, 5, 5, 5])).toBe("about typical");
    expect(churnComparator([5])).toBe("about typical");
    expect(churnComparator([])).toBe("about typical");
  });
});

describe("segmentProse (J's derived emphasis)", () => {
  it("marks strong + mono vocabulary, first match wins", () => {
    const segs = segmentProse("Storefront uses page.tsx heavily.", {
      strong: ["Storefront"],
      mono: ["page.tsx"],
    });
    expect(segs).toEqual([
      { kind: "strong", text: "Storefront" },
      { kind: "text", text: " uses " },
      { kind: "mono", text: "page.tsx" },
      { kind: "text", text: " heavily." },
    ]);
  });
  it("prefers the longest term at a position", () => {
    const segs = segmentProse("Built on Next.js 15 today.", {
      strong: ["Next.js", "Next.js 15"],
      mono: [],
    });
    expect(segs).toContainEqual({ kind: "strong", text: "Next.js 15" });
  });
  it("passes text through when no vocabulary matches", () => {
    expect(segmentProse("plain words", { strong: [], mono: [] })).toEqual([
      { kind: "text", text: "plain words" },
    ]);
    expect(segmentProse("", { strong: ["x"], mono: [] })).toEqual([]);
  });
  it("escapes regex metacharacters in vocabulary", () => {
    const segs = segmentProse("see app/(shop)/[handle]/page.tsx now", {
      strong: [],
      mono: ["app/(shop)/[handle]/page.tsx"],
    });
    expect(segs).toContainEqual({
      kind: "mono",
      text: "app/(shop)/[handle]/page.tsx",
    });
  });
});
