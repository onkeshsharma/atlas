"use server";
/**
 * M11 — Members-page actions (M; PRD #37–#38). Writers live in
 * src/domain/people/roster.ts + src/domain/auth/invites.ts (THE OUTBOX
 * RULE there); these resolve the Owner, validate per §2.13, and
 * revalidate. The invite action RETURNS the magic link — delivery is
 * the Notifier's (M13); the link renders show-once (M5's honest copy).
 */
import { revalidatePath } from "next/cache";

import { requireOwner } from "@/src/domain/auth/guard";
import { issueInvite, revokeInvite } from "@/src/domain/auth/invites";
import { addProjectMember, removeProjectMember } from "@/src/domain/people/roster";

export type InviteFormState = {
  magicLink?: string;
  email?: string;
  fieldError?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendInviteAction(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const user = await requireOwner();
  const email = String(formData.get("email") ?? "").trim();
  const welcomeNote = String(formData.get("welcomeNote") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!email) return { fieldError: "an email is required" };
  if (!EMAIL_RE.test(email)) return { fieldError: "that doesn't read as an email" };
  const { magicLink, invite } = await issueInvite({
    email,
    invitedBy: user.id,
    welcomeNote: welcomeNote || undefined,
    projectId: projectId || undefined,
    actor: "you",
  });
  revalidatePath(`/projects/${slug}/members`);
  return { magicLink, email: invite.email };
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  await requireOwner();
  await revokeInvite({ inviteId: String(formData.get("inviteId") ?? ""), actor: "you" });
  revalidatePath(`/projects/${String(formData.get("slug") ?? "")}/members`);
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  await requireOwner();
  await removeProjectMember({
    projectId: String(formData.get("projectId") ?? ""),
    userId: String(formData.get("userId") ?? ""),
    actor: "you",
  });
  revalidatePath(`/projects/${String(formData.get("slug") ?? "")}/members`);
}

export async function addMemberAction(formData: FormData): Promise<void> {
  const user = await requireOwner();
  await addProjectMember({
    projectId: String(formData.get("projectId") ?? ""),
    userId: String(formData.get("userId") ?? ""),
    addedBy: user.id,
    actor: "you",
  });
  revalidatePath(`/projects/${String(formData.get("slug") ?? "")}/members`);
}
