// M5 — Sign-up. Ported from design/variants/variant-dd-signup.tsx:9–152
// (fidelity protocol §5; canon §4-M5 row). The brand-new-Owner first
// moment — and, with ?invite=<token>, the Collaborator account step of
// the invite flow (PRD #37/#46). Design-lab colophon not ported (§4 note).
import Link from "next/link";

import { validateInvite } from "@/src/domain/auth/invites";
import { dayStamp } from "@/src/lib/format";

import { SignUpForm, type InvitePrefill } from "./sign-up-form";

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  let invite: InvitePrefill | null = null;
  if (params.invite) {
    const validated = await validateInvite(params.invite);
    if (validated.ok) {
      invite = {
        token: validated.invite.token,
        email: validated.invite.email,
        invitedName: validated.invite.invitedName,
      };
    }
    // an invalid token falls through to the plain form — the invite page
    // is where invalid links get their full editorial explanation.
  }

  return (
    <div className="relative flex-1 text-stone-900 font-sans">
      {/* Top-left mini wordmark (DD:11) */}
      <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
        Atlas
      </div>

      {/* Top-right cross-link (DD:16) */}
      <div className="absolute top-8 right-8 font-mono text-xs uppercase tracking-widest text-stone-500">
        Already on Atlas?{" "}
        <Link
          href="/sign-in"
          className="text-stone-900 hover:text-amber-600 cursor-pointer underline-offset-4 hover:underline"
        >
          Sign in →
        </Link>
      </div>

      {/* Centered editorial sign-up (DD:24) */}
      <main className="min-h-screen flex items-center justify-center px-8 py-24">
        <div className="w-full max-w-md">
          {/* Day-stamp (DD:27) */}
          <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
            {dayStamp()}
          </div>

          {/* Hero — slightly different framing than sign-in (DD:32) */}
          <h1 className="mt-3 text-7xl font-bold tracking-tighter leading-none">Begin.</h1>

          {/* Tagline (DD:37) */}
          <p className="mt-5 text-xl text-stone-700 leading-relaxed">
            {invite
              ? "You're invited — set yourself up in under a minute."
              : "Atlas is invite-only for now — but if you have an Owner code, set yourself up in under a minute."}
          </p>

          {/* Sign-up form (DD:43) */}
          <section className="mt-16">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Create your account
            </div>
            <SignUpForm invite={invite} />
          </section>

          {/* Trust line (DD:129) */}
          <p className="mt-12 text-sm text-stone-500 italic leading-relaxed">
            By signing up you agree to our{" "}
            <a className="text-stone-700 hover:text-amber-600 cursor-pointer">terms</a> and{" "}
            <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
              privacy policy
            </a>
            . Atlas only ever holds account metadata, Brief text, Result summaries and
            heartbeats — never your code.
          </p>
        </div>
      </main>

      {/* Right-bottom quiet meta (DD:148) */}
      <div className="absolute bottom-8 right-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
        <a className="hover:text-stone-700 cursor-pointer">what is atlas?</a>
        <span className="mx-2 text-stone-300">·</span>
        <a className="hover:text-stone-700 cursor-pointer">docs</a>
      </div>
    </div>
  );
}
