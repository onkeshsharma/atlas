/**
 * M7 — the Ingest Summary shape (PRD #29; variant J's sections).
 *
 * The Engine WRITES this at M9; M7 fixes the shape and proves the
 * render from seeded example rows (charter §1: "the Engine-written
 * summary shape renders from seeded example rows so the surface is
 * provable"). `projects.ingest_summary` jsonb parses through here —
 * never trust raw jsonb (the M6 needs-input law).
 */

export type IngestSmell = {
  severity: "high" | "medium" | "low";
  title: string;
  /** the offending file/path — mono in J:294. */
  file: string;
  detail: string;
};

export type IngestArchitectureNode = {
  name: string;
  /** mono sub-line — "Next.js · page tier · marketing" (J:27). */
  sub: string;
  detail: string;
};

export type IngestHealthCheck = {
  label: string;
  value: string;
  ok: boolean;
};

export type IngestCoverageArea = {
  area: string;
  pct: number;
  /** the Overall row renders semibold + amber-500 bar (J:377). */
  hero?: boolean;
};

export type IngestCommit = {
  sha: string;
  subject: string;
  /** ISO timestamp. */
  at: string;
};

export type IngestSummary = {
  schemaVersion: 1;
  /** the Engine's one-line read of what the project IS (J:129). */
  tagline: string;
  /** editorial paragraphs (J:148–172); names highlighted at render. */
  engineRead: string[];
  /** tech names — bolded wherever they appear in prose (J:185–195). */
  stack: string[];
  /** the Stack section's prose paragraph (J:184–196). */
  stackProse: string;
  /** intro sentence above the figure (J:204–209). */
  architectureProse: string;
  architecture: IngestArchitectureNode[];
  smells: IngestSmell[];
  health: IngestHealthCheck[];
  /** weekly commit counts, oldest → current week (J:319). */
  churnWeeks: number[];
  coverage: IngestCoverageArea[];
  stats: {
    coveragePct: number;
    prevCoveragePct: number | null;
    /** display string — "~18,300" (J:475). */
    linesOfCode: string;
    files: number;
  };
  commits: IngestCommit[];
  commitsTotal: number;
  repo: {
    branch: string;
    /** "247 commits ahead of last ingest" (J:499). */
    commitsSinceIngest: number;
  };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === "string");
}

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((n) => typeof n === "number" && Number.isFinite(n));
}

const SEVERITIES = new Set(["high", "medium", "low"]);

/** Parse jsonb into an IngestSummary; null when malformed. */
export function parseIngestSummary(value: unknown): IngestSummary | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== 1) return null;
  if (typeof value.tagline !== "string") return null;
  if (!isStringArray(value.engineRead)) return null;
  if (!isStringArray(value.stack)) return null;
  if (typeof value.stackProse !== "string") return null;
  if (typeof value.architectureProse !== "string") return null;

  if (!Array.isArray(value.architecture)) return null;
  for (const node of value.architecture) {
    if (!isRecord(node)) return null;
    if (
      typeof node.name !== "string" ||
      typeof node.sub !== "string" ||
      typeof node.detail !== "string"
    ) {
      return null;
    }
  }

  if (!Array.isArray(value.smells)) return null;
  for (const smell of value.smells) {
    if (!isRecord(smell)) return null;
    if (typeof smell.severity !== "string" || !SEVERITIES.has(smell.severity)) return null;
    if (
      typeof smell.title !== "string" ||
      typeof smell.file !== "string" ||
      typeof smell.detail !== "string"
    ) {
      return null;
    }
  }

  if (!Array.isArray(value.health)) return null;
  for (const check of value.health) {
    if (!isRecord(check)) return null;
    if (
      typeof check.label !== "string" ||
      typeof check.value !== "string" ||
      typeof check.ok !== "boolean"
    ) {
      return null;
    }
  }

  if (!isNumberArray(value.churnWeeks)) return null;

  if (!Array.isArray(value.coverage)) return null;
  for (const area of value.coverage) {
    if (!isRecord(area)) return null;
    if (typeof area.area !== "string" || typeof area.pct !== "number") return null;
    if (area.hero !== undefined && typeof area.hero !== "boolean") return null;
  }

  if (!isRecord(value.stats)) return null;
  const stats = value.stats;
  if (typeof stats.coveragePct !== "number") return null;
  if (stats.prevCoveragePct !== null && typeof stats.prevCoveragePct !== "number") return null;
  if (typeof stats.linesOfCode !== "string" || typeof stats.files !== "number") return null;

  if (!Array.isArray(value.commits)) return null;
  for (const commit of value.commits) {
    if (!isRecord(commit)) return null;
    if (
      typeof commit.sha !== "string" ||
      typeof commit.subject !== "string" ||
      typeof commit.at !== "string"
    ) {
      return null;
    }
  }
  if (typeof value.commitsTotal !== "number") return null;

  if (!isRecord(value.repo)) return null;
  if (typeof value.repo.branch !== "string" || typeof value.repo.commitsSinceIngest !== "number") {
    return null;
  }

  return value as unknown as IngestSummary;
}

/**
 * J:311–317's churn comparator, made honest: computed from the data
 * instead of mock copy. Compares the current week against the mean of
 * the preceding weeks.
 */
export function churnComparator(
  churnWeeks: number[],
): "busier than usual" | "quieter than usual" | "about typical" {
  if (churnWeeks.length < 2) return "about typical";
  const current = churnWeeks[churnWeeks.length - 1];
  const rest = churnWeeks.slice(0, -1);
  const mean = rest.reduce((a, b) => a + b, 0) / rest.length;
  if (current > mean * 1.25) return "busier than usual";
  if (current < mean * 0.75) return "quieter than usual";
  return "about typical";
}
