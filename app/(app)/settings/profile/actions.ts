"use server";
/**
 * M10 — Profile field actions (QQ; charter item 8). Validation +
 * writes live in src/domain/auth/profile.ts; messages render in the
 * §2.13 error shape on the field rows.
 */
import { revalidatePath } from "next/cache";

import { requireUser } from "@/src/domain/auth/guard";
import {
  updateDisplayName,
  updateHandle,
  updateInitial,
} from "@/src/domain/auth/profile";

export type ProfileFieldKey = "displayName" | "initial" | "handle";

export type FieldState = { saved?: boolean; fieldError?: string };

export async function updateProfileFieldAction(
  _prev: FieldState,
  formData: FormData,
): Promise<FieldState> {
  const user = await requireUser();
  const field = String(formData.get("field") ?? "") as ProfileFieldKey;
  const value = String(formData.get("value") ?? "");
  const result =
    field === "displayName"
      ? await updateDisplayName(user.id, value)
      : field === "initial"
        ? await updateInitial(user.id, value)
        : field === "handle"
          ? await updateHandle(user.id, value)
          : ({ ok: false, message: "unknown field" } as const);
  if (!result.ok) return { fieldError: result.message };
  revalidatePath("/settings/profile");
  revalidatePath("/", "layout"); // the sidebar mark may change
  return { saved: true };
}
