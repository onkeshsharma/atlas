"use server";
/**
 * M17 — Activity Monitor steering actions.
 *
 * Cancel reuses M9's cancel path: executeLiveCommand writes the
 * feed_events row (THE OUTBOX RULE — ADR-0002 §2) so the Bridge sees
 * the cancel command on the same cursor it reads for all steering.
 */
import { revalidatePath } from "next/cache";

import { requireOwner } from "@/src/domain/auth/guard";
import { executeLiveCommand } from "@/src/domain/live/executors";

export async function cancelRunAction(formData: FormData): Promise<void> {
  await requireOwner();

  const runId = String(formData.get("runId") ?? "");
  if (!runId) return;

  await executeLiveCommand({ type: "cancel-run", runId }, "you");
  revalidatePath("/activity");
}
