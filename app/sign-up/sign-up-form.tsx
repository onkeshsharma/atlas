"use client";
/**
 * M5 — sign-up form, ported from design/variants/variant-dd-signup.tsx:43–126
 * (fields mt-7 space-y-7 · mono Owner-code field with mono-micro hint ·
 * w-full primary CTA mt-10 · "or" divider · secondary Google CTA).
 * Kit-composed; §2.13 wired to the REAL error paths (taken email, bad
 * owner code, invalid invite token). With ?invite=<token> the code field
 * becomes the validated invite token (§2.13 success — "confirmation
 * matters, e.g. token validated") and the email locks to the invite's.
 */
import { useActionState } from "react";

import { PillButton, UnderlineInput } from "@/src/components/kit";

import { signInWithGoogle } from "../sign-in/actions";
import { signUpWithEmail, type SignUpState } from "./actions";

export type InvitePrefill = {
  token: string;
  email: string;
  invitedName: string | null;
};

export function SignUpForm({ invite }: { invite: InvitePrefill | null }) {
  const [state, formAction] = useActionState<SignUpState, FormData>(signUpWithEmail, {});

  return (
    <>
      <form action={formAction}>
        {invite && <input type="hidden" name="invite" value={invite.token} />}
        <div className="mt-7 space-y-7">
          {/* Display name (DD:50–59) */}
          <UnderlineInput
            name="name"
            type="text"
            label="Your name"
            placeholder="What Collaborators will see"
            defaultValue={invite?.invitedName ?? undefined}
            validation={state.fieldErrors?.name ? "error" : undefined}
            message={state.fieldErrors?.name}
          />

          {/* Email (DD:62–71) — locked to the invite's address in invite flow */}
          {invite ? (
            <UnderlineInput
              type="email"
              label="Email"
              validation="disabled"
              defaultValue={invite.email}
              hint="your invite is for this address"
            />
          ) : (
            <UnderlineInput
              name="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              validation={state.fieldErrors?.email ? "error" : undefined}
              message={state.fieldErrors?.email}
            />
          )}

          {/* Password (DD:73–83) */}
          <UnderlineInput
            name="password"
            type="password"
            label="Set a password"
            placeholder="At least 12 characters"
            validation={state.fieldErrors?.password ? "error" : undefined}
            message={state.fieldErrors?.password}
          />

          {/* Owner code (DD:85–106) — or the validated invite token */}
          {invite ? (
            <UnderlineInput
              type="text"
              label="Invite"
              mono
              readOnly
              defaultValue={invite.token}
              validation="success"
              message={`invite for ${invite.email}`}
            />
          ) : (
            <UnderlineInput
              name="code"
              type="text"
              label="Owner code"
              mono
              placeholder="ATLAS-OWNER-..."
              validation={state.fieldErrors?.code ? "error" : undefined}
              message={state.fieldErrors?.code}
              hint="owner codes bootstrap a new instance — joining someone's atlas? ask them for an invite"
            />
          )}
        </div>

        {/* §2.13 — form-level errors above the submit row */}
        {state.formError && (
          <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-rose-700">
            {state.formError}
          </p>
        )}

        {/* canon §2.9 (kit w-full primary + leading dot overrules DD:110's
            dotless py-3.5 — the dot-in-button rule is law for w-full primaries) */}
        <div className={state.formError ? "mt-4" : "mt-10"}>
          <PillButton kind="primary" fullWidth dot="amber" type="submit">
            Create account
          </PillButton>
        </div>
      </form>

      {/* Or sign up with — quiet alt (DD:114–121) */}
      <div className="mt-8 flex items-center gap-4">
        <span className="flex-1 h-px bg-stone-200" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
          or
        </span>
        <span className="flex-1 h-px bg-stone-200" />
      </div>

      <form action={signInWithGoogle} className="mt-6">
        {/* canon §2.9 — secondary w-full is flat and dotless (DD:123) */}
        <PillButton kind="secondary" fullWidth dot="none" arrow={false} type="submit">
          Continue with Google
        </PillButton>
      </form>
    </>
  );
}
