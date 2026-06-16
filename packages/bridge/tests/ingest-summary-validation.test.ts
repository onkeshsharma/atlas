/**
 * ADR-0008 — the bridge's strict ingest-summary validation (MIRROR of Atlas's
 * parseIngestSummary). Rejecting in-turn is what gives the Engine a Gap-3 retry
 * instead of a post-hoc 422 that strands the run (the R-723 failure).
 */
import { describe, expect, it } from "vitest";

import { isValidIngestSummary, parseHelperResultBody } from "../src/protocol.ts";
import { VALID_SUMMARY } from "./fixtures/ingest-summary.ts";

describe("isValidIngestSummary", () => {
  it("accepts a complete summary (empty smells/coverage allowed)", () => {
    expect(isValidIngestSummary(VALID_SUMMARY)).toBe(true);
  });

  it("rejects a free-form / empty summary", () => {
    expect(isValidIngestSummary({})).toBe(false);
    expect(isValidIngestSummary({ overview: "a project" })).toBe(false); // the R-723 shape
    expect(isValidIngestSummary(null)).toBe(false);
  });

  it("rejects a wrong schemaVersion", () => {
    expect(isValidIngestSummary({ ...VALID_SUMMARY, schemaVersion: 2 })).toBe(false);
  });

  it("rejects a mistyped field", () => {
    expect(isValidIngestSummary({ ...VALID_SUMMARY, stats: { ...VALID_SUMMARY.stats, files: "240" } })).toBe(false);
    expect(isValidIngestSummary({ ...VALID_SUMMARY, churnWeeks: ["3"] })).toBe(false);
  });

  it("rejects an invalid smell severity", () => {
    const bad = { ...VALID_SUMMARY, smells: [{ severity: "critical", title: "x", file: "y", detail: "z" }] };
    expect(isValidIngestSummary(bad)).toBe(false);
  });

  it("allows prevCoveragePct null but not a string", () => {
    expect(isValidIngestSummary({ ...VALID_SUMMARY, stats: { ...VALID_SUMMARY.stats, prevCoveragePct: 80 } })).toBe(true);
    expect(isValidIngestSummary({ ...VALID_SUMMARY, stats: { ...VALID_SUMMARY.stats, prevCoveragePct: "80" } })).toBe(false);
  });
});

describe("parseHelperResultBody — ingest-project is now strict", () => {
  it("accepts a valid summary (with optional suggestedTerms)", () => {
    const body = { kind: "ingest-project", summary: VALID_SUMMARY, suggestedTerms: [{ term: "Run", uses: 9 }] };
    expect(parseHelperResultBody(body)).toEqual(body);
  });

  it("rejects an invalid summary in-turn (so the Engine retries before the turn ends)", () => {
    expect(parseHelperResultBody({ kind: "ingest-project", summary: {} })).toBeNull();
    expect(parseHelperResultBody({ kind: "ingest-project", summary: { overview: "x" } })).toBeNull();
  });
});
