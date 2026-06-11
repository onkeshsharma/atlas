"use server";
/**
 * M7 — create-project action (R's "Connect repository" flow).
 * proxy.ts guards GET/HEAD only (M5 SDK quirk) — the action re-guards
 * through requireOwner itself. On success the Owner lands on the new
 * project's Ingest page, which renders the honest `queued` state
 * (charter §1: nothing can RUN an ingest until M9).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOwner } from "@/src/domain/auth/guard";
import { createProject } from "@/src/domain/project/create";

export type NewProjectState = {
  /** §2.13 — one quiet mono line under the field. */
  fieldError?: string;
};

export async function createProjectAction(
  _prev: NewProjectState,
  formData: FormData,
): Promise<NewProjectState> {
  await requireOwner();

  const source = String(formData.get("source") ?? "");
  const result = await createProject({ source, actor: "you" });

  if (!result.ok) {
    return { fieldError: result.error };
  }

  revalidatePath("/projects");
  revalidatePath("/today");
  redirect(`/projects/${result.project.slug}/ingest`);
}
