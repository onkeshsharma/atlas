/**
 * M10 — /settings/profile (QQ; charter item 8): who-you-are, real
 * fields with §2.13 validation.
 *
 * Ported from design/variants/variant-qq-profile.tsx:65–349 — the
 * standalone settings-page shape (breadcrumb + horizontal mono subnav
 * QQ:66–75, `[1fr_320px]` grid QQ:77), hero QQ:80–89, Profile dl rows
 * QQ:91–133 (Field recipe QQ:362–412), monogram rail card QQ:285–306,
 * at-a-glance QQ:308–320.
 *
 * Sanctioned deviations (recorded in HANDOFF-M10): QQ's Sign-in,
 * Active-sessions, Recent-activity and Danger sections are NOT ported
 * here — the charter scopes them to /settings/account (item 6 owns
 * sessions/danger; auth-event history is M11's audit log) — one surface
 * per concern, no duplicated session list. QQ's Timezone row defers to
 * the Notifications page (quiet hours own the zone); "edit avatar →"
 * drops (§2.18: identity is typographic — there is no avatar to edit);
 * the profile-URL card drops (no public profile route exists); the
 * closing italic is rewritten true (the audit log is M11; auth emails
 * are M13's).
 */
import { sql } from "drizzle-orm";

import { LivePulse, MonoSectionLabel, PageHeader, SubnavLink } from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireOwner } from "@/src/domain/auth/guard";
import { bridgePresence } from "@/src/domain/bridge/status";
import { db } from "@/src/db/client";
import { latestCursor } from "@/src/domain/live/broker";

import { FieldRow } from "./field-editor";

export const dynamic = "force-dynamic";

async function glanceFacts(): Promise<{
  projects: number;
  tickets: number;
  shippedRuns: number;
  collaborators: number;
}> {
  const rows = (await db.execute(sql`
    select
      (select count(*)::int from projects) as projects,
      (select count(*)::int from tickets) as tickets,
      (select count(*)::int from runs where state = 'shipped') as shipped_runs,
      (select count(*)::int from memberships where role = 'collaborator') as collaborators
  `)) as unknown as {
    rows: Array<{ projects: number; tickets: number; shipped_runs: number; collaborators: number }>;
  };
  const row = rows.rows[0];
  return {
    projects: row?.projects ?? 0,
    tickets: row?.tickets ?? 0,
    shippedRuns: row?.shipped_runs ?? 0,
    collaborators: row?.collaborators ?? 0,
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="font-mono text-stone-700">{value}</span>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await requireOwner();
  const [bridge, facts, cursor] = await Promise.all([
    bridgePresence(),
    glanceFacts(),
    latestCursor(),
  ]);
  const displayName = user.membership?.displayName ?? user.name;
  const handle = user.membership?.handle ?? null;
  const storedInitial = user.membership?.initial ?? null;
  const initial = (storedInitial ?? (displayName || "o").charAt(0)).toLowerCase();
  const since = user.membership?.createdAt ?? null;
  const sinceLabel = since
    ? since.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      <PageHeader
        kind="routed"
        breadcrumb="Settings · Account · Profile"
        nav={
          <>
            <SubnavLink href="/settings">Preferences</SubnavLink>
            <SubnavLink href="/settings/account">Account</SubnavLink>
            <SubnavLink active>Profile</SubnavLink>
          </>
        }
      />

      <div className="mt-8 grid grid-cols-[1fr_320px] gap-16">
        <div className="max-w-2xl">
          {/* Hero — QQ:79–89 */}
          <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
            Signed in as
          </div>
          <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-[1.05]">
            {displayName}.
          </h1>
          <p className="mt-4 text-xl text-stone-700 leading-relaxed">
            {sinceLabel ? `Owner since ${sinceLabel}. ` : ""}
            Everything Atlas ships goes through this account.
          </p>

          {/* PROFILE BASICS — QQ:91–133 */}
          <section className="mt-16">
            <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Profile
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                visible to Collaborators
              </span>
            </div>
            <dl className="divide-y divide-stone-200">
              <FieldRow
                label="Display name"
                display={displayName}
                raw={displayName}
                field="displayName"
                hint="How Collaborators see you in Ticket comments and emails."
              />
              <FieldRow
                label="Initial"
                display={
                  storedInitial ? (
                    storedInitial
                  ) : (
                    <>
                      {initial}{" "}
                      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                        · derived
                      </span>
                    </>
                  )
                }
                raw={storedInitial ?? ""}
                field="initial"
                mono
                placeholder={initial}
                hint="The single letter shown as your sidebar mark. Auto-derived from your name; save one letter to override, clear to derive again."
              />
              <FieldRow
                label="Handle"
                display={
                  handle ? (
                    `@${handle}`
                  ) : (
                    <span className="text-stone-400 italic text-sm">not set</span>
                  )
                }
                raw={handle ?? ""}
                field="handle"
                mono
                placeholder="@you"
                hint="Your unique mention handle, for the day @-mentions ship."
              />
              <FieldRow
                label="Role"
                display="Owner · all Projects"
                locked
                hint="Owners review every diff. You can’t downgrade your own role."
              />
              <FieldRow
                label="Email"
                display={<span className="font-mono text-sm">{user.email}</span>}
                locked
                hint="Used for sign-in. Email change ships with the Neon Auth 2FA work — see Account."
              />
            </dl>
          </section>

          {/* closing note — QQ:273–279, made true */}
          <p className="mt-16 text-sm italic text-stone-500 leading-relaxed">
            Profile changes write to the instance record; the audit log that will show
            them arrives with the People surfaces (M11).
          </p>
        </div>

        {/* RAIL — QQ:283–349 */}
        <aside className="space-y-12">
          {/* the big monogram — QQ:285–306; the dot is Bridge health (§2.1) */}
          <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-8 text-center">
            <div className="relative inline-flex h-28 w-28 rounded-full bg-stone-900 text-stone-50 items-center justify-center text-6xl font-bold tracking-tighter leading-none">
              <span className="block leading-none -mt-2">{initial}</span>
              <span
                className={`absolute right-3 top-3 inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                  bridge.status === "healthy"
                    ? "bg-emerald-500"
                    : bridge.status === "offline"
                      ? "bg-rose-500"
                      : "bg-stone-300"
                }`}
              />
            </div>
            <div className="mt-5 text-base font-medium text-stone-900">{displayName}</div>
            <div className="mt-1 font-mono text-xs text-stone-500">
              {handle ? `@${handle}` : user.email}
            </div>
            {bridge.status === "healthy" ? (
              <div className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                <LivePulse color="emerald" />
                Bridge online
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    bridge.status === "offline" ? "bg-rose-500" : "bg-stone-300"
                  }`}
                />
                {bridge.status === "offline" ? "Bridge offline" : "no Bridge paired"}
              </div>
            )}
          </section>

          {/* At-a-glance — QQ:308–320, real numbers */}
          <section>
            <MonoSectionLabel>At a glance</MonoSectionLabel>
            <dl className="mt-5 space-y-3">
              <Stat label="Projects" value={`${facts.projects} owned`} />
              <Stat label="Tickets" value={`${facts.tickets} on record`} />
              <Stat label="Runs shipped" value={`${facts.shippedRuns} via Atlas`} />
              <Stat
                label="Member since"
                value={
                  since
                    ? since.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"
                }
              />
              <Stat label="Trust circle" value={`${facts.collaborators} Collaborators`} />
            </dl>
          </section>

          {/* footer — QQ:342–348, made true */}
          <section className="pt-4 border-t border-stone-200/80">
            <p className="text-sm italic text-stone-500 leading-relaxed">
              Atlas treats your account like a code review — changes land as plain rows
              you can read. Nothing here is hidden state.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
