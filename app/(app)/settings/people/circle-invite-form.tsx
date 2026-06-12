"use client";
/**
 * M11 — the WW invite bar (variant-ww-trust.tsx:276–307): email input +
 * project select + Send, inside the §2.4-context-2 FeaturedCard.
 *
 * Deviations (recorded): WW:304 "The invitee receives a Resend email"
 * → no email sends until the Notifier (M13; M5 deviation 1) — success
 * renders the REAL magic link show-once (XX:104 alarm chrome), and the
 * italic line tells the truth. WW:305 "expire in 7 days" → 14 (the real
 * INVITE_TTL_DAYS). A "no specific project" option is added — bare
 * instance invites are real (invites.project_id is nullable).
 */
import { useActionState, useState } from "react";

import { AmberPanel, PillButton, SecretBlock } from "@/src/components/kit";

import { sendCircleInviteAction, type CircleInviteState } from "./actions";

export function CircleInviteForm({
  projects,
}: {
  projects: Array<{ id: string; name: string }>;
}) {
  const [state, formAction] = useActionState<CircleInviteState, FormData>(
    sendCircleInviteAction,
    {},
  );
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const showPanel = state.magicLink && dismissed !== state.magicLink;

  return (
    <section className="mt-16 rounded-2xl bg-white/70 border border-stone-200 p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">
        Add to your circle
      </div>
      <p className="mt-3 text-base text-stone-700 leading-relaxed">
        Atlas doesn&rsquo;t allow public sign-up. Create an invitation for an email; the
        recipient lands on the onboarding flow.
      </p>

      {showPanel && state.magicLink && (
        <div className="mt-5">
          <AmberPanel kicker="Invite created · share the link" pulse={false}>
            {/* M13 copy-truth sweep — invites stay hand-delivered by design */}
            <p className="mt-3 text-base text-stone-800 leading-relaxed">
              Pass this magic link to{" "}
              <span className="font-mono text-sm">{state.email}</span> yourself — Atlas
              doesn&rsquo;t email invites.
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
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <input
            type="email"
            name="email"
            placeholder="someone@example.com"
            className="flex-1 min-w-[240px] bg-transparent border-b border-stone-300 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition"
          />
          <select
            name="projectId"
            defaultValue={projects[0]?.id ?? ""}
            className="bg-transparent border-b border-stone-300 py-2 text-base text-stone-700 focus:outline-none focus:border-stone-900"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="">no specific project</option>
          </select>
          <PillButton kind="primary" type="submit" arrow>
            Create invite
          </PillButton>
        </div>
        {state.fieldError && (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-rose-700">
            {state.fieldError}
          </p>
        )}
      </form>
      {/* M13 copy-truth sweep — the Notifier shipped (ship/digest email); a
          magic link is an access grant and stays hand-delivered by design */}
      <p className="mt-4 text-sm italic text-stone-500 leading-relaxed">
        You share the magic link yourself — an access grant travels over a channel you
        trust, never an automated email. Invitations expire in 14 days.
      </p>
    </section>
  );
}
