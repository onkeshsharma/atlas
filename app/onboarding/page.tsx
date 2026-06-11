// M5 — Collaborator onboarding. Ported from
// design/variants/variant-ss-onboarding.tsx:22–288 (fidelity protocol §5;
// canon §4-M5 row; display-lg hero with the §2.2 sentence-title accent).
// Guarded — Collaborators only. Design-lab colophon not ported (§4 note).
//
// Deviations (M5, flagged in HANDOFF-M5):
//  - Projects arrive with M7 → step 01 lists the single instance-level
//    membership the invite granted, not SS's two project rows; the mock
//    "Accept both" CTA becomes the real accepted-state line (the invite
//    was claimed at account creation).
//  - Ticket filing arrives with M8 → step 04's composer renders with the
//    submit disabled and a quiet italic line saying why (no fake actions).
//  - SS:29's "Sign in →" corner link is a real sign-out (user is authed).
import Link from "next/link";

import { FeaturedCard, PillButton } from "@/src/components/kit";
import { signOutAction } from "@/src/domain/auth/actions";
import { requireCollaborator } from "@/src/domain/auth/guard";
import { inviteAcceptedBy } from "@/src/domain/auth/invites";
import { ownerMembership } from "@/src/domain/auth/memberships";
import { timeAgo } from "@/src/lib/format";

import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: "01", label: "You're invited" },
  { n: "02", label: "What Atlas does" },
  { n: "03", label: "Pick a name" },
  { n: "04", label: "File your first Ticket" },
];

export default async function OnboardingPage() {
  const user = await requireCollaborator();
  const membership = user.membership!; // requireCollaborator guarantees it
  const owner = await ownerMembership();
  const ownerName = owner?.displayName ?? "the Owner";
  const invite = await inviteAcceptedBy(user.id);
  const firstName = membership.displayName.split(" ")[0];

  return (
    <div className="relative flex-1 text-stone-900 font-sans">
      {/* Top chrome (SS:24–30; sign-out is real — deviation note above) */}
      <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
        Atlas · Welcome
      </div>
      <div className="absolute top-8 right-8 flex items-center gap-5 font-mono text-xs uppercase tracking-widest text-stone-500">
        <a className="hover:text-stone-900 cursor-pointer">What is Atlas?</a>
        <form action={signOutAction}>
          <button
            type="submit"
            className="font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-stone-900 cursor-pointer"
          >
            sign out →
          </button>
        </form>
      </div>

      <main className="min-h-screen pt-28 pb-24 px-8">
        <div className="max-w-4xl mx-auto">
          {/* HERO (SS:35–49) */}
          <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
            Step 01 of 04 · 90 seconds, tops
          </div>
          <h1 className="mt-4 text-6xl font-bold tracking-tighter leading-[0.95]">
            <span className="relative">
              Welcome
              {/* §2.2 sentence-title accent — one per page (SS:41) */}
              <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-amber-500" />
            </span>
            ,&nbsp;{firstName}.
          </h1>
          <p className="mt-7 text-2xl tracking-tight text-stone-700 leading-tight max-w-2xl">
            {/* {" "} idiom: Turbopack drops the leading space of multi-line
                text after an inline expression (see invite page note) */}
            {ownerName}{" "}
            has invited you to collaborate through Atlas — a tool that lets you ask for code
            changes in plain English.
          </p>

          {/* Step bar (SS:52–77; inline style → class toggles, same render) */}
          <ol className="mt-12 grid grid-cols-4 gap-3">
            {STEPS.map((s, i) => (
              <li
                key={s.n}
                className={`border-t-2 pt-3 transition ${
                  i === 0 ? "border-amber-500" : "border-stone-200"
                }`}
              >
                <div
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    i === 0 ? "text-amber-700" : "text-stone-400"
                  }`}
                >
                  {s.n}
                </div>
                <div
                  className={`mt-1 text-sm font-medium ${
                    i === 0 ? "text-stone-900" : "text-stone-500"
                  }`}
                >
                  {s.label}
                </div>
              </li>
            ))}
          </ol>

          {/* STEP 01 — You're invited (SS:80–125; membership row replaces
              the mock project rows — deviation note above) */}
          <section className="mt-20">
            <div className="grid grid-cols-[120px_1fr] gap-10 items-baseline">
              <div className="font-mono text-sm text-stone-400">01</div>
              <div>
                <h2 className="text-3xl font-bold tracking-tighter">You&rsquo;re in.</h2>
                <p className="mt-4 text-base text-stone-700 leading-relaxed max-w-2xl">
                  As a Collaborator, you can file Tickets — change requests written in plain
                  English — and Atlas&rsquo;s Engine will draft a Brief, ship a PR, and email
                  you when it&rsquo;s shipped. You won&rsquo;t see code.
                </p>

                <ul className="mt-7 divide-y divide-stone-200 max-w-xl">
                  <li className="py-4 grid grid-cols-[1fr_auto] items-baseline gap-6">
                    <div>
                      <div className="text-base font-medium text-stone-900">
                        {ownerName.toLowerCase()}&rsquo;s atlas
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                        invited by {ownerName}
                        {invite?.createdAt ? ` · ${timeAgo(invite.createdAt)}` : ""}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full">
                      Collaborator
                    </span>
                  </li>
                </ul>

                {/* real accepted state — §2.13 success shape */}
                <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                  ✓ accepted{invite?.acceptedAt ? ` · ${timeAgo(invite.acceptedAt)}` : ""}
                </p>
              </div>
            </div>
          </section>

          {/* STEP 02 — What Atlas is (SS:128–163; cards → kit FeaturedCard,
              §2.4 context 4 — its stone-200/80 border overrules SS:295) */}
          <section className="mt-24">
            <div className="grid grid-cols-[120px_1fr] gap-10 items-baseline">
              <div className="font-mono text-sm text-stone-400">02</div>
              <div>
                <h2 className="text-3xl font-bold tracking-tighter">
                  What you&rsquo;re here to do.
                </h2>
                <p className="mt-4 text-base text-stone-700 leading-relaxed max-w-2xl">
                  Three things, in plain language.
                </p>

                <div className="mt-8 grid grid-cols-3 gap-6 max-w-2xl">
                  <StepCard
                    n="01"
                    title="File a Ticket"
                    body="Describe what you want changed. Write it like a chat message."
                  />
                  <StepCard
                    n="02"
                    title="Atlas writes the change"
                    body={`The Owner reviews, ships a PR. The Engine works on ${ownerName}'s machine.`}
                  />
                  <StepCard
                    n="03"
                    title="You hear back"
                    body="One email per Ticket — what shipped, why, and a link if you care."
                  />
                </div>

                <p className="mt-7 text-sm italic text-stone-500 leading-relaxed max-w-xl">
                  You never write code. You never review diffs. You file Tickets, Atlas does
                  the rest.
                </p>
              </div>
            </div>
          </section>

          {/* STEP 03 — Pick name (SS:166–201) — REAL membership profile */}
          <section className="mt-24">
            <div className="grid grid-cols-[120px_1fr] gap-10 items-baseline">
              <div className="font-mono text-sm text-stone-400">03</div>
              <div>
                <h2 className="text-3xl font-bold tracking-tighter">
                  How should we address you?
                </h2>
                <p className="mt-4 text-base text-stone-700 leading-relaxed max-w-2xl">
                  Your name appears on every Ticket comment and in your weekly digest email.
                  You can change it later in settings.
                </p>
                <ProfileForm
                  displayName={membership.displayName}
                  handle={membership.handle}
                  initial={membership.initial}
                />
              </div>
            </div>
          </section>

          {/* STEP 04 — File first Ticket (SS:204–252; composer renders,
              filing waits for the Work surfaces — deviation note above) */}
          <section className="mt-24">
            <div className="grid grid-cols-[120px_1fr] gap-10 items-baseline">
              <div className="font-mono text-sm text-stone-400">04</div>
              <div>
                <h2 className="text-3xl font-bold tracking-tighter">
                  Try it — file your first Ticket.
                </h2>
                <p className="mt-4 text-base text-stone-700 leading-relaxed max-w-2xl">
                  Optional, but it&rsquo;s how you&rsquo;ll feel out how Atlas thinks.{" "}
                  {ownerName}{" "}
                  sees this in their Triage inbox and can either ship it or send it back for
                  clarification.
                </p>

                <div className="mt-8 max-w-xl">
                  <FeaturedCard padding="6">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                      Filing to · {ownerName.toLowerCase()}&rsquo;s atlas
                    </div>
                    {/* §2.13 scale exception — borderless title composer (SS:221, S:89) */}
                    <input
                      type="text"
                      placeholder="One line — what's broken or what you want…"
                      className="mt-3 w-full bg-transparent text-xl tracking-tight text-stone-900 placeholder:text-stone-300 focus:outline-none"
                    />
                    <div className="mt-4 border-t border-stone-200/80 pt-4">
                      <textarea
                        rows={4}
                        placeholder="More detail (optional). Markdown is fine."
                        className="w-full bg-transparent text-base text-stone-700 placeholder:text-stone-400 focus:outline-none resize-none"
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-stone-200/80 pt-3">
                      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                        <span>kind: enhancement</span>
                      </div>
                      <PillButton kind="primary" disabled>
                        File Ticket →
                      </PillButton>
                    </div>
                  </FeaturedCard>
                </div>

                {/* §2.17 strip shape — why filing waits (honest, quiet) */}
                <p className="mt-4 text-sm italic text-stone-500 leading-relaxed">
                  Filing opens when {ownerName} connects the first Project.
                </p>

                <Link
                  href="/"
                  className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-stone-900 cursor-pointer"
                >
                  skip for now → take me to Today
                </Link>
              </div>
            </div>
          </section>

          {/* COLOPHON (SS:255–281) */}
          <div className="mt-24 pt-10 border-t border-stone-200/80 grid grid-cols-2 gap-10 items-baseline max-w-3xl">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                Trust circle
              </div>
              <p className="mt-3 text-sm text-stone-600 leading-relaxed">
                Atlas is invite-only by design. You&rsquo;re here because {ownerName}{" "}
                trusts you. We don&rsquo;t allow public sign-up.
              </p>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                What we do with your data
              </div>
              <p className="mt-3 text-sm text-stone-600 leading-relaxed">
                Atlas stores your name, email, and the Tickets you file. Nothing else. We
                don&rsquo;t see code — that lives on {ownerName}&rsquo;s machine.
              </p>
            </div>
          </div>

          <p className="mt-12 text-sm italic text-stone-500 leading-relaxed max-w-xl">
            Stuck on any step? {ownerName}{" "}
            gets pinged in their Triage inbox if you don&rsquo;t finish — they can nudge you
            in person.
          </p>
        </div>
      </main>
    </div>
  );
}

/** SS:293–305 — the three what-you-do cards, on the kit's FeaturedCard. */
function StepCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <FeaturedCard padding="5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-amber-700">
        {n}
      </div>
      <div className="mt-3 text-base font-semibold text-stone-900 leading-tight">{title}</div>
      <p className="mt-2 text-sm text-stone-600 leading-relaxed">{body}</p>
    </FeaturedCard>
  );
}
