/** a minimal-but-COMPLETE IngestSummary (every required field, correct types). */
export const VALID_SUMMARY = {
  schemaVersion: 1,
  tagline: "A tracker for any project.",
  engineRead: ["It tracks tickets and runs."],
  stack: ["TypeScript", "Next.js"],
  stackProse: "TypeScript end to end.",
  architectureProse: "A thin app over Postgres.",
  architecture: [{ name: "app", sub: "Next.js · app tier", detail: "the cockpit" }],
  smells: [],
  health: [{ label: "Tests", value: "present", ok: true }],
  churnWeeks: [3, 5, 2],
  coverage: [],
  stats: { coveragePct: 0, prevCoveragePct: null, linesOfCode: "~12,000", files: 240 },
  commits: [{ sha: "abc123", subject: "init", at: "2026-01-01T00:00:00Z" }],
  commitsTotal: 1,
  repo: { branch: "main", commitsSinceIngest: 0 },
};
