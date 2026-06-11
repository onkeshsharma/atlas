/**
 * M9 Session B — the Owner's Brief edits (W; PRD #19 "edit before
 * dispatch").
 *
 * Write shape (decision recorded in HANDOFF-M9): the FIRST owner edit
 * INSERTS an owner-source draft row (one `brief-drafted` outbox row —
 * "you drafted Brief for T-x"); every autosave after that UPDATES the
 * same row WITHOUT a feed event. Feed rows announce that a Brief
 * exists and that it dispatched — not every keystroke; the Engine
 * draft survives untouched underneath, which is what W's
 * "Diff from auto-draft" tab diffs against.
 */
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { briefs, type Brief } from "@/src/db/schema";

import { insertDraftBrief } from "./helper-results";

/** the Engine's draft — the diff-tab baseline (newest helper-run row). */
export async function latestEngineBriefForTicket(ticketId: string): Promise<Brief | null> {
  const rows = await db
    .select()
    .from(briefs)
    .where(and(eq(briefs.ticketId, ticketId), eq(briefs.source, "helper-run")))
    .orderBy(desc(briefs.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export type SaveBriefResult =
  | { ok: true; briefId: string }
  | { ok: false; reason: "empty-body" | "not-editable" };

/**
 * Save the Owner's editor state. Updates the existing owner DRAFT in
 * place; inserts the owner draft row on the first edit (outbox rides
 * the insert only — see header).
 */
export async function saveOwnerBriefDraft(input: {
  ticketId: string;
  body: string;
  /** the row the editor loaded — updated when it's an owner draft. */
  briefId?: string | null;
  actor?: string;
}): Promise<SaveBriefResult> {
  const body = input.body.trim();
  if (!body) return { ok: false, reason: "empty-body" };

  if (input.briefId) {
    const result = await db.execute(sql`
      update briefs
      set body = ${body}, updated_at = now()
      where id = ${input.briefId}
        and ticket_id = ${input.ticketId}
        and status = 'draft'
        and source = 'owner'
      returning id
    `);
    const rows = result.rows as Array<{ id: string }>;
    if (rows.length) return { ok: true, briefId: rows[0].id };
    // fall through — the id wasn't an editable owner draft (engine draft
    // or finalized): the first owner edit creates the owner row.
  }

  const inserted = await insertDraftBrief({
    ticketId: input.ticketId,
    body,
    source: "owner",
    actor: input.actor ?? "you",
  });
  if (!inserted.ok) return { ok: false, reason: "not-editable" };
  return { ok: true, briefId: inserted.briefId };
}
