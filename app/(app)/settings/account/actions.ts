"use server";
/**
 * M10 — Account actions (BB; PRD #40–#41). Sessions and password ride
 * the hosted Neon Auth server; deletion is the honest Atlas-forgets-you
 * teardown (src/domain/auth/delete-account.ts).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/src/domain/auth/server";
import {
  changePassword,
  revokeOtherSessions,
  revokeSession,
} from "@/src/domain/auth/account";
import { deleteAccount } from "@/src/domain/auth/delete-account";
import { requireOwner, requireUser } from "@/src/domain/auth/guard";
import { updateDisplayName } from "@/src/domain/auth/profile";

export type DisplayNameState = { saved?: boolean; fieldError?: string };

export async function updateDisplayNameAction(
  _prev: DisplayNameState,
  formData: FormData,
): Promise<DisplayNameState> {
  const user = await requireUser();
  const result = await updateDisplayName(user.id, String(formData.get("displayName") ?? ""));
  if (!result.ok) return { fieldError: result.message };
  revalidatePath("/settings/account");
  revalidatePath("/", "layout");
  return { saved: true };
}

export type PasswordState = { saved?: boolean; fieldError?: string };

export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  await requireUser();
  const result = await changePassword({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
  });
  if (!result.ok) return { fieldError: result.message };
  return { saved: true };
}

export async function revokeSessionAction(formData: FormData): Promise<void> {
  await requireUser();
  const token = String(formData.get("token") ?? "");
  if (!token) return;
  await revokeSession(token);
  revalidatePath("/settings/account");
}

export async function revokeOtherSessionsAction(): Promise<void> {
  await requireUser();
  await revokeOtherSessions();
  revalidatePath("/settings/account");
}

/** the JJ-recipe confirm posts here AFTER the type-to-confirm arms. */
export async function deleteAccountAction(): Promise<void> {
  const user = await requireOwner();
  await deleteAccount(user.id);
  await revokeOtherSessions().catch(() => {});
  await auth.signOut();
  redirect("/sign-in");
}
