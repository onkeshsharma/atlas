"use server";
/**
 * M5 — onboarding step 03: the Collaborator's display name / handle /
 * initial, persisted on their membership (SS:166–198).
 */
import { requireCollaborator } from "@/src/domain/auth/guard";
import { updateMembershipProfile } from "@/src/domain/auth/memberships";

export type ProfileState = {
  fieldErrors?: { displayName?: string; handle?: string };
  saved?: boolean;
};

export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireCollaborator();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const handle = String(formData.get("handle") ?? "").trim();
  const initial = String(formData.get("initial") ?? "").trim();

  const fieldErrors: NonNullable<ProfileState["fieldErrors"]> = {};
  if (!displayName) fieldErrors.displayName = "enter a display name";
  if (handle && !/^@?[a-z0-9-]+$/i.test(handle)) {
    fieldErrors.handle = "letters, numbers, and hyphens only";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  await updateMembershipProfile({
    userId: user.id,
    displayName,
    handle: handle ? (handle.startsWith("@") ? handle : `@${handle}`) : null,
    initial: initial || displayName.slice(0, 1),
  });
  return { saved: true };
}
