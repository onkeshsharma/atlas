"use server";
/**
 * M9 Session B — run-detail steering + the ship verbs.
 *
 * answer / cancel ride the SAME live-command executors as Today (the
 * Atlas-first steering path); approve-and-ship + send-back are the
 * Session B verbs (PRD #22–25). proxy.ts guards GET/HEAD only — every
 * action re-guards.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOwner } from "@/src/domain/auth/guard";
import { sendBackToEngine } from "@/src/domain/dispatch/send-back";
import { executeLiveCommand } from "@/src/domain/live/executors";
import { requestShipRun } from "@/src/domain/run/bridge-writers";

export async function answerRunAction(formData: FormData): Promise<void> {
  await requireOwner();
  const runId = String(formData.get("runId") ?? "");
  const ref = String(formData.get("ref") ?? "");
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
  if (ref) revalidatePath(`/runs/${ref}`);
}

export async function cancelRunAction(formData: FormData): Promise<void> {
  await requireOwner();
  const runId = String(formData.get("runId") ?? "");
  const ref = String(formData.get("ref") ?? "");
  if (!runId) return;
  await executeLiveCommand({ type: "cancel-run", runId }, "you");
  if (ref) revalidatePath(`/runs/${ref}`);
}

/** KK's emerald CTA (PRD #25) — durable request; the daemon lands it. */
export async function approveShipAction(formData: FormData): Promise<void> {
  await requireOwner();
  const runId = String(formData.get("runId") ?? "");
  const ref = String(formData.get("ref") ?? "");
  if (!runId) return;
  // double-clicks / raced requests lose cleanly on the IS NULL claim.
  await requestShipRun({ runId, actor: "you" });
  if (ref) revalidatePath(`/runs/${ref}/diff`);
}

/** K's one-click Conflict recovery + KK's decline (PRD #22–23). */
export async function sendBackAction(formData: FormData): Promise<void> {
  await requireOwner();
  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;
  const result = await sendBackToEngine({ runId, actor: "you" });
  if (result.ok) redirect(`/runs/${result.runRef}`);
}
