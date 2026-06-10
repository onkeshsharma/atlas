// THROWAWAY — Editorial Invite Acceptance prototype.
// What a new Collaborator sees when they click a magic-link in their email.
// Pre-app shell, single-focus, trust + warmth.

const INVITE = {
  invitedEmail: "ada@acme.io",
  invitedName: "ada",
  inviter: "Onkesh",
  inviterEmail: "onkesh19@yahoo.co.in",
  project: "acme-website",
  projectTagline: "Online ordering for ACME's storefront.",
  welcomeNote:
    "Welcome to acme-website. You'll be filing bugs on the new checkout flow and the marketing pages. I'll do triage every morning and most things should ship within a day or two. Glad you're here.",
  sentAt: "2 days ago",
  expiresIn: "12 days",
  existingCollaborators: 2,
};

export function VariantUInvite() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        {/* Top-left mini wordmark */}
        <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          Atlas
        </div>

        {/* Top-right addressee */}
        <div className="absolute top-8 right-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          for{" "}
          <span className="text-stone-900 font-mono normal-case tracking-normal">
            {INVITE.invitedEmail}
          </span>
        </div>

        {/* Centered editorial */}
        <main className="min-h-screen flex items-center justify-center px-8 py-24">
          <div className="w-full max-w-2xl">
            {/* Day-stamp */}
            <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
              You&rsquo;ve been invited · {INVITE.sentAt}
            </div>

            {/* Hero — direct, personal */}
            <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
              Hi, {INVITE.invitedName}.
            </h1>
            <p className="mt-5 text-2xl tracking-tight text-stone-700 leading-tight">
              <span className="font-semibold text-stone-900">{INVITE.inviter}</span>{" "}
              invited you to a Project on Atlas.
            </p>

            {/* Welcome note — pull-quote with amber ornament */}
            <div className="relative mt-12 pl-7">
              <span className="absolute -left-1 -top-3 font-bold text-5xl text-amber-400/80 leading-none select-none">
                &ldquo;
              </span>
              <p className="text-lg italic text-stone-800 leading-relaxed">
                {INVITE.welcomeNote}
              </p>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                — {INVITE.inviter} ·{" "}
                <span className="normal-case tracking-normal font-sans">
                  {INVITE.inviterEmail}
                </span>
              </div>
            </div>

            {/* About the Project */}
            <section className="mt-16">
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                About this Project
              </div>
              <p className="mt-5 text-base text-stone-700 leading-relaxed">
                <span className="font-mono text-sm text-stone-900">
                  {INVITE.project}
                </span>{" "}
                — {INVITE.projectTagline} You&rsquo;d be the{" "}
                <span className="font-mono text-sm text-stone-900">
                  {INVITE.existingCollaborators + 1}rd
                </span>{" "}
                Collaborator. The Owner is{" "}
                <span className="font-semibold text-stone-900">
                  {INVITE.inviter}
                </span>
                .
              </p>
            </section>

            {/* What you'll do */}
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
                    See what gets shipped that you asked for, with a clear note
                    explaining what changed.
                  </span>
                </li>
                <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                  <span className="text-emerald-600 mt-1.5">●</span>
                  <span>
                    Reply when the Owner asks you for more detail on something.
                  </span>
                </li>
              </ul>
            </section>

            {/* What you won't see — trust line */}
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
                    Other Collaborators&rsquo; Tickets — you only see your own and
                    what&rsquo;s shipped.
                  </span>
                </li>
                <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                  <span className="text-stone-400 mt-1.5">○</span>
                  <span>
                    The Owner&rsquo;s private review notes or rejected drafts.
                  </span>
                </li>
              </ul>
            </section>

            {/* Trust line */}
            <p className="mt-12 text-base italic text-stone-500 leading-relaxed">
              Atlas runs the Engine on {INVITE.inviter}&rsquo;s computer, not in
              the cloud. Your messages reach them; nothing else is shared.
            </p>

            {/* Actions */}
            <div className="mt-16 flex items-center gap-6">
              <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-6 py-3.5 rounded-full shadow-sm inline-flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                Accept invite
                <span className="text-stone-400">→</span>
              </button>
              <a className="font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-rose-600 cursor-pointer">
                no thanks
              </a>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-stone-400">
                expires in {INVITE.expiresIn}
              </span>
            </div>

            {/* Quiet outro */}
            <p className="mt-12 text-sm italic text-stone-500 leading-relaxed">
              Accepting creates an account using{" "}
              <span className="font-mono not-italic text-stone-700">
                {INVITE.invitedEmail}
              </span>
              . You can leave the Project any time from Settings.
            </p>
          </div>
        </main>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant U · editorial invite
        </div>
        <div className="absolute bottom-8 right-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          <a className="hover:text-stone-700 cursor-pointer">what is atlas?</a>
          <span className="mx-2 text-stone-300">·</span>
          <a className="hover:text-stone-700 cursor-pointer">privacy</a>
        </div>
      </div>
    </>
  );
}
