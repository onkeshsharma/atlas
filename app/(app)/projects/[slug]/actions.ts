"use server";
/**
 * M7 — project-landing + context-viewer actions. proxy.ts guards
 * GET/HEAD only (M5 SDK quirk) — every action re-guards itself.
 * All writes are single-statement update+outbox (the M6 outbox law);
 * open cockpits notice through the live seam, revalidatePath covers
 * the acting tab.
 */
import { revalidatePath } from "next/cache";

import { requireOwner } from "@/src/domain/auth/guard";
import {
  confirmSuggestedTerm,
  dismissSuggestedTerm,
} from "@/src/domain/project/context";
import { setProjectPinned } from "@/src/domain/project/pin";

function revalidateProject(slug: string): void {
  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/projects/${slug}/context`);
  revalidatePath("/projects");
  revalidatePath("/today");
}

/** PRD #32 — pin/unpin curation; Today's pinned strip reads it (M6 queries). */
export async function setPinnedAction(formData: FormData): Promise<void> {
  await requireOwner();
  const projectId = String(formData.get("projectId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const pinned = formData.get("pinned") === "true";
  await setProjectPinned({ projectId, pinned, actor: "you" });
  revalidateProject(slug);
}

/** P:242 "add →" — suggested term joins the Language section. */
export async function confirmTermAction(formData: FormData): Promise<void> {
  await requireOwner();
  const termId = String(formData.get("termId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  await confirmSuggestedTerm({ termId, actor: "you" });
  revalidateProject(slug);
}

/** P:245 "dismiss ✕" — the suggestion is removed. */
export async function dismissTermAction(formData: FormData): Promise<void> {
  await requireOwner();
  const termId = String(formData.get("termId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  await dismissSuggestedTerm({ termId, actor: "you" });
  revalidateProject(slug);
}
