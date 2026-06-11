"use server";
/**
 * M9 — Today's steering actions: answer + cancel, the v2.0 steering set
 * (PRD #3, #4). The ONE sanctioned Today touch (charter §8; M6
 * deviation 7 waited for exactly this). Both go through the
 * live-command executors (src/domain/live/executors.ts) — Atlas-first
 * steering: the row flips here, the open cockpit refreshes via
 * ADR-0001, the Bridge gets the same outbox row as its command
 * (ADR-0002 §2). proxy.ts guards GET/HEAD only — actions re-guard.
 */
import { revalidatePath } from "next/cache";

import { requireOwner } from "@/src/domain/auth/guard";
import { executeLiveCommand } from "@/src/domain/live/executors";

export async function answerRunAction(formData: FormData): Promise<void> {
  await requireOwner();

  const runId = String(formData.get("runId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const choice = String(formData.get("choice") ?? "").trim();
  if (!runId || (!text && !choice)) return;

  // raced/illegal answers lose cleanly inside the executor (conditional claim).
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
  revalidatePath("/today");
}

export async function cancelRunAction(formData: FormData): Promise<void> {
  await requireOwner();

  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;

  await executeLiveCommand({ type: "cancel-run", runId }, "you");
  revalidatePath("/today");
}
