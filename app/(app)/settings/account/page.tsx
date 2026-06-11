/**
 * M10 — /settings/account (BB; PRD #40–#41): the Owner's identity
 * surface, REAL throughout.
 *
 * Ported from design/variants/variant-bb-account.tsx:132–433 (hero,
 * §4-M10 sections, profile mirror BB:150–166, email & sign-in rows
 * BB:182–235, connected services BB:238–283, sessions BB:286–326,
 * danger zone BB:328–344, rail BB:348–430).
 *
 * Sanctioned deviations (charter item 6 — render ONLY what is real;
 * recorded in HANDOFF-M10): Two-factor renders the honest "soon" note
 * (no 2FA management API in @neondatabase/auth 0.4.2-beta) instead of
 * BB's mocked "on · 8 recovery codes"; Email has no change link (no
 * changeEmail endpoint) — quiet mono note instead; Connected services
 * lists the REAL Neon Auth account providers (no fictional Claude
 * Code/GitHub rows, no revoke that would lock you out); the rail's
 * data-export card and mocked account-activity list drop (export
 * unbuilt; the audit log is M11); "sign out everywhere" is labelled
 * for what the API does — signs out the OTHER sessions.
 */
import { sql } from "drizzle-orm";

import { MonoSectionLabel } from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { SettingsShell } from "@/src/components/settings/SettingsShell";
import { db } from "@/src/db/client";
import { describeUserAgent, listConnectedAccounts, listSessions } from "@/src/domain/auth/account";
import { requireOwner } from "@/src/domain/auth/guard";
import { bridgeViews } from "@/src/domain/bridge/queries";
import { bridgePresence } from "@/src/domain/bridge/status";
import { latestCursor } from "@/src/domain/live/broker";
import { timeAgo } from "@/src/lib/format";

import { revokeOtherSessionsAction, revokeSessionAction } from "./actions";
import { DangerZone, DisplayNameForm, PasswordRow } from "./account-forms";

export const dynamic = "force-dynamic";

const PROVIDER_LABEL: Record<string, { name: string; sub: string }> = {
  credential: { name: "Email & password", sub: "how you sign in today" },
};

/** BB:356 "6 months in" — the tenure hero, computed honestly. */
function tenureLabel(since: Date, now: Date): string {
  const days = Math.floor((now.getTime() - since.getTime()) / 86_400_000);
  if (days < 1) return "Day one";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} in`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} in`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} in`;
}

async function railFacts(): Promise<{
  projects: number;
  collaborators: number;
  ticketsFiled: number;
  ticketsShipped: number;
}> {
  const rows = (await db.execute(sql`
    select
      (select count(*)::int from projects) as projects,
      (select count(*)::int from memberships where role = 'collaborator') as collaborators,
      (select count(*)::int from tickets) as tickets_filed,
      (select count(*)::int from tickets where state = 'shipped') as tickets_shipped
  `)) as unknown as {
    rows: Array<{
      projects: number;
      collaborators: number;
      tickets_filed: number;
      tickets_shipped: number;
    }>;
  };
  const row = rows.rows[0];
  return {
    projects: row?.projects ?? 0,
    collaborators: row?.collaborators ?? 0,
    ticketsFiled: row?.tickets_filed ?? 0,
    ticketsShipped: row?.tickets_shipped ?? 0,
  };
}

export default async function AccountPage() {
  const user = await requireOwner();
  const now = new Date();
  const [sessions, accounts, bridge, bridges, facts, cursor] = await Promise.all([
    listSessions(),
    listConnectedAccounts(),
    bridgePresence(),
    bridgeViews(now),
    railFacts(),
    latestCursor(),
  ]);
  const displayName = user.membership?.displayName ?? user.name;
  const initial =
    user.membership?.initial ?? (displayName || "o").charAt(0).toLowerCase();
  const memberSince = user.membership?.createdAt ?? null;
  // §2.1 — the user-mark dot is the BRIDGE's health, mirrored here.
  const dotClass =
    bridge.status === "healthy"
      ? "bg-emerald-500"
      : bridge.status === "offline"
        ? "bg-rose-500"
        : "bg-stone-300";

  return (
    <SettingsShell
      breadcrumb="Settings · Account"
      active="account"
      bridgeBadge={bridges.length}
      rail={
        <>
          {/* You hero — BB:350–377, real numbers only */}
          <section>
            <MonoSectionLabel>You on Atlas</MonoSectionLabel>
            <div className="mt-3">
              <span className="relative text-2xl font-bold tracking-tight">
                {memberSince ? tenureLabel(memberSince, now) : "The Owner"}
                <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
              </span>
            </div>
            <p className="mt-3 text-sm text-stone-500 leading-relaxed">
              {memberSince
                ? `Since ${memberSince.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. `
                : ""}
              {facts.ticketsFiled} Tickets on record, {facts.ticketsShipped} shipped.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Projects</span>
                <span className="font-mono text-stone-900">{facts.projects} owned</span>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Collaborators</span>
                <span className="font-mono text-stone-900">{facts.collaborators} across all</span>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Bridges</span>
                <span className="font-mono text-stone-900">{bridges.length} paired</span>
              </li>
            </ul>
          </section>

          {/* Footer — BB:424–429, made strictly true */}
          <section className="pt-4 border-t border-stone-200/80">
            <p className="text-sm italic text-stone-500 leading-relaxed">
              Atlas holds account metadata, Briefs, Run records and the diffs you review —
              your repositories stay on your machines.
            </p>
          </section>
        </>
      }
    >
      <LiveRefresh since={cursor} />
      <h1 className="text-5xl font-bold tracking-tighter">Account.</h1>
      <p className="mt-4 text-lg text-stone-500 leading-relaxed max-w-xl">
        The bits about you. Atlas keeps these private — they&rsquo;re never shared with
        Collaborators.
      </p>

      {/* Section: Profile — BB:141–180 */}
      <section className="mt-20 pb-14 border-b border-stone-200">
        <MonoSectionLabel>Profile</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          What Collaborators see when you reply or ship something.
        </p>
        <div className="mt-8 grid grid-cols-[auto_1fr] gap-6 items-baseline">
          {/* avatar mirror — the §2.1 user mark; the dot is Bridge health */}
          <div className="relative h-7 w-7 flex items-center justify-center">
            <span className="text-xl font-bold tracking-tighter leading-none text-stone-900">
              {initial}
            </span>
            <span className={`absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
          </div>
          <div>
            <div className="text-base text-stone-900 font-medium tracking-tight">
              {displayName}
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-stone-500">{user.email}</div>
          </div>
        </div>
        <DisplayNameForm displayName={displayName} />
      </section>

      {/* Section: Email & sign-in — BB:182–235, honest rows only */}
      <section className="mt-16 pb-14 border-b border-stone-200">
        <MonoSectionLabel>Email &amp; sign-in</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          How you get into Atlas.
        </p>
        <ul className="mt-8 divide-y divide-stone-200">
          <li className="py-4 flex items-baseline justify-between">
            <span>
              <span className="block text-base text-stone-900 font-medium">Email</span>
              <span className="mt-0.5 block font-mono text-[11px] text-stone-500">
                {user.email}
              </span>
            </span>
            {/* deviation: no changeEmail endpoint in this Neon Auth beta */}
            <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
              change · soon
            </span>
          </li>
          <PasswordRow />
          <li className="py-4 flex items-baseline justify-between">
            <span>
              <span className="flex items-baseline gap-2">
                <span className="text-base text-stone-900 font-medium">Two-factor</span>
              </span>
              <span className="mt-0.5 block font-mono text-[11px] text-stone-500">
                Neon Auth&rsquo;s 2FA management isn&rsquo;t wired in this beta
              </span>
            </span>
            {/* charter item 6 — honest "soon", never a dead switch */}
            <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
              soon
            </span>
          </li>
        </ul>
      </section>

      {/* Section: Connected services — BB:238–283 over real providers */}
      <section className="mt-16 pb-14 border-b border-stone-200">
        <MonoSectionLabel>Connected services</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          The sign-in methods attached to your Neon Auth identity.
        </p>
        {accounts.length === 0 ? (
          <p className="mt-8 text-sm italic text-stone-500">
            Nothing connected beyond your session.
          </p>
        ) : (
          <ul className="mt-8 divide-y divide-stone-200">
            {accounts.map((a, i) => {
              const label = PROVIDER_LABEL[a.providerId] ?? {
                name: a.providerId,
                sub: "connected provider",
              };
              return (
                <li key={i} className="py-4 flex items-baseline justify-between">
                  <span>
                    <span className="flex items-baseline gap-2">
                      <span className="text-base text-stone-900 font-medium">{label.name}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                        active
                      </span>
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] text-stone-500">
                      {label.sub}
                      {a.createdAt ? ` · since ${timeAgo(a.createdAt, now)}` : ""}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Section: Active sessions — BB:286–326, the real list */}
      <section className="mt-16 pb-14 border-b border-stone-200">
        <MonoSectionLabel>Active sessions</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          Where you&rsquo;re signed in right now.
        </p>
        <ul className="mt-8 divide-y divide-stone-200">
          {sessions.map((s) => (
            <li key={s.token} className="py-4 flex items-baseline justify-between group">
              <span>
                <span className="flex items-baseline gap-2">
                  <span className="text-base text-stone-900 font-medium">
                    {describeUserAgent(s.userAgent)}
                  </span>
                  {s.current && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                      this device
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block font-mono text-[11px] text-stone-500">
                  {s.ipAddress ? `${s.ipAddress} · ` : ""}
                  signed in {s.createdAt ? timeAgo(s.createdAt, now) : "—"}
                </span>
              </span>
              {!s.current && (
                <form action={revokeSessionAction}>
                  <input type="hidden" name="token" value={s.token} />
                  <button
                    type="submit"
                    className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-rose-600 cursor-pointer"
                  >
                    sign out →
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {sessions.filter((s) => !s.current).length > 0 && (
          <form action={revokeOtherSessionsAction} className="mt-5">
            <button
              type="submit"
              className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-rose-600 cursor-pointer"
            >
              sign out other sessions →
            </button>
          </form>
        )}
      </section>

      {/* Section: Leave Atlas — BB:328–344 + §3.7 step 2 → §2.11 modal */}
      <section className="mt-16">
        <MonoSectionLabel>Leave Atlas</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-700 leading-relaxed">
          Delete your account: the Owner slot frees, every Bridge and API token is
          revoked. There&rsquo;s no undo.
        </p>
        <p className="mt-2 text-sm italic text-stone-500 leading-relaxed">
          Projects and Tickets stay — they are the instance&rsquo;s record. Your code on
          your machines stays where it is.
        </p>
        <div className="mt-6">
          <DangerZone confirmName={user.email} />
        </div>
      </section>
    </SettingsShell>
  );
}
