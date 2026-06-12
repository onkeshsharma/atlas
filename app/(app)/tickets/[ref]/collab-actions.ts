"use server";
/**
 * M13 — the Collaborator reply action (PRD #47). proxy.ts guards
 * GET/HEAD only (M5 SDK quirk), so the action re-guards itself — role
 * AND project scope (THE GUARD via collabTicketByRef → projectAccessFor;
 * an off-roster POST dies before any write).
 */
import { redirect } from "next/navigation";

import { requireCollaborator } from "@/src/domain/auth/guard";
import { collabTicketByRef } from "@/src/domain/collab/queries";
import { replyOnTicket } from "@/src/domain/collab/replies";

export async function replyAction(formData: FormData): Promise<void> {
  const user = await requireCollaborator();
  const ref = String(formData.get("ref") ?? "");
  const text = String(formData.get("text") ?? "").trim();

  const detail = await collabTicketByRef(ref, user.id);
  if (!detail) redirect("/tickets"); // off-roster / unknown — nothing to reply on

  if (!text) redirect(`/tickets/${detail.ticket.ref}?error=reply`);

  // actor = the email — matches the M8 reporter convention so the
  // thread/list queries can tell "yours" from the Owner's lines.
  await replyOnTicket({ ticketId: detail.ticket.id, actor: user.email, text });
  redirect(`/tickets/${detail.ticket.ref}`);
}
