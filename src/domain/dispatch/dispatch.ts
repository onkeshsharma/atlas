/**
 * M9 — the dispatch entry point behind the detail page's CTA (PRD #19).
 *
 * Two-step by design — "the Owner edits before dispatch" (charter §6):
 *
 *   1. No Brief yet → queue the draft-brief Helper Run and return
 *      `brief-queued`; the page live-updates when the Brief lands.
 *   2. Brief exists → finalize it + create the Owner Run + drive the
 *      Ticket approved → in-progress (src/domain/dispatch/mutations.ts).
 *
 * Session A confirms the drafted Brief with the second click; Session B's
 * W composer adds the editing surface between the two steps.
 */
import { db } from "@/src/db/client";
import { tickets } from "@/src/db/schema";
import { eq } from "drizzle-orm";

import { latestBriefForTicket } from "./queries";
import { dispatchTicket, enqueueHelperRun } from "./mutations";

export type BeginDispatchResult =
  | { ok: true; phase: "brief-queued"; runRef: string }
  | { ok: true; phase: "dispatched"; runRef: string }
  | { ok: false; reason: "not-found" | "not-approved" | "brief-pending" };

export async function beginDispatch(input: {
  ticketId: string;
  actor: string;
}): Promise<BeginDispatchResult> {
  const [ticket] = await db
    .select({
      id: tickets.id,
      ref: tickets.ref,
      title: tickets.title,
      state: tickets.state,
      projectId: tickets.projectId,
    })
    .from(tickets)
    .where(eq(tickets.id, input.ticketId))
    .limit(1);
  if (!ticket) return { ok: false, reason: "not-found" };
  if (ticket.state !== "approved") return { ok: false, reason: "not-approved" };

  const brief = await latestBriefForTicket(ticket.id);
  if (!brief) {
    const queued = await enqueueHelperRun({
      projectId: ticket.projectId,
      ticketId: ticket.id,
      helperKind: "draft-brief",
      title: `Draft Brief for ${ticket.ref}`,
      actor: input.actor,
    });
    if (!queued.ok) return { ok: false, reason: "brief-pending" };
    return { ok: true, phase: "brief-queued", runRef: queued.ref };
  }

  const dispatched = await dispatchTicket({
    ticketId: ticket.id,
    briefId: brief.id,
    actor: input.actor,
  });
  if (!dispatched.ok) {
    return {
      ok: false,
      reason: dispatched.reason === "no-brief" ? "not-approved" : "not-approved",
    };
  }
  return { ok: true, phase: "dispatched", runRef: dispatched.ref };
}
