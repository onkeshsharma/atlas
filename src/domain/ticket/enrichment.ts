/**
 * M8 — Helper-Run enrichment payload (PRD #17): the typed shape of
 * `tickets.enrichment` jsonb + a strict parser (same discipline as
 * src/domain/run/needs-input.ts).
 *
 * NULL enrichment = "enrichment pending" — the honest pre-Helper state
 * every surface renders quietly (S files it, I/F read it). M9 wires the
 * Helper Run that actually writes this; M8 owns the shape so triage (I),
 * the detail rail (F) and the Hints engine's file-set input can consume
 * it today (seeded rows carry realistic payloads).
 */
import type { TicketKind } from "@/src/db/schema";

export type EnrichmentSeverity = "low" | "medium" | "high";
export type EnrichmentConfidence = "low" | "medium" | "high";

export type TicketEnrichment = {
  /** the Engine's read of what this is (I:124–126). */
  kind: TicketKind;
  severity: EnrichmentSeverity;
  /** 1–5 segment confidence meter (I:143–153). */
  confidence: EnrichmentConfidence;
  /** ref of the most similar prior ticket, if any (I:128–130, F's similarTo). */
  similarTo?: string;
  /** files the change will likely touch (I:25–28) — the Hints engine's file-set input until M9 supplies real diffs. */
  likelyFiles: string[];
  /** the question the Engine would ask first (F:413–423 "AI asks"). */
  question?: string;
  /** ISO timestamp (F:426 "enriched 2026-05-13"). */
  enrichedAt: string;
};

const KINDS: readonly string[] = ["bug", "enhancement", "other"];
const LEVELS: readonly string[] = ["low", "medium", "high"];

/** strict parse of a jsonb value — null/malformed reads as "pending" (null). */
export function parseEnrichment(value: unknown): TicketEnrichment | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.kind !== "string" || !KINDS.includes(v.kind)) return null;
  if (typeof v.severity !== "string" || !LEVELS.includes(v.severity)) return null;
  if (typeof v.confidence !== "string" || !LEVELS.includes(v.confidence)) return null;
  if (typeof v.enrichedAt !== "string" || Number.isNaN(Date.parse(v.enrichedAt))) return null;
  if (!Array.isArray(v.likelyFiles) || v.likelyFiles.some((f) => typeof f !== "string")) {
    return null;
  }
  if (v.similarTo !== undefined && typeof v.similarTo !== "string") return null;
  if (v.question !== undefined && typeof v.question !== "string") return null;
  return {
    kind: v.kind as TicketKind,
    severity: v.severity as EnrichmentSeverity,
    confidence: v.confidence as EnrichmentConfidence,
    similarTo: v.similarTo as string | undefined,
    likelyFiles: v.likelyFiles as string[],
    question: v.question as string | undefined,
    enrichedAt: v.enrichedAt,
  };
}

/** I:143–153 — the 5-segment confidence meter's filled count. */
export function confidenceSegments(confidence: EnrichmentConfidence): number {
  return confidence === "high" ? 3 : confidence === "medium" ? 2 : 1;
}
