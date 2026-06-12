/**
 * M11 — /projects/[slug]/members, ported from
 * design/variants/variant-m-members.tsx:110–373 (breadcrumb · hero +
 * inline stats · roster rows [32px_1fr_auto_auto] · invite form ·
 * pending invites · 360 rail: hero stat / roles / quick-invite card /
 * docs footer). Canon: §2.2 routed header, §2.3 divided rows, §2.18
 * typographic identity + presence dots, §3.1 default 360 rail, §3.7
 * step-1 danger (remove/revoke ghost links rose on hover).
 *
 * Deviations (recorded in HANDOFF-M11):
 *  - M:176 "online now" → "active today": presence is the M6
 *    actors-active-today derivation (per-person, feed-actor matched) —
 *    Atlas has no liveness channel, so the copy claims exactly what the
 *    record proves. Same for the rail's "Active right now" row.
 *  - M:200 "Send an email invite" + M:237 "they'll get a magic-link
 *    email" → honest in-UI magic link (M5 deviation 1 stands; the
 *    Notifier is M13). The invite CTA reads "Create invite".
 *  - M:271 "resend →" → "copy link →" (the link is durable; resend
 *    implies email nobody sends).
 *  - M:348 Quick-invite rail card drew a SECOND writer ("Generate
 *    link →") — every invite already returns a shareable link, so the
 *    card keeps its promise as explanation + a ghost link to the one
 *    real form (no parallel writer, no fake button).
 *  - M:331 "One per Project." → "One per Atlas." (CONTEXT.md: exactly
 *    one Owner per instance — the variant predates that decision).
 *  - "In your circle, not on this project" rows are ADDED beyond the
 *    variant (charter item 1 demands roster writes; invites are
 *    one-shot, so a removed Collaborator needs a real re-add path).
 *  - M:366 docs row links the REAL /docs/owner-and-collaborator (M14).
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { InitialMark, MonoSectionLabel, PageHeader } from "@/src/components/kit";
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
import {
  collaboratorsNotOnProject,
  latestActorActivity,
  pendingInvites,
  projectRoster,
} from "@/src/domain/people/queries";
import { projectBySlug, ticketStateCounts } from "@/src/domain/project/queries";
import { shortAgo, timeAgo } from "@/src/lib/format";

import { addMemberAction, removeMemberAction, revokeInviteAction } from "./actions";
import { CopyLinkButton } from "./copy-link";
import { InviteForm } from "./invite-form";

export const dynamic = "force-dynamic";

export default async function ProjectMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireOwner();
  const { slug } = await params;
  const project = await projectBySlug(slug);
  if (!project) notFound();

  const [roster, pending, offRoster, activity, counts, cursor] = await Promise.all([
    projectRoster(project.id),
    pendingInvites(project.id),
    collaboratorsNotOnProject(project.id),
    latestActorActivity(30),
    ticketStateCounts(project.id),
    latestCursor(),
  ]);

  const dayStart = todayStart();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const identity = (p: { displayName: string; handle: string | null; email: string | null; role: string }): PersonIdentity => ({
    displayName: p.displayName,
    handle: p.handle,
    email: p.email,
    isOwner: p.role === "owner",
  });
  const isActiveToday = (p: (typeof roster)[number]) => activeToday(identity(p), activity, dayStart);
  const activeTodayCount = roster.filter(isActiveToday).length;
  const activeThisWeek = roster.filter((p) => {
    const at = lastActiveAt(identity(p), activity);
    return at !== null && at >= weekStart;
  }).length;
  const collaborators = roster.filter((p) => p.role === "collaborator").length;
  const ticketsFiled = Object.values(counts.byState).reduce((s, n) => s + n, 0);

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      <PageHeader kind="routed" breadcrumb={`Projects · ${project.name} · Members`}>
        <div className="grid grid-cols-[1fr_360px] gap-16">
          {/* MAIN COL (M:118–283) */}
          <div className="max-w-2xl">
            {/* Hero — title + stats inline (M:121–131) */}
            <div className="flex items-baseline gap-6 flex-wrap">
              <h1 className="text-5xl font-bold tracking-tighter">Members.</h1>
              <p className="text-base text-stone-500">
                <span className="font-mono text-stone-900">{roster.length}</span> on this
                Project ·{" "}
                <span className="font-mono text-stone-900">{activeTodayCount}</span> active
                today
              </p>
            </div>

            {/* MEMBERS list — divided rows (M:133–193) */}
            <section className="mt-16">
              <MonoSectionLabel rule count={roster.length}>
                Roster
              </MonoSectionLabel>
              <ul className="divide-y divide-stone-200">
                {roster.map((m) => {
                  const active = isActiveToday(m);
                  const last = lastActiveAt(identity(m), activity);
                  return (
                    <li
                      key={m.userId}
                      className="py-5 grid grid-cols-[32px_1fr_auto_auto] items-center gap-5 group"
                    >
                      {/* Member mark — mirrors brand `a` / user `o` (M:150) */}
                      <InitialMark
                        initial={m.initial}
                        presence={active ? "emerald" : undefined}
                      />

                      {/* Identity (M:160–172) */}
                      <div>
                        <div className="text-base text-stone-900 font-medium tracking-tight">
                          {m.userId === user.id ? "You" : m.displayName}
                          {m.role === "owner" && (
                            <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-amber-700">
                              owner
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-stone-500">
                          {m.email ?? (m.handle ? `@${m.handle}` : "—")}
                        </div>
                      </div>

                      {/* Last active (M:174–180; honest derivation — header) */}
                      <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400 text-right">
                        <div>{active ? "active today" : "last active"}</div>
                        {!active && (
                          <div className="text-stone-500">
                            {last ? shortAgo(last) : "no activity yet"}
                          </div>
                        )}
                      </div>

                      {/* Action affordance (M:182–189) */}
                      {m.role === "collaborator" ? (
                        <form action={removeMemberAction}>
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="userId" value={m.userId} />
                          <input type="hidden" name="slug" value={project.slug} />
                          <button
                            type="submit"
                            className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-rose-600 cursor-pointer opacity-0 group-hover:opacity-100 transition"
                          >
                            remove →
                          </button>
                        </form>
                      ) : (
                        /* M:188's w-[60px] spacer → an invisible twin of the
                           remove link (tripwire locks pixel widths to §3.1's
                           rail set; the alignment intent is identical) */
                        <span
                          aria-hidden
                          className="invisible font-mono text-[10px] uppercase tracking-widest"
                        >
                          remove →
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* In the circle, not on this project — the re-add path (see header) */}
            {offRoster.length > 0 && (
              <section className="mt-16">
                <MonoSectionLabel rule count={offRoster.length}>
                  In your circle, not on this project
                </MonoSectionLabel>
                <ul className="divide-y divide-stone-200">
                  {offRoster.map((m) => (
                    <li
                      key={m.userId}
                      className="py-5 grid grid-cols-[32px_1fr_auto] items-center gap-5 group"
                    >
                      <InitialMark initial={m.initial} />
                      <div>
                        <div className="text-base text-stone-900 font-medium tracking-tight">
                          {m.displayName}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-stone-500">
                          {m.email ?? "—"}
                        </div>
                      </div>
                      <form action={addMemberAction}>
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="userId" value={m.userId} />
                        <input type="hidden" name="slug" value={project.slug} />
                        <button
                          type="submit"
                          className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
                        >
                          add to this project →
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* INVITE form (M:195–240; honest delivery — header) */}
            <section className="mt-16" id="invite">
              <MonoSectionLabel>Invite a Collaborator</MonoSectionLabel>
              <p className="mt-4 text-base text-stone-500 leading-relaxed">
                They&rsquo;ll be able to file Tickets and see what the Engine ships, but
                won&rsquo;t see the code or the raw diffs. Accepting this invite also puts
                them on{" "}
                <span className="font-mono text-sm text-stone-700">{project.name}</span>
                &rsquo;s roster.
              </p>
              <InviteForm projectId={project.id} slug={project.slug} />
            </section>

            {/* PENDING invites (M:242–282) */}
            {pending.length > 0 && (
              <section className="mt-16">
                <MonoSectionLabel rule count={pending.length}>
                  Pending
                </MonoSectionLabel>
                <ul className="divide-y divide-stone-200">
                  {pending.map((inv) => (
                    <li
                      key={inv.id}
                      className="py-5 grid grid-cols-[1fr_auto] items-baseline gap-6 group"
                    >
                      <div>
                        <div className="text-base text-stone-900 font-medium font-mono tracking-tight">
                          {inv.email}
                        </div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          invited by you · {timeAgo(inv.createdAt)}
                        </div>
                        {inv.welcomeNote && (
                          <p className="mt-2 text-sm italic text-stone-500 leading-relaxed">
                            &ldquo;{inv.welcomeNote}&rdquo;
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition">
                        <CopyLinkButton magicLink={inviteMagicLink(inv.token)} />
                        <form action={revokeInviteAction}>
                          <input type="hidden" name="inviteId" value={inv.id} />
                          <input type="hidden" name="slug" value={project.slug} />
                          <button
                            type="submit"
                            className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-rose-600 cursor-pointer"
                          >
                            revoke ✕
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* RIGHT RAIL (M:285–371) */}
          <aside className="space-y-14">
            {/* Hero stat (M:287–318) */}
            <section>
              <MonoSectionLabel>On this Project</MonoSectionLabel>
              <div className="mt-3">
                <span className="relative text-2xl font-bold tracking-tight">
                  {roster.length} member{roster.length === 1 ? "" : "s"}
                  <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                1 Owner · {collaborators} Collaborator{collaborators === 1 ? "" : "s"} ·{" "}
                {pending.length} pending invite{pending.length === 1 ? "" : "s"}
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Active today</span>
                  <span className="font-mono text-stone-900">{activeTodayCount}</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Active this week</span>
                  <span className="font-mono text-stone-900">{activeThisWeek}</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Tickets filed</span>
                  <span className="font-mono text-stone-900">{ticketsFiled}</span>
                </li>
              </ul>
            </section>

            {/* Roles & permissions help (M:320–345) */}
            <section>
              <MonoSectionLabel>Roles</MonoSectionLabel>
              <div className="mt-5 space-y-5 text-sm leading-relaxed">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-amber-700">
                    owner
                  </div>
                  <p className="mt-1 text-stone-700">
                    Reviews everything the Engine produces. Approves what ships.
                    {/* M:332 "One per Project." → instance truth (header) */} One per
                    Atlas.
                  </p>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-stone-700">
                    collaborator
                  </div>
                  <p className="mt-1 text-stone-700">
                    Files Tickets and reads shipped summaries. Never sees code or raw
                    diffs.
                  </p>
                </div>
              </div>
            </section>

            {/* Quick invite card (M:347–358; honest repurpose — header) */}
            <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
              <MonoSectionLabel>Quick invite</MonoSectionLabel>
              {/* M13 copy-truth sweep — invites stay hand-delivered by design */}
              <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                Every invite returns a one-time magic link to share over Signal or Slack —
                Atlas doesn&rsquo;t email invites.
              </p>
              <a
                href="#invite"
                className="mt-5 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
              >
                write an invite →
              </a>
            </section>

            {/* Docs footer (M:360–370 — real M14 article) */}
            <section className="pt-4 border-t border-stone-200/80">
              <ul className="text-sm space-y-2">
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-500">Docs</span>
                  <Link
                    href="/docs/owner-and-collaborator"
                    className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
                  >
                    members & roles →
                  </Link>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </PageHeader>
    </main>
  );
}
