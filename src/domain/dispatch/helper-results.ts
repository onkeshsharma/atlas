/**
 * M9 — Helper-Run deliverable writers (charter §7). Each deliverable is
 * validated against its OWNING module's parser before anything is
 * written — never trust the wire (the M6 needs-input law) — and lands
 * with its feed row in one statement (THE OUTBOX RULE):
 *
 * - enrich-ticket  → tickets.enrichment   (contract: src/domain/ticket/enrichment.ts)
 * - draft-brief    → briefs row           (schema: src/db/schema/briefs.ts)
 * - ingest-project → projects.ingest_summary + suggested context_terms
 *                    (contract: src/domain/project/ingest-summary.ts — HANDOFF-M7)
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";

import { parseIngestSummary } from "../project/ingest-summary";
import { parseEnrichment } from "../ticket/enrichment";

export type HelperWriteResult =
  | { ok: true; feedEventId: number }
  | { ok: false; reason: "invalid-payload" | "not-found" };

/** UPDATE tickets.enrichment + `enriched` outbox row, atomically (PRD #17). */
export async function writeEnrichment(input: {
  ticketId: string;
  enrichment: unknown;
  actor?: string;
}): Promise<HelperWriteResult> {
  const enrichment = parseEnrichment(input.enrichment);
  if (!enrichment) return { ok: false, reason: "invalid-payload" };

  const payload = JSON.stringify({
    kind: enrichment.kind,
    severity: enrichment.severity,
    enrichedAt: enrichment.enrichedAt,
  });
  const result = await db.execute(sql`
    with updated as (
      update tickets
      set enrichment = ${JSON.stringify(enrichment)}::jsonb,
          updated_at = now()
      where id = ${input.ticketId}
      returning id, ref, project_id, title
    )
    insert into feed_events (kind, actor, summary, project_id, ticket_id, ticket_ref, payload, seeded)
    select
      'enriched',
      ${input.actor ?? "Engine"},
      updated.ref || ' — ' || updated.title,
      updated.project_id,
      updated.id,
      updated.ref,
      ${payload}::jsonb,
      false
    from updated
    returning id
  `);

  const rows = result.rows as Array<{ id: number | string }>;
  if (!rows.length) return { ok: false, reason: "not-found" };
  return { ok: true, feedEventId: Number(rows[0].id) };
}

export type InsertBriefResult =
  | { ok: true; briefId: string }
  | { ok: false; reason: "empty-body" | "not-found" };

/** INSERT the drafted Brief + `brief-drafted` outbox row, atomically (PRD #19). */
export async function insertDraftBrief(input: {
  ticketId: string;
  body: string;
  source: "helper-run" | "owner";
  actor?: string;
}): Promise<InsertBriefResult> {
  const body = input.body.trim();
  if (!body) return { ok: false, reason: "empty-body" };

  const result = await db.execute(sql`
    with created as (
      insert into briefs (ticket_id, body, status, source)
      select t.id, ${body}, 'draft', ${input.source}
      from tickets t where t.id = ${input.ticketId}
      returning id, ticket_id
    ),
    outbox as (
      insert into feed_events (kind, actor, summary, project_id, ticket_id, ticket_ref, payload, seeded)
      select
        'brief-drafted',
        ${input.actor ?? "Engine"},
        t.ref || ' — ' || t.title,
        t.project_id,
        t.id,
        t.ref,
        jsonb_build_object('briefId', created.id),
        false
      from created
      join tickets t on t.id = created.ticket_id
      returning id
    )
    select created.id from created
  `);

  const rows = result.rows as Array<{ id: string }>;
  if (!rows.length) return { ok: false, reason: "not-found" };
  return { ok: true, briefId: rows[0].id };
}

export type SuggestedTerm = { term: string; uses: number };

/**
 * Flip the M7 ingest seam (queued|none → ready) + write the validated
 * Ingest Summary + `ingested` outbox row in one statement (HANDOFF-M7's
 * exact contract), then land the Engine-noticed term suggestions as
 * idempotent `suggested` rows (`status='suggested', provenance='engine',
 * uses=N, meaning=''`). The terms ride without per-row feed events —
 * the one `ingested` row is the announcement (recorded in M9A-handoff).
 */
export async function writeIngestSummary(input: {
  projectId: string;
  summary: unknown;
  suggestedTerms?: SuggestedTerm[];
  actor?: string;
}): Promise<HelperWriteResult> {
  const summary = parseIngestSummary(input.summary);
  if (!summary) return { ok: false, reason: "invalid-payload" };

  const payload = JSON.stringify({ schemaVersion: summary.schemaVersion });
  const result = await db.execute(sql`
    with updated as (
      update projects
      set ingest_status = 'ready',
          ingested_at = now(),
          ingest_summary = ${JSON.stringify(summary)}::jsonb
      where id = ${input.projectId}
      returning id, name
    )
    insert into feed_events (kind, actor, summary, project_id, payload, seeded)
    select
      'ingested',
      ${input.actor ?? "Engine"},
      updated.name || ' — Ingest Summary refreshed',
      updated.id,
      ${payload}::jsonb,
      false
    from updated
    returning id
  `);

  const rows = result.rows as Array<{ id: number | string }>;
  if (!rows.length) return { ok: false, reason: "not-found" };

  for (const t of input.suggestedTerms ?? []) {
    const term = t.term.trim();
    if (!term) continue;
    await db.execute(sql`
      insert into context_terms (project_id, term, meaning, status, provenance, uses)
      values (${input.projectId}, ${term}, '', 'suggested', 'engine', ${t.uses})
      on conflict (project_id, term) do nothing
    `);
  }

  return { ok: true, feedEventId: Number(rows[0].id) };
}
