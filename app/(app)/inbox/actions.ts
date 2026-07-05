"use server";
/**
 * M6 — inbox actions. proxy.ts guards GET/HEAD only (M5 SDK quirk), so
 * the action re-guards through the domain helpers itself.
 *
 * M13 — role-routed: the Owner keeps M6's instance-level mark (one
 * Owner, one inbox); Collaborators move their OWN high-water mark
 * (per-user read state — charter item 1). Before M13 a Collaborator
 * invoking this action would have flipped the Owner's read state.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOwner, requireUser } from "@/src/domain/auth/guard";
import { markAllReadFor } from "@/src/domain/collab/read-marks";
import { sendBackToEngine } from "@/src/domain/dispatch/send-back";
import { markAllRead } from "@/src/domain/feed/queries";
import { latestCursor } from "@/src/domain/live/broker";
import { executeLiveCommand } from "@/src/domain/live/executors";
import { requestShipRun } from "@/src/domain/run/bridge-writers";

/** Z:165 "mark all read" — the glyph is `→` per canon §3.6 (stays in Atlas). */
export async function markAllReadAction(): Promise<void> {
  const user = await requireUser();
  if (!user.role) redirect("/no-access");
  if (user.role === "collaborator") {
    await markAllReadFor(user.id, await latestCursor());
  } else {
    await markAllRead();
  }
  revalidatePath("/inbox");
  revalidatePath("/today");
}

/**
 * Phase 1 — the Agent Inbox's inline actions. Same domain paths the Run
 * detail / Today use (Atlas-first steering), re-guarded through requireOwner
 * (proxy.ts guards GET/HEAD only), so the Owner acts on a Question or a Review
 * from the Inbox without navigating. Raced/illegal moves lose cleanly inside
 * the executor / the IS NULL ship claim.
 */
export async function answerRunAction(formData: FormData): Promise<void> {
  await requireOwner();
  const runId = String(formData.get("runId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const choice = String(formData.get("choice") ?? "").trim();
  if (!runId || (!text && !choice)) return;
  await executeLiveCommand(
    {
      type: "answer-run",
      runId,
      answer: {
        ...(text ? { text } : {}),
        ...(choice ? { choice } : {}),
        answeredBy: "you",
        answeredAt: new Date().toISOString(),
      },
    },
    "you",
  );
  revalidatePath("/inbox");
  revalidatePath("/today");
}

export async function approveShipAction(formData: FormData): Promise<void> {
  await requireOwner();
  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;
  await requestShipRun({ runId, actor: "you" });
  revalidatePath("/inbox");
  revalidatePath("/today");
}

export async function sendBackAction(formData: FormData): Promise<void> {
  await requireOwner();
  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;
  await sendBackToEngine({ runId, actor: "you" });
  revalidatePath("/inbox");
  revalidatePath("/today");
}
