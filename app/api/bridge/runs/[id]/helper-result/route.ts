/**
 * M9 — Helper-Run deliverable ingest (charter §7). The payload is
 * validated against the OWNING module's parser inside the writers
 * (TicketEnrichment / briefs / parseIngestSummary — never trust the
 * wire), lands with its outbox row in one statement, then the run
 * completes: running → review-ready → shipped, two single-statement
 * transitions back-to-back — helper deliverables need no review, and
 * nothing may REST at review-ready that isn't waiting on the Owner
 * (decision recorded in notes/M9A-handoff.md).
 */
import { eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import { runs } from "@/src/db/schema";
import { bridgeFromRequest } from "@/src/domain/bridge/auth";
import { parseBridgeHelperResult } from "@/src/domain/bridge/protocol";
import {
  insertDraftBrief,
  writeEnrichment,
  writeIngestSummary,
} from "@/src/domain/dispatch/helper-results";
import { applyRunTransition } from "@/src/domain/run/transitions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENGINE_ACTOR = "Engine";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bridge = await bridgeFromRequest(req);
  if (!bridge) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const body = parseBridgeHelperResult(await req.json().catch(() => null));
  if (!body) return new Response("Bad helper-result body", { status: 400 });

  const [run] = await db
    .select({
      id: runs.id,
      state: runs.state,
      lane: runs.lane,
      helperKind: runs.helperKind,
      ticketId: runs.ticketId,
      projectId: runs.projectId,
    })
    .from(runs)
    .where(eq(runs.id, id))
    .limit(1);
  if (!run) return new Response("Not found", { status: 404 });
  if (run.lane !== "helper" || run.helperKind !== body.kind) {
    return new Response("Run is not a helper of that kind", { status: 409 });
  }
  if (run.state !== "running") {
    return Response.json({ ok: false, reason: "not-claimed" }, { status: 409 });
  }

  // 1. the deliverable, validated + written with its own outbox row.
  let write:
    | Awaited<ReturnType<typeof writeEnrichment>>
    | Awaited<ReturnType<typeof writeIngestSummary>>
    | { ok: false; reason: string }
    | { ok: true };
  switch (body.kind) {
    case "enrich-ticket": {
      if (!run.ticketId) return new Response("Helper has no ticket", { status: 409 });
      write = await writeEnrichment({ ticketId: run.ticketId, enrichment: body.enrichment });
      break;
    }
    case "draft-brief": {
      if (!run.ticketId) return new Response("Helper has no ticket", { status: 409 });
      const inserted = await insertDraftBrief({
        ticketId: run.ticketId,
        body: body.body,
        source: "helper-run",
      });
      write = inserted.ok ? { ok: true } : { ok: false, reason: inserted.reason };
      break;
    }
    case "ingest-project": {
      write = await writeIngestSummary({
        projectId: run.projectId,
        summary: body.summary,
        suggestedTerms: body.suggestedTerms,
      });
      break;
    }
  }
  if (!write.ok) {
    return Response.json({ ok: false, reason: write.reason }, { status: 422 });
  }

  // 2. complete the helper run: running → review-ready → shipped.
  const finished = await applyRunTransition({
    runId: run.id,
    from: "running",
    to: "review-ready",
    actor: ENGINE_ACTOR,
  });
  if (!finished.ok) return Response.json({ ok: false, reason: finished.reason }, { status: 409 });
  await applyRunTransition({
    runId: run.id,
    from: "review-ready",
    to: "shipped",
    actor: ENGINE_ACTOR,
  });

  return Response.json({ ok: true });
}
