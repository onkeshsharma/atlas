"use server";
/**
 * M5 — sign-up actions. Two real paths:
 *  - Owner bootstrap: requires the ATLAS_OWNER_CODE secret AND no
 *    standing Owner (exactly one Owner — PRD); lands on /welcome.
 *  - Collaborator via invite magic link (?invite=<token>): the invite is
 *    re-validated server-side, its email is authoritative, acceptance is
 *    claimed atomically; lands on /onboarding.
 * All failures render as canon §2.13 validation states.
 */
import { redirect } from "next/navigation";

import { acceptInvite, validateInvite } from "@/src/domain/auth/invites";
import {
  ensureMembership,
  OwnerExistsError,
  ownerExists,
  verifyOwnerCode,
} from "@/src/domain/auth/memberships";
import { auth } from "@/src/domain/auth/server";

export type SignUpState = {
  fieldErrors?: {
    name?: string;
    email?: string;
    password?: string;
    code?: string;
  };
  formError?: string;
};

const INVITE_REASON_COPY: Record<string, string> = {
  "not-found": "this invite link isn't valid",
  expired: "this invite has expired — ask for a fresh one",
  revoked: "this invite was revoked",
  declined: "this invite was declined",
  accepted: "this invite was already used — sign in instead",
};

export async function signUpWithEmail(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const inviteToken = String(formData.get("invite") ?? "").trim();
  const isInviteFlow = inviteToken.length > 0;

  const fieldErrors: NonNullable<SignUpState["fieldErrors"]> = {};
  if (!name) fieldErrors.name = "enter the name collaborators will see";
  if (password.length < 8) fieldErrors.password = "at least 8 characters";

  let email: string;
  if (isInviteFlow) {
    const validated = await validateInvite(inviteToken);
    if (!validated.ok) {
      return { fieldErrors, formError: INVITE_REASON_COPY[validated.reason] };
    }
    email = validated.invite.email; // the invite's email is authoritative
  } else {
    email = String(formData.get("email") ?? "").trim();
    const code = String(formData.get("code") ?? "");
    if (!email) fieldErrors.email = "enter your email";
    if (!verifyOwnerCode(code)) {
      fieldErrors.code = "that owner code isn't right";
    } else if (await ownerExists()) {
      fieldErrors.code = "this atlas already has its owner — sign in instead";
    }
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { data, error } = await auth.signUp.email({ email, name, password });
  if (error || !data?.user) {
    const message = (error?.message ?? "").toLowerCase();
    if (message.includes("exist")) {
      // REAL taken-email path → §2.13 error on the email field.
      return { fieldErrors: { email: "that email already has an account" } };
    }
    if (message.includes("password")) {
      return { fieldErrors: { password: error?.message?.toLowerCase() ?? "weak password" } };
    }
    return { formError: error?.message?.toLowerCase() ?? "could not create the account" };
  }

  if (isInviteFlow) {
    const accepted = await acceptInvite({
      token: inviteToken,
      userId: data.user.id,
      displayName: name,
    });
    if (!accepted.ok) {
      return { formError: INVITE_REASON_COPY[accepted.reason] };
    }
    redirect("/onboarding");
  }

  try {
    await ensureMembership({ userId: data.user.id, role: "owner", displayName: name });
  } catch (e) {
    if (e instanceof OwnerExistsError) {
      // lost the bootstrap race at the very last step.
      return { fieldErrors: { code: "this atlas already has its owner — sign in instead" } };
    }
    throw e;
  }
  redirect("/welcome");
}
