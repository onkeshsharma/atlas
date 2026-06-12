"use client";
/**
 * M11 — the invite form + show-once magic-link panel (M:195–240).
 * Ported from design/variants/variant-m-members.tsx:195–240 (label
 * shapes, the optional-note textarea, the Send CTA + italic line).
 *
 * Deviation (recorded): M:237 promises "they'll get a magic-link email"
 * — a successful invite renders the REAL magic link in the M10
 * show-once idiom (AmberPanel + SecretBlock, XX:104's alarm chrome —
 * §2.4 context 7) and the italic line tells the truth. M13 copy-truth
 * sweep: the Notifier now sends ship/digest email, but INVITES are
 * deliberately not an email kind (a magic link is an access grant —
 * hand it over a channel you trust); the copy says precisely that.
 */
import { useActionState, useState } from "react";

import { AmberPanel, PillButton, SecretBlock, UnderlineInput, UnderlineTextarea } from "@/src/components/kit";

import { sendInviteAction, type InviteFormState } from "./actions";

export function InviteForm({ projectId, slug }: { projectId: string; slug: string }) {
  const [state, formAction] = useActionState<InviteFormState, FormData>(sendInviteAction, {});
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const showPanel = state.magicLink && dismissed !== state.magicLink;

  return (
    <>
      {/* show-once magic link — the honest "send" (see header) */}
      {showPanel && state.magicLink && (
        <div className="mt-8">
          <AmberPanel kicker="Invite created · share the link" pulse={false}>
            {/* M13 copy-truth sweep — invites stay hand-delivered by design */}
            <p className="mt-3 text-base text-stone-800 leading-relaxed">
              Atlas doesn&rsquo;t email invites — pass this magic link to{" "}
              <span className="font-mono text-sm">{state.email}</span> yourself, over
              whatever channel you trust.
            </p>
            <div className="mt-5">
              <SecretBlock
                secret={state.magicLink}
                copyLabel={copied ? "Copied ✓" : "Copy →"}
                onCopy={() => {
                  void navigator.clipboard.writeText(state.magicLink!);
                  setCopied(true);
                }}
              />
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-stone-500">
              one account per link · expires in 14 days
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => {
                  setDismissed(state.magicLink!);
                  setCopied(false);
                }}
                className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
              >
                I&rsquo;ve shared it →
              </button>
            </div>
          </AmberPanel>
        </div>
      )}

      <form action={formAction}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="slug" value={slug} />
        <div className="mt-8 space-y-7">
          {/* Email (M:208–217) */}
          <UnderlineInput
            name="email"
            type="email"
            label="Email"
            placeholder="name@example.com"
            validation={state.fieldError ? "error" : undefined}
            message={state.fieldError}
          />
          {/* Welcome note (M:219–230) */}
          <UnderlineTextarea
            name="welcomeNote"
            rows={3}
            label="Welcome note"
            labelMeta="· optional"
            placeholder="A quick line so they know what they're being invited to."
          />
        </div>
        {/* CTA row sits OUTSIDE the field stack (M:232's own mt-8) */}
        <div className="mt-8 flex items-center gap-4">
          <PillButton kind="primary" size="page" type="submit" arrow>
            Create invite
          </PillButton>
          {/* M:236's italic line, made true (deviation in header) */}
          <span className="italic font-sans text-sm text-stone-500">
            you share the magic link yourself · expires in 14 days
          </span>
        </div>
      </form>
    </>
  );
}
