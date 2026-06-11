// M5 — Invite acceptance. Ported from design/variants/variant-u-invite.tsx:23–183
// (fidelity protocol §5; canon §4-M5 row: no sidebar, centered max-w-2xl
// narrative, corner meta links; PRD #46 "what you will and won't see").
// REAL token validation; non-pending links render the §2.17 page-shape
// empty state. Design-lab colophon not ported (§4 note).
//
// Deviation (M5, flagged): Projects arrive with M7, so U's "About this
// Project" section describes the instance the Collaborator is joining
// (the Owner's Atlas) instead of a project row — same markup shape.
import Link from "next/link";

import { EmptyState, PillButton, PullQuote } from "@/src/components/kit";
import {
  daysUntilExpiry,
  deriveInviteStatus,
  getInviteByToken,
  type InviteStatus,
} from "@/src/domain/auth/invites";
import { collaboratorCount, ownerMembership } from "@/src/domain/auth/memberships";
import { authUserById } from "@/src/domain/auth/users";
import { dayStamp, ordinal, timeAgo } from "@/src/lib/format";

import { acceptInviteAction, declineInviteAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<Exclude<InviteStatus, "pending"> | "not-found", {
  title: string;
  sentence: string;
}> = {
  "not-found": {
    title: "This invite link isn't valid.",
    sentence: "Check the link in your email — or ask the person who invited you for a fresh one.",
  },
  expired: {
    title: "This invite has expired.",
    sentence: "Invites last a fortnight. Ask the person who invited you to send a new link.",
  },
  revoked: {
    title: "This invite was withdrawn.",
    sentence: "The Owner revoked this link. If that's a surprise, ask them directly.",
  },
  declined: {
    title: "You declined this invite.",
    sentence: "Nothing was created and nothing is shared. Changed your mind? Ask for a fresh link.",
  },
  accepted: {
    title: "This invite was already used.",
    sentence: "An account exists for it — sign in instead.",
  },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  const status: InviteStatus | "not-found" = invite ? deriveInviteStatus(invite) : "not-found";

  const owner = await ownerMembership();
  const inviter =
    (invite && (await authUserById(invite.invitedBy))) ?? null;
  const inviterName = owner?.displayName ?? inviter?.name ?? "the Owner";

  if (!invite || status !== "pending") {
    const copy = STATUS_COPY[status as keyof typeof STATUS_COPY];
    return (
      <Frame topRight={invite ? <>for <span className="text-stone-900 font-mono normal-case tracking-normal">{invite.email}</span></> : null}>
        <main className="min-h-screen flex items-center justify-center px-8 py-24">
          <div className="w-full max-w-2xl">
            <EmptyState
              shape="page"
              dayStamp={`Invite · ${dayStamp()}`}
              title={copy.title}
              sentence={copy.sentence}
              action={
                status === "accepted" ? (
                  <Link
                    href="/sign-in"
                    className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
                  >
                    Sign in →
                  </Link>
                ) : undefined
              }
            />
          </div>
        </main>
      </Frame>
    );
  }

  const invitedName = invite.invitedName ?? invite.email.split("@")[0];
  const nth = ordinal((await collaboratorCount()) + 1);

  return (
    <Frame
      topRight={
        <>
          for{" "}
          <span className="text-stone-900 font-mono normal-case tracking-normal">
            {invite.email}
          </span>
        </>
      }
    >
      {/* Centered editorial (U:38) */}
      <main className="min-h-screen flex items-center justify-center px-8 py-24">
        <div className="w-full max-w-2xl">
          {/* Day-stamp (U:41) */}
          <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
            You&rsquo;ve been invited · {timeAgo(invite.createdAt)}
          </div>

          {/* Hero — direct, personal (U:46) */}
          <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
            Hi, {invitedName}.
          </h1>
          <p className="mt-5 text-2xl tracking-tight text-stone-700 leading-tight">
            <span className="font-semibold text-stone-900">{inviterName}</span> invited you
            to their Atlas.
          </p>

          {/* Welcome note — narrative pull-quote at U:56's scale
              (canon §2.15/E13, 2026-06-11 ledger pass) */}
          {invite.welcomeNote && (
            <div className="mt-12">
              <PullQuote
                tone="amber"
                scale="lg"
                attribution={`— ${inviterName}${inviter?.email ? ` · ${inviter.email}` : ""}`}
              >
                {invite.welcomeNote}
              </PullQuote>
            </div>
          )}

          {/* About this Atlas (U:71 — see deviation note at top) */}
          <section className="mt-16">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              About this Atlas
            </div>
            <p className="mt-5 text-base text-stone-700 leading-relaxed">
              <span className="font-mono text-sm text-stone-900">
                {inviterName.toLowerCase()}&rsquo;s atlas
              </span>{" "}
              {/* the {" "} idiom is load-bearing: Turbopack's JSX transform
                  drops the leading space of a multi-line text chunk that
                  follows an inline expression (diagnosed 2026-06-11) */}
              — where {inviterName}{" "}
              orchestrates AI-engineered work across their projects. You&rsquo;d be the{" "}
              <span className="font-mono text-sm text-stone-900">{nth}</span> Collaborator.
              The Owner is{" "}
              <span className="font-semibold text-stone-900">{inviterName}</span>.
            </p>
          </section>

          {/* What you'll do (U:92) */}
          <section className="mt-16">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              What you&rsquo;ll be able to do
            </div>
            <ul className="mt-5 space-y-3 text-base text-stone-700 leading-relaxed">
              <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                <span className="text-emerald-600 mt-1.5">●</span>
                <span>File Tickets — bugs, requests, ideas in plain language.</span>
              </li>
              <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                <span className="text-emerald-600 mt-1.5">●</span>
                <span>
                  See what gets shipped that you asked for, with a clear note explaining what
                  changed.
                </span>
              </li>
              <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                <span className="text-emerald-600 mt-1.5">●</span>
                <span>Reply when the Owner asks you for more detail on something.</span>
              </li>
            </ul>
          </section>

          {/* What you won't see — trust line (U:118) */}
          <section className="mt-12">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              What you won&rsquo;t see
            </div>
            <ul className="mt-5 space-y-3 text-base text-stone-700 leading-relaxed">
              <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                <span className="text-stone-400 mt-1.5">○</span>
                <span>The code itself, or any diff the Engine produces.</span>
              </li>
              <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                <span className="text-stone-400 mt-1.5">○</span>
                <span>
                  Other Collaborators&rsquo; Tickets — you only see your own and what&rsquo;s
                  shipped.
                </span>
              </li>
              <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                <span className="text-stone-400 mt-1.5">○</span>
                <span>The Owner&rsquo;s private review notes or rejected drafts.</span>
              </li>
            </ul>
          </section>

          {/* Trust line (U:144) */}
          <p className="mt-12 text-base italic text-stone-500 leading-relaxed">
            Atlas runs the Engine on {inviterName}&rsquo;s computer, not in the cloud. Your
            messages reach them; nothing else is shared.
          </p>

          {/* Actions (U:150; canon §2.9 overrules U:151–154's dotted inline
              pill — inline/small pills carry no dot; kit page size px-5 py-3) */}
          <div className="mt-16 flex items-center gap-6">
            <form action={acceptInviteAction}>
              <input type="hidden" name="token" value={invite.token} />
              <PillButton kind="primary" size="page" arrow type="submit">
                Accept invite
              </PillButton>
            </form>
            <form action={declineInviteAction}>
              <input type="hidden" name="token" value={invite.token} />
              <PillButton kind="ghost" ghostDanger type="submit">
                no thanks
              </PillButton>
            </form>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-stone-400">
              expires in {daysUntilExpiry(invite.expiresAt)} days
            </span>
          </div>

          {/* Quiet outro (U:165) */}
          <p className="mt-12 text-sm italic text-stone-500 leading-relaxed">
            Accepting creates an account using{" "}
            <span className="font-mono not-italic text-stone-700">{invite.email}</span>. You
            can leave any time from Settings.
          </p>
        </div>
      </main>
    </Frame>
  );
}

/** the U pre-auth frame: wordmark top-left, addressee top-right, meta bottom-right. */
function Frame({
  topRight,
  children,
}: {
  topRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex-1 text-stone-900 font-sans">
      {/* Top-left mini wordmark (U:25) */}
      <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
        Atlas
      </div>
      {/* Top-right addressee (U:30) */}
      {topRight && (
        <div className="absolute top-8 right-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          {topRight}
        </div>
      )}
      {children}
      {/* Right-bottom quiet meta (U:179) */}
      <div className="absolute bottom-8 right-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
        <a className="hover:text-stone-700 cursor-pointer">what is atlas?</a>
        <span className="mx-2 text-stone-300">·</span>
        <a className="hover:text-stone-700 cursor-pointer">privacy</a>
      </div>
    </div>
  );
}
