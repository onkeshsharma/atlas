"use server";
/**
 * M5 — sign-in actions. Error copy follows canon §2.13: one quiet
 * sentence-case message, no exclamation marks, rendered by the kit's
 * validation states — never browser alerts, never toasts.
 */
import { redirect } from "next/navigation";

import { membershipFor } from "@/src/domain/auth/memberships";
import { auth } from "@/src/domain/auth/server";

export type SignInState = {
  fieldErrors?: { email?: string; password?: string };
  formError?: string;
};

/** post-sign-in landing by role (M6: the Owner lands on the cockpit;
 * Collaborators land on the inbox — their durable "what happened" surface
 * until M13 builds the Collaborator set). */
function landingFor(role: "owner" | "collaborator" | null): string {
  if (role === "collaborator") return "/inbox";
  if (role === "owner") return "/today";
  return "/no-access";
}

export async function signInWithEmail(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: NonNullable<SignInState["fieldErrors"]> = {};
  if (!email) fieldErrors.email = "enter your email";
  if (!password) fieldErrors.password = "enter your password";
  if (fieldErrors.email || fieldErrors.password) return { fieldErrors };

  const { data, error } = await auth.signIn.email({ email, password });
  if (error || !data?.user) {
    // REAL wrong-credentials path → §2.13 form-level line.
    return { formError: "wrong email or password" };
  }
  // the fresh session cookie isn't on THIS request — resolve the role
  // from the membership of the user signIn just returned.
  const membership = await membershipFor(data.user.id);
  redirect(landingFor(membership?.role ?? null));
}

export async function signInWithGoogle(): Promise<void> {
  const callbackURL = `${(process.env.ATLAS_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/welcome`;
  const { data, error } = await auth.signIn.social({ provider: "google", callbackURL });
  if (error || !data || !("url" in data) || !data.url) {
    // provider not configured on the hosted auth server (yet) — quiet §2.13 line.
    redirect("/sign-in?error=google");
  }
  redirect(String(data.url));
}
