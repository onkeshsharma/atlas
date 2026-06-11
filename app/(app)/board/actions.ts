"use server";
/**
 * M9 Session B — the board cluster's "Ship N →" made real (PRD #26;
 * the M8 honest-disabled CTA closed). One click = one durable ship
 * request per review-ready run in the parallel-safe group — the same
 * requestShipRun the KK CTA uses; the daemon lands them from their
 * kept worktrees. Raced/duplicate requests lose cleanly on the
 * IS NULL claims.
 */
import { revalidatePath } from "next/cache";

import { requireOwner } from "@/src/domain/auth/guard";
import { requestShipRun } from "@/src/domain/run/bridge-writers";
import { reviewReadyRunsForTickets } from "@/src/domain/run/queries";

export async function shipClusterAction(formData: FormData): Promise<void> {
  await requireOwner();

  const ticketIds = String(formData.get("ticketIds") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!ticketIds.length) return;

  const runByTicket = await reviewReadyRunsForTickets(ticketIds);
  for (const { runId } of runByTicket.values()) {
    await requestShipRun({ runId, actor: "you" });
  }
  revalidatePath("/board");
}
