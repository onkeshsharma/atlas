/**
 * M11 — /settings/people, the trust circle, ported from
 * design/variants/variant-ww-trust.tsx:108–369 (horizontal subnav ·
 * accent hero · live stats sentence · tenure-sorted rows with row
 * monograms + project chips · pending invitations · invite bar ·
 * revoke footer · rail: circle-size card / at-a-glance / why-a-circle /
 * members footer). Canon: §2.2 sentence-title accent, §2.18 row
 * monogram + ringed presence, §3.1 + ledger E9 (WW:119's 300 rail →
 * 320), §3.2 horizontal subnav, §3.7 step-1 danger links.
 *
 * Deviations (recorded in HANDOFF-M11):
 *  - WW:180 `bridgeOnline` dot → derived per-person presence (the M6
 *    actors-active-today rule) — Collaborators have no Bridge; the ring
 *    marks "active today", honestly.
 *  - WW:217 "view profile →" dropped — no member-profile surface exists
 *    in the v2.0 PRD (QQ is the Owner's own profile); a dead link lies.
 *  - WW:263 "resend ↗" → "copy link →" (the `↗` also broke §3.6 —
 *    nothing leaves Atlas) and WW:144's hardcoded "3 Projects" → the
 *    real distinct-rostered-project count.
 *  - WW:114 "Per-project Members" subnav link → /projects (members live
 *    per-project at /projects/<slug>/members; there is no single page).
 *    Same for the rail footer's "Settings · Members →".
 *  - Invite-bar honesty + 7→14-day TTL: see circle-invite-form.tsx.
 *  - WW:342 "Tickets / month ~71" → "Tickets · 30d" (the real windowed
 *    count; "per month" implies an average nobody computes).
 */
import Link from "next/link";

import { InitialMark, MonoSectionLabel, PageHeader, PageTitle, SubnavLink } from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireOwner } from "@/src/domain/auth/guard";
import { inviteMagicLink } from "@/src/domain/auth/invites";
import { latestCursor } from "@/src/domain/live/broker";
import {
  activeToday,
  lastActiveAt,
  todayStart,
  type PersonIdentity,
} from "@/src/domain/people/presence";
import { latestActorActivity, pendingInvites, trustCircle } from "@/src/domain/people/queries";
import { projectRows } from "@/src/domain/cockpit/queries";
import { timeAgo } from "@/src/lib/format";

import { CopyLinkButton } from "../../projects/[slug]/members/copy-link";
import { cancelInviteAction, revokeAccessAction } from "./actions";
import { CircleInviteForm } from "./circle-invite-form";

export const dynamic = "force-dynamic";

/** WW:71–77's dayLabel, over real joined dates. */
function tenureLabel(joinedAt: Date, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - joinedAt.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  if (days < 60) return "~1 month ago";
  return `${Math.round(days / 30)} months ago`;
}

export default async function TrustCirclePage() {
  await requireOwner();
  const [circle, pending, activity, allProjects, cursor] = await Promise.all([
    trustCircle(),
    pendingInvites(),
    latestActorActivity(30),
    projectRows(),
    latestCursor(),
  ]);

  const dayStart = todayStart();
  const identity = (p: (typeof circle)[number]): PersonIdentity => ({
    displayName: p.displayName,
    handle: p.handle,
    email: p.email,
  });
  // WW sorts by tenure — longest first (joinedAt asc, the query's order)
  const accepted = circle;
  const tickets30d = accepted.reduce((s, p) => s + p.ticketsFiled30d, 0);
  const sharedProjects = new Set(accepted.flatMap((p) => p.projects.map((x) => x.slug))).size;
  const active30d = accepted.filter((p) => lastActiveAt(identity(p), activity) !== null).length;

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      <PageHeader
        kind="routed"
        breadcrumb="Settings · People · Trust circle"
        nav={
          <>
            {/* WW:114 — see deviation note in header */}
            <SubnavLink href="/projects">Per-project Members</SubnavLink>
            <SubnavLink active>Trust circle</SubnavLink>
          </>
        }
      >
        <div className="grid grid-cols-[1fr_320px] gap-16">
          {/* canon E9 — WW:119's 300 rail folds to 320 */}
          <div className="max-w-2xl">
            {/* Hero (WW:122–136) */}
            <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
              Your people · everyone, every Project
            </div>
            <div className="mt-3">
              <PageTitle accent="trust circle" after="." wraps>
                Your{" "}
              </PageTitle>
            </div>
            <p className="mt-5 text-xl text-stone-700 leading-relaxed">
              Atlas is invite-only by design. {accepted.length}{" "}
              {accepted.length === 1 ? "person is" : "people are"} in here because you
              invited them, sometime, somewhere.
            </p>

            {/* Live stats sentence (WW:139–158) */}
            <p className="mt-6 text-base text-stone-700 leading-relaxed">
              <span className="font-mono text-stone-900">{accepted.length}</span>{" "}
              Collaborator{accepted.length === 1 ? "" : "s"} across{" "}
              <span className="font-mono text-stone-900">{sharedProjects}</span> Project
              {sharedProjects === 1 ? "" : "s"} {accepted.length === 1 ? "has" : "have"}{" "}
              filed <span className="font-mono text-stone-900">{tickets30d}</span> Ticket
              {tickets30d === 1 ? "" : "s"} in the last 30 days.{" "}
              {pending.length > 0 && (
                <span>
                  <span className="font-mono text-amber-700">{pending.length}</span>{" "}
                  invitation{pending.length === 1 ? " hasn't" : "s haven't"} been accepted
                  yet.
                </span>
              )}
            </p>

            {/* ACCEPTED (WW:161–227) */}
            <section className="mt-16">
              <MonoSectionLabel
                rule
                action={
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    sorted by tenure
                  </span>
                }
              >
                In your circle
              </MonoSectionLabel>
              {accepted.length === 0 ? (
                /* §2.17 strip — absence is the state, named */
                <p className="mt-6 text-sm italic text-stone-500 leading-relaxed">
                  Nobody yet — your circle starts with the invite bar below.
                </p>
              ) : (
                <ul className="divide-y divide-stone-200">
                  {accepted.map((p) => {
                    const active = activeToday(identity(p), activity, dayStart);
                    return (
                      <li
                        key={p.userId}
                        className="py-5 grid grid-cols-[48px_1fr_auto] items-baseline gap-5"
                      >
                        {/* Monogram (WW:177; §2.18 row form + presence ring) */}
                        <InitialMark
                          size="row"
                          initial={p.initial.toUpperCase()}
                          presence={active ? "emerald" : undefined}
                        />

                        {/* Identity (WW:184–212) */}
                        <div>
                          <div className="flex items-baseline gap-3 flex-wrap">
                            <span className="text-base font-medium text-stone-900">
                              {p.displayName}
                            </span>
                            <span className="font-mono text-xs text-stone-500">
                              {p.handle ? `@${p.handle}` : "—"}
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-400 flex-wrap">
                            <span>{p.email ?? "—"}</span>
                            <span className="text-stone-300">·</span>
                            <span>{tenureLabel(p.joinedAt)}</span>
                            <span className="text-stone-300">·</span>
                            <span>
                              {p.ticketsFiled} Ticket{p.ticketsFiled === 1 ? "" : "s"} ·
                            </span>
                          </div>
                          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                            {p.projects.map((proj) => (
                              <span
                                key={proj.slug}
                                className="font-mono text-[10px] uppercase tracking-widest text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full"
                              >
                                {proj.name}
                              </span>
                            ))}
                            {p.projects.length === 0 && (
                              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                                no project roster yet
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions (WW:216–223; "view profile" dropped — header) */}
                        <div className="flex flex-col items-end gap-2 whitespace-nowrap">
                          <form action={revokeAccessAction}>
                            <input type="hidden" name="userId" value={p.userId} />
                            <button
                              type="submit"
                              className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-rose-700 cursor-pointer"
                            >
                              revoke access
                            </button>
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* PENDING (WW:230–273) */}
            {pending.length > 0 && (
              <section className="mt-16">
                <div className="flex items-baseline justify-between border-b border-amber-200 pb-3">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-amber-700">
                    Pending invitations
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    haven&rsquo;t accepted yet
                  </span>
                </div>
                <ul className="divide-y divide-amber-100">
                  {pending.map((inv) => (
                    <li
                      key={inv.id}
                      className="py-5 grid grid-cols-[48px_1fr_auto] items-baseline gap-5"
                    >
                      <div className="relative h-10 w-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-base font-bold tracking-tighter leading-none border-2 border-dashed border-amber-300">
                        ?
                      </div>
                      <div>
                        <div className="text-base text-stone-900">{inv.email}</div>
                        <div className="mt-1 flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          <span>
                            {inv.projectName
                              ? `invited to ${inv.projectName}`
                              : "invited to this Atlas"}
                          </span>
                          <span className="text-stone-300">·</span>
                          <span className="text-amber-700">
                            pending {timeAgo(inv.createdAt).replace(" ago", "")}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 whitespace-nowrap">
                        <CopyLinkButton magicLink={inviteMagicLink(inv.token)} />
                        <form action={cancelInviteAction}>
                          <input type="hidden" name="inviteId" value={inv.id} />
                          <button
                            type="submit"
                            className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-rose-700 cursor-pointer"
                          >
                            cancel invite
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* INVITE BAR (WW:276–307; honesty in circle-invite-form.tsx) */}
            <CircleInviteForm
              projects={allProjects.map((p) => ({ id: p.id, name: p.name }))}
            />

            {/* Revoke semantics footer (WW:309–314 — true as written) */}
            <p className="mt-16 text-sm italic text-stone-500 leading-relaxed">
              Revoking access is immediate — the Collaborator can&rsquo;t see Tickets,
              file new ones, or receive Ship Notifications. Their prior Tickets stay
              attributed to them in the{" "}
              <Link
                href="/settings/audit"
                className="not-italic font-mono text-xs text-stone-700 hover:text-amber-600 cursor-pointer"
              >
                audit log
              </Link>
              ; Atlas never rewrites history.
            </p>
          </div>

          {/* RAIL (WW:318–367) */}
          <aside className="space-y-12">
            {/* Circle size (WW:319–332) */}
            <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-6 text-center">
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                Circle size
              </div>
              <div className="mt-3 font-mono text-6xl font-bold tracking-tighter text-stone-900 leading-none">
                {accepted.length}
              </div>
              <p className="mt-4 text-xs text-stone-500 leading-relaxed">
                Atlas works best with{" "}
                <span className="text-stone-900 font-medium">2–8</span> people. After
                that, Tickets pile up faster than you can review.
              </p>
            </section>

            {/* At a glance (WW:334–344) */}
            <section>
              <MonoSectionLabel>At a glance</MonoSectionLabel>
              <dl className="mt-5 space-y-3 text-sm">
                <Stat label="Active 30d" value={`${active30d} of ${accepted.length}`} />
                <Stat label="Pending invites" value={String(pending.length)} />
                <Stat label="Projects shared" value={String(sharedProjects)} />
                <Stat label="Tickets · 30d" value={String(tickets30d)} />
              </dl>
            </section>

            {/* Why a circle (WW:346–356 — editorial, true) */}
            <section>
              <MonoSectionLabel>Why a circle, not a tenant</MonoSectionLabel>
              <p className="mt-4 text-sm text-stone-600 leading-relaxed">
                Most products call this &ldquo;your team&rdquo; or &ldquo;workspace
                members.&rdquo; Atlas is one Owner with a circle of trusted Collaborators
                — fundamentally different shape. Calling it what it is.
              </p>
            </section>

            {/* Members footer (WW:358–366 — see deviation note) */}
            <section className="pt-4 border-t border-stone-200/80">
              <p className="text-sm italic text-stone-500 leading-relaxed">
                Per-Project membership lives on each project&rsquo;s{" "}
                <Link
                  href="/projects"
                  className="not-italic font-mono text-xs text-stone-700 hover:text-amber-600 cursor-pointer"
                >
                  Members page →
                </Link>{" "}
                if you need to tweak access for one Project at a time.
              </p>
            </section>
          </aside>
        </div>
      </PageHeader>
    </main>
  );
}

/** WW:380–387's Stat row. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-stone-500">{label}</span>
      <span className="font-mono text-stone-700">{value}</span>
    </div>
  );
}
