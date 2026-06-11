"use client";
/**
 * M10 — Account page client pieces (BB): the display-name save form
 * (BB:168–179), the expandable real password change (BB:204–216 — the
 * change → ghost opens a §2.13 two-field form against the live Neon
 * Auth changePassword endpoint), and the danger zone's type-to-confirm
 * (BB:329–343 opener + the §2.11 DeleteConfirm recipe — JJ's full page
 * port is M15's; this composes the kit ModalShell per charter item 6).
 */
import { useState } from "react";
import { useActionState, useTransition } from "react";

import {
  DeleteConfirm,
  ModalShell,
  PillButton,
  UnderlineInput,
} from "@/src/components/kit";

import {
  changePasswordAction,
  deleteAccountAction,
  updateDisplayNameAction,
  type DisplayNameState,
  type PasswordState,
} from "./actions";

export function DisplayNameForm({ displayName }: { displayName: string }) {
  const [state, formAction] = useActionState<DisplayNameState, FormData>(
    updateDisplayNameAction,
    {},
  );
  return (
    <form action={formAction} className="mt-8 space-y-7">
      <UnderlineInput
        name="displayName"
        type="text"
        label="Display name"
        defaultValue={displayName}
        validation={state.fieldError ? "error" : undefined}
        message={state.fieldError}
      />
      <div className="flex items-center gap-4">
        <PillButton kind="primary" size="sm" type="submit">
          Save →
        </PillButton>
        {state.saved && !state.fieldError && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
            ✓ saved
          </span>
        )}
      </div>
    </form>
  );
}

export function PasswordRow() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<PasswordState, FormData>(changePasswordAction, {});

  return (
    <li className="py-4">
      <div className="flex items-baseline justify-between group">
        <span>
          <span className="block text-base text-stone-900 font-medium">Password</span>
          <span className="mt-0.5 block font-mono text-[11px] text-stone-500">
            {state.saved ? "changed just now" : "••••••••••••"}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
        >
          {open ? "close" : "change →"}
        </button>
      </div>
      {open && (
        <form action={formAction} className="mt-4 max-w-md space-y-5">
          <UnderlineInput
            name="currentPassword"
            type="password"
            label="Current password"
            mono
            validation={state.fieldError ? "error" : undefined}
            message={state.fieldError}
          />
          <UnderlineInput
            name="newPassword"
            type="password"
            label="New password"
            mono
            hint="at least 12 characters"
          />
          <div className="flex items-center gap-4">
            <PillButton kind="primary" size="sm" type="submit">
              Change password →
            </PillButton>
            {state.saved && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                ✓ changed
              </span>
            )}
          </div>
        </form>
      )}
    </li>
  );
}

/** BB:328–344 + §2.11/§3.7 — the JJ recipe composed from the kit. */
export function DangerZone({ confirmName }: { confirmName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <PillButton kind="danger-secondary" size="page" onClick={() => setOpen(true)}>
        Delete my account
      </PillButton>
      {open && (
        <div className="fixed inset-0 z-50">
          <ModalShell onClose={() => setOpen(false)}>
            <DeleteConfirm
              noun="account"
              name={confirmName}
              description="Atlas forgets you. This cannot be undone — the next Owner starts from the sign-up gate."
              consequences={[
                "Your Owner membership — the one-Owner slot frees immediately",
                "Every Bridge token, revoked — daemons stop on their next request",
                "Every API token, revoked",
                "Your preferences and notification settings",
                "Every other signed-in session",
              ]}
              keeps="Projects, Tickets, Runs and the feed stay — they are the instance's record. Your code never lived here. Your Neon Auth sign-in identity survives; Atlas just no longer knows it."
              confirmLabel={pending ? "Deleting…" : "Delete forever"}
              onCancel={() => setOpen(false)}
              onConfirm={() => startTransition(() => deleteAccountAction())}
            />
          </ModalShell>
        </div>
      )}
    </>
  );
}
