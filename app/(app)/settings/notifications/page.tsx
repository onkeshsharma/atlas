/**
 * M10 — /settings/notifications (CC; the storage half of PRD #48).
 *
 * Ported from design/variants/variant-cc-notifs.tsx:118–360 (hero,
 * Where/How-often/What-you-care-about/Quiet-hours/Email-format sections,
 * rail CC:271–357). Preferences are REAL rows the Notifier (M13) reads.
 *
 * Sanctioned deviations (charter item 7 — copy tells the truth about
 * what delivers TODAY; recorded in HANDOFF-M10): the lede + Email
 * channel row say plainly that email delivery hasn't shipped (feed and
 * inbox deliver now; the rows are the contract M13 honors); CC's
 * "Send test pack" card would fake a delivery — replaced by the honest
 * note; the rail's mocked sent-counts are replaced by the real 7-day
 * inbox tally; "preview a sample email ↗" drops (emails are M13's).
 * Event groups keep CC's structure with owner-true copy.
 */
import { sql } from "drizzle-orm";

import { MonoSectionLabel } from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { SettingsShell } from "@/src/components/settings/SettingsShell";
import { db } from "@/src/db/client";
import { requireUser } from "@/src/domain/auth/guard";
import { bridgeViews } from "@/src/domain/bridge/queries";
import { latestCursor } from "@/src/domain/live/broker";
import {
  EVENT_GROUPS,
  notificationPrefs,
} from "@/src/domain/notifications/preferences";

import {
  ChannelRow,
  EmailFormatControl,
  EventRow,
  FrequencyControl,
  QuietHoursForm,
} from "./notif-controls";

export const dynamic = "force-dynamic";

async function inboxCount7d(): Promise<number> {
  const rows = (await db.execute(sql`
    select count(*)::int as n from feed_events where created_at > now() - interval '7 days'
  `)) as unknown as { rows: Array<{ n: number }> };
  return rows.rows[0]?.n ?? 0;
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const [prefs, weekCount, bridges, cursor] = await Promise.all([
    notificationPrefs(user.id),
    inboxCount7d(),
    bridgeViews(),
    latestCursor(),
  ]);

  return (
    <SettingsShell
      breadcrumb="Settings · Notifications"
      active="notifications"
      bridgeBadge={bridges.length}
      rail={
        <>
          {/* This week — CC:273–299, the REAL inbox tally */}
          <section>
            <MonoSectionLabel>This week</MonoSectionLabel>
            <div className="mt-3">
              <span className="relative text-2xl font-bold tracking-tight">
                {weekCount} in the feed
                <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
              </span>
            </div>
            <p className="mt-3 text-sm text-stone-500 leading-relaxed">
              Everything lands in your inbox now; email joins when the Notifier ships.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Inbox events · 7d</span>
                <span className="font-mono text-stone-900">{weekCount}</span>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Emails sent</span>
                <span className="font-mono text-stone-900">0 · not wired yet</span>
              </li>
            </ul>
          </section>

          {/* Tips — CC:321–349 */}
          <section>
            <MonoSectionLabel>Tips</MonoSectionLabel>
            <ul className="mt-5 space-y-3 text-sm text-stone-700 leading-relaxed">
              <li className="flex items-baseline gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>
                  If you only care about ships, set everything else to off and keep
                  Frequency on instant.
                </span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>
                  Daily digest works well if you check Atlas at the same time each day
                  anyway.
                </span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>
                  Owner-only events (like the Triage queue ping) help you notice when
                  Collaborators are waiting.
                </span>
              </li>
            </ul>
          </section>

          {/* Footer — CC:352–357, made true */}
          <section className="pt-4 border-t border-stone-200/80">
            <p className="text-sm italic text-stone-500 leading-relaxed">
              Atlas sends no email today. When the Notifier ships, these preferences are
              the contract it honors — saved now so nothing surprises you later.
            </p>
          </section>
        </>
      }
    >
      <LiveRefresh since={cursor} />
      <h1 className="text-5xl font-bold tracking-tighter">Notifications.</h1>
      <p className="mt-4 text-lg text-stone-500 leading-relaxed max-w-xl">
        The feed and your inbox are live now; email ships with the Notifier. Tell Atlas
        how loud and how often — it saves as you change things.
      </p>

      {/* WHERE — CC:127–154 */}
      <section className="mt-20 pb-14 border-b border-stone-200">
        <MonoSectionLabel>Where</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          The channels Atlas can reach you on.
        </p>
        <ul className="mt-7 divide-y divide-stone-200">
          <ChannelRow
            label="Email"
            sub={`${user.email} · delivery starts when the Notifier ships`}
            on={prefs.emailEnabled}
          />
          <ChannelRow
            label="In-app inbox"
            sub="the · o · mark in your sidebar"
            locked="always on"
          />
          <ChannelRow label="Slack" sub="connect a workspace" locked="soon" />
        </ul>
      </section>

      {/* HOW OFTEN — CC:157–178 */}
      <section className="mt-16 pb-14 border-b border-stone-200">
        <MonoSectionLabel>How often</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          Atlas can ping you on every event, or batch it up.
        </p>
        <div className="mt-7">
          <FrequencyControl frequency={prefs.frequency} />
        </div>
      </section>

      {/* WHAT YOU CARE ABOUT — CC:181–211 */}
      <section className="mt-16 pb-14 border-b border-stone-200">
        <MonoSectionLabel>What you care about</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          Each kind of event toggles independently.
        </p>
        {EVENT_GROUPS.map((group, gi) => (
          <div key={group.group} className={gi === 0 ? "mt-7 space-y-1" : "mt-10 space-y-1"}>
            <div className="text-xs font-mono uppercase tracking-widest text-stone-500 pb-2">
              {group.group}
            </div>
            <ul className="divide-y divide-stone-200">
              {group.events.map((event) => (
                <EventRow
                  key={event.key}
                  eventKey={event.key}
                  label={event.label}
                  sub={event.sub}
                  on={prefs.events[event.key] ?? event.defaultOn}
                />
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* QUIET HOURS — CC:214–246 */}
      <section className="mt-16 pb-14 border-b border-stone-200">
        <MonoSectionLabel>Quiet hours</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          The Notifier will hold email until your window opens. Leave both empty for no
          quiet window.
        </p>
        <QuietHoursForm
          quietFrom={prefs.quietFrom}
          quietUntil={prefs.quietUntil}
          timezone={prefs.timezone}
        />
      </section>

      {/* EMAIL FORMAT — CC:249–267 */}
      <section className="mt-16">
        <MonoSectionLabel>Email format</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          How emails will render in your inbox, once they send.
        </p>
        <div className="mt-7">
          <EmailFormatControl format={prefs.emailFormat} />
        </div>
      </section>
    </SettingsShell>
  );
}
