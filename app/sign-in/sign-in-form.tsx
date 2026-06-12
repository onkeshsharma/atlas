"use client";
/**
 * M5 — sign-in form, ported from design/variants/variant-l-signin.tsx:43–96
 * (fields mt-7 space-y-7 · w-full primary CTA mt-10 · "or" divider mt-8 ·
 * secondary Google CTA mt-6). Composed from the kit only; §2.13 states wired
 * to the REAL Neon Auth error paths.
 */
import Link from "next/link";
import { useActionState } from "react";

import { PillButton, UnderlineInput } from "@/src/components/kit";

import { signInWithEmail, signInWithGoogle, type SignInState } from "./actions";

export function SignInForm({
  forgotHint = false,
  googleError = false,
}: {
  /** "forgot? →" was clicked. M13 copy-truth sweep: the Notifier shipped
   *  (ship/digest email) WITHOUT a reset flow — reset needs its own Neon
   *  Auth wiring, so the hint no longer ties itself to email delivery. */
  forgotHint?: boolean;
  /** the Google social flow bounced (provider not configured). */
  googleError?: boolean;
}) {
  const [state, formAction] = useActionState<SignInState, FormData>(signInWithEmail, {});

  return (
    <>
      <form action={formAction}>
        <div className="mt-7 space-y-7">
          <UnderlineInput
            name="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            validation={state.fieldErrors?.email ? "error" : undefined}
            message={state.fieldErrors?.email}
          />
          <UnderlineInput
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            labelAction={
              <Link
                href="/sign-in?forgot=1"
                className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
              >
                forgot? →
              </Link>
            }
            validation={state.fieldErrors?.password ? "error" : undefined}
            message={state.fieldErrors?.password}
            hint={
              forgotHint
                ? "password reset isn't wired yet — ask the Owner to re-invite you"
                : undefined
            }
          />
        </div>

        {/* §2.13 — form-level errors use the same quiet line above the submit row. */}
        {state.formError && (
          <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-rose-700">
            {state.formError}
          </p>
        )}

        {/* canon §2.9 (kit w-full primary py-3 + leading dot overrules L:80's
            dotless py-3.5 — the dot-in-button rule is law for w-full primaries) */}
        <div className={state.formError ? "mt-4" : "mt-10"}>
          <PillButton kind="primary" fullWidth dot="amber" type="submit">
            Sign in
          </PillButton>
        </div>
      </form>

      {/* Or sign in with — quiet alt (L:85–91) */}
      <div className="mt-8 flex items-center gap-4">
        <span className="flex-1 h-px bg-stone-200" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
          or
        </span>
        <span className="flex-1 h-px bg-stone-200" />
      </div>

      <form action={signInWithGoogle} className="mt-6">
        {/* canon §2.9 — secondary w-full is flat and dotless (L:93) */}
        <PillButton kind="secondary" fullWidth dot="none" arrow={false} type="submit">
          Continue with Google
        </PillButton>
        {googleError && (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-rose-700">
            google sign-in isn&rsquo;t configured for this instance yet
          </p>
        )}
      </form>
    </>
  );
}
