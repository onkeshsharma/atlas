"use server";
/**
 * Athena activity actions (ADR-0007 §7) — prune a learned precedent from
 * decision memory. proxy.ts guards GET/HEAD only; re-guard via the domain.
 */
import { revalidatePath } from "next/cache";

import { requireOwner } from "@/src/domain/auth/guard";
import { pruneMemory } from "@/src/domain/athena/memory";

export async function pruneMemoryAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await pruneMemory(id);
  revalidatePath("/settings/athena");
}
