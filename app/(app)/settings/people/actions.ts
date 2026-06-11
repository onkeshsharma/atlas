"use server";
/**
 * M11 — Trust-circle actions (WW; PRD #38–#39). Writers live in
 * src/domain/people/roster.ts + src/domain/auth/invites.ts (THE OUTBOX
 * RULE there). Revoking access is instance-level — the person, not a
 * project (the two-table rule; WW:309's footer states the semantics).
 */
import { revalidatePath } from "next/cache";

import { requireOwner } from "@/src/domain/auth/guard";
import { issueInvite, revokeInvite } from "@/src/domain/auth/invites";
import { revokeInstanceAccess } from "@/src/domain/people/roster";

export type CircleInviteState = {
  magicLink?: string;
  email?: string;
  fieldError?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendCircleInviteAction(
  _prev: CircleInviteState,
  formData: FormData,
): Promise<CircleInviteState> {
  const user = await requireOwner();
  const email = String(formData.get("email") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "");
  if (!email) return { fieldError: "an email is required" };
  if (!EMAIL_RE.test(email)) return { fieldError: "that doesn't read as an email" };
  const { magicLink, invite } = await issueInvite({
    email,
    invitedBy: user.id,
    projectId: projectId || undefined,
    actor: "you",
  });
  revalidatePath("/settings/people");
  return { magicLink, email: invite.email };
}

export async function cancelInviteAction(formData: FormData): Promise<void> {
  await requireOwner();
  await revokeInvite({ inviteId: String(formData.get("inviteId") ?? ""), actor: "you" });
  revalidatePath("/settings/people");
}

export async function revokeAccessAction(formData: FormData): Promise<void> {
  await requireOwner();
  await revokeInstanceAccess({ userId: String(formData.get("userId") ?? ""), actor: "you" });
  revalidatePath("/settings/people");
}
