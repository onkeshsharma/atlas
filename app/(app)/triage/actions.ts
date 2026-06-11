"use server";
/**
 * M8 — triage decisions (variant I's four actions, PRD #12). Each is the
 * single-statement conditional state flip + `moved` outbox row
 * (applyTicketTransition — THE OUTBOX RULE). proxy.ts guards GET/HEAD
 * only (M5 SDK quirk), so every action re-guards itself.
 */
import { redirect } from "next/navigation";

import { requireOwner } from "@/src/domain/auth/guard";
import { applyTicketTransition } from "@/src/domain/ticket/mutations";
import type { TicketState } from "@/src/db/schema";

const DECISIONS: Record<string, TicketState> = {
  approve: "approved",
  backlog: "backlog",
  "needs-info": "needs-info",
  decline: "declined",
};

export async function triageDecisionAction(formData: FormData): Promise<void> {
  await requireOwner();

  const ticketId = String(formData.get("ticketId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const at = String(formData.get("at") ?? "0");
  const to = DECISIONS[decision];
  if (!ticketId || !to) redirect("/triage");

  // Concurrent double-decide loses cleanly on the WHERE state='triage'
  // claim — either way the queue at this index has moved on.
  await applyTicketTransition({ ticketId, from: "triage", to, actor: "you" });

  redirect(`/triage?i=${at}`);
}
