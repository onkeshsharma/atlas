"use server";
/**
 * M8 — file-a-ticket action (S:169–177). proxy.ts guards GET/HEAD only
 * (M5 SDK quirk), so the action re-guards itself. The write is the
 * single-statement ticket INSERT + `filed` outbox row (THE OUTBOX RULE)
 * in src/domain/ticket/mutations.ts.
 */
import { redirect } from "next/navigation";

import { requireUser } from "@/src/domain/auth/guard";
import { enqueueHelperRun } from "@/src/domain/dispatch/mutations";
import { fileTicket } from "@/src/domain/ticket/mutations";

const KINDS = ["bug", "enhancement", "other"] as const;
const PRIORITIES = ["whenever", "soon", "today", "broken-now"] as const;

export async function fileTicketAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "");
  const priorityRaw = String(formData.get("priority") ?? "");

  if (!title || !projectId) {
    redirect("/tickets/new?error=title");
  }

  const kind = (KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as (typeof KINDS)[number])
    : null;
  const priority = (PRIORITIES as readonly string[]).includes(priorityRaw)
    ? (priorityRaw as (typeof PRIORITIES)[number])
    : "whenever";

  // the Owner files as "you" (the feed's first-person actor — E:274);
  // Collaborator filing keeps their address (M13 re-derives the surface).
  const reporter = user.role === "owner" ? "you" : (user.email ?? "collaborator");

  const result = await fileTicket({ projectId, title, body, kind, priority, reporter });
  if (!result.ok) redirect("/tickets/new?error=title");

  // M9 — Helper Runs enrich new Tickets automatically (PRD #17). The
  // helper lane always yields to Owner Runs; the run queues even with
  // no Bridge connected (PRD #35) and the guard makes re-files no-ops.
  await enqueueHelperRun({
    projectId,
    ticketId: result.id,
    helperKind: "enrich-ticket",
    title: `Enrich ${result.ref}`,
    actor: "atlas",
  });

  redirect(`/tickets/${result.ref}`);
}
