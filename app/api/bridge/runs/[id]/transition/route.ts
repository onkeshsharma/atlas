/**
 * M9 — Bridge-posted run transitions (ADR-0002 §3). Every state change
 * lands through `applyRunTransition` or its M9 siblings — single
 * conditional statement + outbox row each (THE OUTBOX RULE); stale posts
 * (an Engine finishing a just-cancelled run) get 409 and the daemon
 * drops the run.
 *
 * Ticket follow-ups (owner-lane runs): review-ready / failed drive the
 * Ticket through `applyTicketTransition` with the Engine actor — the
 * dispatch verbs deliberately absent from OWNER_MOVES (HANDOFF-M8).
 * Cross-entity consistency is two atomic statements (ADR-0002
 * consequences); a lost ticket claim means someone else moved it first.
 */
import { eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import { runs } from "@/src/db/schema";
import { bridgeFromRequest } from "@/src/domain/bridge/auth";
import { parseBridgeTransition } from "@/src/domain/bridge/protocol";
import { completeRun, failRun } from "@/src/domain/run/bridge-writers";
import { applyRunTransition } from "@/src/domain/run/transitions";
import { applyTicketTransition } from "@/src/domain/ticket/mutations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENGINE_ACTOR = "Engine";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bridge = await bridgeFromRequest(req);
  if (!bridge) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const body = parseBridgeTransition(await req.json().catch(() => null));
  if (!body) return new Response("Bad transition body", { status: 400 });

  const [run] = await db
    .select({ id: runs.id, ticketId: runs.ticketId, lane: runs.lane })
    .from(runs)
    .where(eq(runs.id, id))
    .limit(1);
  if (!run) return new Response("Not found", { status: 404 });

  const ownerTicket = run.lane === "owner" ? run.ticketId : null;

  switch (body.to) {
    case "needs-input": {
      const result = await applyRunTransition({
        runId: run.id,
        from: "running",
        to: "needs-input",
        actor: ENGINE_ACTOR,
        question: body.question,
      });
      if (!result.ok) return Response.json({ ok: false, reason: result.reason }, { status: 409 });
      return Response.json({ ok: true });
    }
    case "review-ready": {
      const result = await completeRun({ runId: run.id, diffStats: body.diffStats });
      if (!result.ok) return Response.json({ ok: false, reason: result.reason }, { status: 409 });
      if (ownerTicket) {
        await applyTicketTransition({
          ticketId: ownerTicket,
          from: "in-progress",
          to: "review-ready",
          actor: ENGINE_ACTOR,
        });
      }
      return Response.json({ ok: true });
    }
    case "failed": {
      const result = await failRun({
        runId: run.id,
        failureKind: body.failureKind,
        failureDetail: body.failureDetail ?? undefined,
      });
      if (!result.ok) return Response.json({ ok: false, reason: result.reason }, { status: 409 });
      if (ownerTicket) {
        await applyTicketTransition({
          ticketId: ownerTicket,
          from: "in-progress",
          to: "failed",
          actor: ENGINE_ACTOR,
        });
      }
      return Response.json({ ok: true });
    }
    case "cancelled": {
      // the needs-input orphan path ONLY (bridge-writers.ts note): a
      // restarted daemon can't legally fail a needs-input run, so it
      // cancels it — the question died with the Engine session.
      const result = await applyRunTransition({
        runId: run.id,
        from: "needs-input",
        to: "cancelled",
        actor: ENGINE_ACTOR,
      });
      if (!result.ok) return Response.json({ ok: false, reason: result.reason }, { status: 409 });
      if (ownerTicket) {
        await applyTicketTransition({
          ticketId: ownerTicket,
          from: "in-progress",
          to: "approved",
          actor: ENGINE_ACTOR,
          note: "Run cancelled — the Bridge restarted under it",
        });
      }
      return Response.json({ ok: true });
    }
  }
}
