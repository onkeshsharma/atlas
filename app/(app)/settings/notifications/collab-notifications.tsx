/**
 * M13 — the Collaborator's notification preferences (PRD #48; charter
 * item 4). M10's page SHAPE (CC sections: Where / How often / What you
 * care about / Quiet hours / Email format) over the SAME table, row and
 * controls — zero forks; only the chrome differs: no Owner settings
 * subnav (the rest of /settings is the Owner's tier), a §2.2 routed
 * header + `[1fr_360px]` grid instead.
 *
 * Owner-only event keys (CC's "Triage queue ≥ 5" — its own sub says
 * Owner-only) don't render for this persona; the stored map keeps the
 * key so nothing is lost if roles ever widen (recorded).
 */
import { MonoSectionLabel, PageHeader } from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import type { CurrentUser } from "@/src/domain/auth/current-user";
import { latestCursor } from "@/src/domain/live/broker";
import { emailConfigured } from "@/src/domain/notifier/deliver";
import { outboxTally } from "@/src/domain/notifier/outbox";
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

const OWNER_ONLY_EVENT_KEYS = new Set(["triage-backlog"]);

export async function CollabNotificationsPage({ user }: { user: CurrentUser }) {
  const [prefs, tally, cursor] = await Promise.all([
    notificationPrefs(user.id),
    outboxTally(user.id),
    latestCursor(),
  ]);
  const emailLive = emailConfigured();

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      <PageHeader kind="routed" breadcrumb="Settings · Notifications">
        <div className="grid grid-cols-[1fr_360px] gap-16">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold tracking-tighter">Notifications.</h1>
            <p className="mt-4 text-lg text-stone-500 leading-relaxed max-w-xl">
              {emailLive ? (
                <>
                  Ship emails and the weekly digest are live. Tell Atlas how loud and how
                  often — it saves as you change things.
                </>
              ) : (
                <>
                  Your inbox here is live now; ship emails and the weekly digest start
                  sending once the Owner configures a Resend key. Your preferences apply
                  either way — it saves as you change things.
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
                <ChannelRow
                  label="Email"
                  sub={`${user.email} · ${emailLive ? "ship emails + weekly digest" : "sends once a Resend key is configured"}`}
                  on={prefs.emailEnabled}
                />
                <ChannelRow
                  label="In-app inbox"
                  sub="your Inbox page — always the durable record"
                  locked="always on"
                />
              </ul>
            </section>

            {/* HOW OFTEN — CC:157–178 */}
            <section className="mt-16 pb-14 border-b border-stone-200">
              <MonoSectionLabel>How often</MonoSectionLabel>
              <p className="mt-4 text-base text-stone-500 leading-relaxed">
                Instant pings per ship, a morning batch, the Monday digest only — or
                nothing at all.
              </p>
              <div className="mt-7">
                <FrequencyControl frequency={prefs.frequency} />
              </div>
            </section>

            {/* WHAT YOU CARE ABOUT — CC:181–211, owner-only keys hidden */}
            <section className="mt-16 pb-14 border-b border-stone-200">
              <MonoSectionLabel>What you care about</MonoSectionLabel>
              <p className="mt-4 text-base text-stone-500 leading-relaxed">
                Each kind of event toggles independently.
              </p>
              {EVENT_GROUPS.map((group) => {
                const events = group.events.filter((e) => !OWNER_ONLY_EVENT_KEYS.has(e.key));
                if (!events.length) return null;
                return (
                  <div key={group.group} className="mt-10 space-y-1 first:mt-7">
                    <div className="text-xs font-mono uppercase tracking-widest text-stone-500 pb-2">
                      {group.group}
                    </div>
                    <ul className="divide-y divide-stone-200">
                      {events.map((event) => (
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
                );
              })}
            </section>

            {/* QUIET HOURS — CC:214–246 */}
            <section className="mt-16 pb-14 border-b border-stone-200">
              <MonoSectionLabel>Quiet hours</MonoSectionLabel>
              <p className="mt-4 text-base text-stone-500 leading-relaxed">
                Email holds until your window opens. Leave both empty for no quiet
                window.
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
                Editorial is the designed email; plain text is exactly that.
              </p>
              <div className="mt-7">
                <EmailFormatControl format={prefs.emailFormat} />
              </div>
            </section>
          </div>

          {/* RAIL — CC's shape over THIS user's real outbox rows */}
          <aside className="space-y-14">
            <section>
              <MonoSectionLabel>Your email record</MonoSectionLabel>
              <div className="mt-3">
                <span className="relative text-2xl font-bold tracking-tight">
                  {tally.sent} sent
                  <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                Every email Atlas composes for you is on this record — sent or not.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Sent</span>
                  <span className="font-mono text-stone-900">{tally.sent}</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Composed, waiting</span>
                  <span className="font-mono text-stone-900">{tally.composed}</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-700">Held by your preferences</span>
                  <span className="font-mono text-stone-900">{tally.skipped}</span>
                </li>
              </ul>
            </section>

            <section>
              <MonoSectionLabel>How it behaves</MonoSectionLabel>
              <ul className="mt-5 space-y-3 text-sm text-stone-700 leading-relaxed">
                <li className="flex items-baseline gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>
                    Ship emails go to the person who filed the Ticket — that&rsquo;s you,
                    for yours.
                  </span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>
                    The weekly digest rounds up your projects every Monday morning — or
                    pick &ldquo;Weekly digest&rdquo; above to hear ONLY that.
                  </span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>Quiet hours hold email until the window opens — never lost.</span>
                </li>
              </ul>
            </section>

            <section className="pt-4 border-t border-stone-200/80">
              <p className="text-sm italic text-stone-500 leading-relaxed">
                {emailLive ? (
                  <>
                    These preferences are the contract the Notifier honors on every
                    send.
                  </>
                ) : (
                  <>
                    No key, no email — composed messages wait on this record until the
                    Owner connects Resend. Nothing depends on your real inbox yet.
                  </>
                )}
              </p>
            </section>
          </aside>
        </div>
      </PageHeader>
    </main>
  );
}
