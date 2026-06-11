"use client";
/**
 * M5 — onboarding step 03 form, ported from
 * design/variants/variant-ss-onboarding.tsx:178–198 + the Input helper
 * (SS:307–338). Kit UnderlineInput per canon §2.13 (overrules SS's
 * text-lg value + text-xs italic hints — hints keep the mono-micro shape
 * with italic sans permitted inside). The save affordance is an M5
 * addition: the variant mocked inputs with no submit (deviation noted).
 */
import { useActionState } from "react";

import { PillButton, UnderlineInput } from "@/src/components/kit";

import { saveProfile, type ProfileState } from "./actions";

/** §2.13 — italic sans prose hint inside the mono-micro message shape. */
function Hint({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-sans normal-case tracking-normal italic">{children}</span>
  );
}

export function ProfileForm({
  displayName,
  handle,
  initial,
}: {
  displayName: string;
  handle: string | null;
  initial: string | null;
}) {
  const [state, formAction] = useActionState<ProfileState, FormData>(saveProfile, {});

  return (
    <form action={formAction} className="mt-8 max-w-md space-y-5">
      <UnderlineInput
        name="displayName"
        type="text"
        label="Display name"
        placeholder="Your name"
        defaultValue={displayName}
        validation={state.fieldErrors?.displayName ? "error" : undefined}
        message={state.fieldErrors?.displayName}
        hint={<Hint>What the Owner and the other Collaborators will see.</Hint>}
      />
      <UnderlineInput
        name="handle"
        type="text"
        label="Handle"
        mono
        placeholder="@you"
        defaultValue={handle ?? undefined}
        validation={state.fieldErrors?.handle ? "error" : undefined}
        message={state.fieldErrors?.handle}
        hint={
          <Hint>For @-mentions and your profile URL. Letters, numbers, and hyphens only.</Hint>
        }
      />
      <UnderlineInput
        name="initial"
        type="text"
        label="Initial"
        placeholder="A"
        maxLength={1}
        defaultValue={initial ?? undefined}
        hint={
          <Hint>
            The single letter shown in the bottom-left sidebar mark. Auto-derived; override
            if you&rsquo;d like.
          </Hint>
        }
      />
      <div className="flex items-center gap-4 pt-2">
        <PillButton kind="primary" size="sm" type="submit">
          Save →
        </PillButton>
        {state.saved && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
            ✓ saved
          </span>
        )}
      </div>
    </form>
  );
}
