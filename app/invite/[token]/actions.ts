"use server";
/**
 * M5 — invite-page actions. Accepting routes to the account step
 * (/sign-up?invite=<token>); the invite itself is claimed atomically when
 * the account is created. Declining marks the row invitee-side (U:156).
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { declineInvite } from "@/src/domain/auth/invites";

export async function acceptInviteAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  redirect(`/sign-up?invite=${encodeURIComponent(token)}`);
}

export async function declineInviteAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  await declineInvite(token);
  revalidatePath(`/invite/${token}`);
  redirect(`/invite/${encodeURIComponent(token)}`);
}
