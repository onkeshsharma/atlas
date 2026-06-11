"use server";
/**
 * M8 — ticket-detail actions: the OWNER_MOVES quiet move links (PRD #14)
 * and blocks/blocked-by edge declaration (PRD #16). Both write through
 * the single-statement mutation + outbox helpers (THE OUTBOX RULE);
 * both re-guard (proxy.ts is GET/HEAD-only).
 */
import { revalidatePath } from "next/cache";

import { requireOwner } from "@/src/domain/auth/guard";
import { isTicketState } from "@/src/domain/ticket/states";
import { addTicketLink, applyTicketTransition } from "@/src/domain/ticket/mutations";

export async function moveTicketAction(formData: FormData): Promise<void> {
  await requireOwner();

  const ticketId = String(formData.get("ticketId") ?? "");
  const ref = String(formData.get("ref") ?? "");
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  if (!ticketId || !isTicketState(from) || !isTicketState(to)) return;

  // Illegal/raced moves lose cleanly inside the helper (conditional claim).
  await applyTicketTransition({ ticketId, from, to, actor: "you" });
  revalidatePath(`/tickets/${ref}`);
  revalidatePath("/board");
}

export type AddLinkState = { error?: string };

const LINK_ERRORS: Record<string, string> = {
  "unknown-ref": "no ticket with that ref",
  "self-link": "a ticket can't block itself",
  duplicate: "that edge is already declared",
};

export async function addLinkAction(
  _prev: AddLinkState,
  formData: FormData,
): Promise<AddLinkState> {
  await requireOwner();

  const ticketId = String(formData.get("ticketId") ?? "");
  const ref = String(formData.get("ref") ?? "");
  const otherRef = String(formData.get("otherRef") ?? "").trim();
  const direction = String(formData.get("direction") ?? "blocked-by");
  if (!ticketId || !otherRef) return { error: "give it a ticket ref" };

  const result = await addTicketLink({
    ticketId,
    otherRef,
    direction: direction === "blocks" ? "blocks" : "blocked-by",
    actor: "you",
  });
  if (!result.ok) return { error: LINK_ERRORS[result.reason] ?? "could not add that edge" };

  revalidatePath(`/tickets/${ref}`);
  revalidatePath("/board");
  return {};
}
