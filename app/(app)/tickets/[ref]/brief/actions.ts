"use server";
/**
 * M9 Session B — W composer actions: autosave, draft-with-Engine, and
 * the dispatch that consumes the edited Brief (PRD #19).
 */
import { redirect } from "next/navigation";

import { requireOwner } from "@/src/domain/auth/guard";
import { saveOwnerBriefDraft } from "@/src/domain/dispatch/brief-edit";
import { dispatchTicket, enqueueHelperRun } from "@/src/domain/dispatch/mutations";

export type SaveBriefState =
  | { ok: true; briefId: string; savedAt: string }
  | { ok: false; reason: string };

/** the editor's debounced autosave (and save-&-close). */
export async function saveBriefAction(input: {
  ticketId: string;
  briefId: string | null;
  body: string;
}): Promise<SaveBriefState> {
  await requireOwner();
  const saved = await saveOwnerBriefDraft({
    ticketId: input.ticketId,
    briefId: input.briefId,
    body: input.body,
  });
  if (!saved.ok) return { ok: false, reason: saved.reason };
  return { ok: true, briefId: saved.briefId, savedAt: new Date().toISOString() };
}

export type DispatchBriefState = { ok: false; reason: string };

/**
 * Save the editor state, finalize it, create the Owner Run — then land
 * on the live run page (W's whole point: edit → dispatch → watch).
 */
export async function dispatchBriefAction(input: {
  ticketId: string;
  briefId: string | null;
  body: string;
}): Promise<DispatchBriefState> {
  await requireOwner();
  const saved = await saveOwnerBriefDraft({
    ticketId: input.ticketId,
    briefId: input.briefId,
    body: input.body,
  });
  if (!saved.ok) return { ok: false, reason: saved.reason };
  const dispatched = await dispatchTicket({
    ticketId: input.ticketId,
    briefId: saved.briefId,
    actor: "you",
  });
  if (!dispatched.ok) return { ok: false, reason: dispatched.reason };
  redirect(`/runs/${dispatched.ref}`);
}

/** W's "draft with the Engine" when no draft exists yet (re-uses the
 * dispatch pipeline's Helper guard — double-queues are clean no-ops). */
export async function queueBriefDraftAction(formData: FormData): Promise<void> {
  await requireOwner();
  const ticketId = String(formData.get("ticketId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const ticketRef = String(formData.get("ticketRef") ?? "");
  if (!ticketId || !projectId) return;
  await enqueueHelperRun({
    projectId,
    ticketId,
    helperKind: "draft-brief",
    title: `Draft Brief for ${ticketRef}`,
    actor: "you",
  });
}
