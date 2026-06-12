/**
 * M10 — /settings/notifications (CC; the storage half of PRD #48).
 *
 * Ported from design/variants/variant-cc-notifs.tsx:118–360 (hero,
 * Where/How-often/What-you-care-about/Quiet-hours/Email-format sections,
 * rail CC:271–357). Preferences are REAL rows the Notifier (M13) reads.
 *
 * Sanctioned deviations (charter item 7 — copy tells the truth about
 * what delivers TODAY; recorded in HANDOFF-M10): CC's "Send test pack"
 * card would fake a delivery — replaced by the honest note; the rail's
 * mocked sent-counts are replaced by real tallies; "preview a sample
 * email ↗" drops. Event groups keep CC's structure with owner-true copy.
 *
 * M13 — delivery is REAL now (charter item 5's copy-truth sweep): the
 * lede / Email row / rail / footer state the live truth per
 * configuration — sending when RESEND_API_KEY exists, composing to the
 * outbox record when not. Collaborators get their own chrome
 * (collab-notifications.tsx) over the same table and controls.
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

import { emailConfigured } from "@/src/domain/notifier/deliver";
import { outboxTally } from "@/src/domain/notifier/outbox";

import { CollabNotificationsPage } from "./collab-notifications";
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
  // M13 — Collaborators get the same table + controls under their own
  // chrome (PRD #48); the Owner settings shell stays the Owner's tier.
  if (user.role === "collaborator") {
    return <CollabNotificationsPage user={user} />;
  }
  const [prefs, weekCount, bridges, cursor, tally] = await Promise.all([
    notificationPrefs(user.id),
    inboxCount7d(),
    bridgeViews(),
    latestCursor(),
    outboxTally(),
  ]);
  const emailLive = emailConfigured();

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
            {/* M13 copy-truth sweep — the Notifier shipped; say what's real */}
            <p className="mt-3 text-sm text-stone-500 leading-relaxed">
              {emailLive ? (
                <>
                  Everything lands in your inbox; ship emails and digests send to your
                  Collaborators via Resend.
                </>
              ) : (
                <>
                  Everything lands in your inbox; Collaborator emails compose to the
                  outbox record and send once a Resend key is configured.
                </>
              )}
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Inbox events · 7d</span>
                <span className="font-mono text-stone-900">{weekCount}</span>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Emails sent</span>
                <span className="font-mono text-stone-900">{tally.sent}</span>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Composed, waiting</span>
                <span className="font-mono text-stone-900">{tally.composed}</span>
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

          {/* Footer — CC:352–357; M13 copy-truth sweep (the Notifier is live) */}
          <section className="pt-4 border-t border-stone-200/80">
            <p className="text-sm italic text-stone-500 leading-relaxed">
              {emailLive ? (
                <>
                  These preferences are the contract the Notifier honors on every send —
                  the outbox record on each profile shows every decision it made.
                </>
              ) : (
                <>
                  No Resend key is configured, so Atlas composes email to the outbox
                  record without sending. Add RESEND_API_KEY and these preferences govern
                  real delivery — nothing else changes.
                </>
              )}
            </p>
          </section>
        </>
      }
    >
      <LiveRefresh since={cursor} />
      <h1 className="text-5xl font-bold tracking-tighter">Notifications.</h1>
      {/* M13 copy-truth sweep — email delivery is real (key-gated) */}
      <p className="mt-4 text-lg text-stone-500 leading-relaxed max-w-xl">
        {emailLive ? (
          <>
            The feed, your inbox, and Collaborator email are live. Tell Atlas how loud
            and how often — it saves as you change things.
          </>
        ) : (
          <>
            The feed and your inbox are live; Collaborator emails compose now and send
            once a Resend key is configured. Tell Atlas how loud and how often — it
            saves as you change things.
          </>
        )}
      </p>

      {/* WHERE — CC:127–154 */}
      <section className="mt-20 pb-14 border-b border-stone-200">
        <MonoSectionLabel>Where</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          The channels Atlas can reach you on.
        </p>
        <ul className="mt-7 divide-y divide-stone-200">
          {/* M13 copy-truth sweep — the Email row states the live truth */}
          <ChannelRow
            label="Email"
            sub={`${user.email} · ${emailLive ? "delivering via Resend" : "sends once a Resend key is configured"}`}
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
        {/* M13 copy-truth sweep — present tense; the hold is real */}
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          The Notifier holds email until your window opens. Leave both empty for no
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
        {/* M13 copy-truth sweep — emails render now */}
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          How emails render in the recipient&rsquo;s inbox.
        </p>
        <div className="mt-7">
          <EmailFormatControl format={prefs.emailFormat} />
        </div>
      </section>
    </SettingsShell>
  );
}
