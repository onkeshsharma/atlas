// THROWAWAY — Editorial Profile prototype.
// The Owner's own identity surface. Sits inside Settings/Account but reads
// as its own page (you/<handle>). Distinct from settings (preferences) — this
// is who-you-are and how-you-sign-in.

import { NAV } from "./mock-data";

const SESSIONS = [
  {
    label: "this browser",
    device: "Chrome 124 · macOS",
    where: "Bristol, UK",
    last: "active now",
    current: true,
  },
  {
    label: "Bridge daemon",
    device: "atlas-bridge v1.3.0 · darwin",
    where: "this machine",
    last: "heartbeat 12s ago",
    current: false,
  },
  {
    label: "iPhone 15",
    device: "Safari · iOS 17",
    where: "Bristol, UK",
    last: "3 days ago",
    current: false,
  },
];

const RECENT_ACTIVITY = [
  { what: "Signed in from this browser", when: "10:42 today" },
  { what: "Approved PR #142 on atlas-internal", when: "yesterday · 18:14" },
  { what: "Updated 2FA backup codes", when: "May 10 · 09:02" },
  { what: "Changed display name", when: "May 8 · 11:30" },
];

export function VariantQQProfile() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          <aside className="w-[56px] shrink-0 sticky top-0 h-screen self-start flex flex-col items-center justify-between py-8 border-r border-stone-200/60 z-10">
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none">a</div>
            </div>
            <nav className="flex flex-col items-center gap-5">
              {NAV.map((n) => (
                <a
                  key={n.key}
                  className="relative h-7 w-7 flex items-center justify-center cursor-pointer transition text-stone-400 hover:text-stone-900"
                >
                  <span className="text-base font-medium">{n.short.charAt(0)}</span>
                </a>
              ))}
            </nav>
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none text-stone-900">o</div>
              <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
          </aside>

          <main className="flex-1 px-16 pt-8 pb-24">
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Settings · Account · Profile
              </div>
              <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-widest text-stone-500">
                <a className="hover:text-stone-900 cursor-pointer">Preferences</a>
                <a className="hover:text-stone-900 cursor-pointer">Billing</a>
                <a className="text-stone-900 cursor-pointer border-b border-amber-500 pb-0.5">Profile</a>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_320px] gap-16">
              <div className="max-w-2xl">
                {/* Big editorial introduction */}
                <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
                  Signed in as
                </div>
                <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-[1.05]">
                  Onkesh.
                </h1>
                <p className="mt-4 text-xl text-stone-700 leading-relaxed">
                  Owner since April 28, 2026. Everything Atlas ships goes through
                  this account.
                </p>

                {/* PROFILE BASICS */}
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
                    <Field
                      label="Display name"
                      value="Onkesh"
                      hint="How Collaborators see you in Ticket comments and emails."
                      edit
                    />
                    <Field
                      label="Initial"
                      value="O"
                      hint="The single letter shown in the bottom-left sidebar dot. Auto-derived from your name; tap edit to override."
                      edit
                    />
                    <Field
                      label="Handle"
                      value="@onkesh"
                      hint="Your unique mention handle. Used in @-mentions and your profile URL."
                      edit
                    />
                    <Field
                      label="Role"
                      value="Owner · all Projects"
                      hint="Owners review every diff. You can't downgrade your own role."
                      readOnly
                    />
                    <Field
                      label="Timezone"
                      value="Europe/London · BST (+01:00)"
                      hint="Used for time-stamps everywhere. Auto-detected from this browser."
                      edit
                    />
                  </dl>
                </section>

                {/* SIGN-IN */}
                <section className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Sign-in
                    </h2>
                  </div>
                  <dl className="divide-y divide-stone-200">
                    <Field
                      label="Email"
                      value="onkesh19@gmail.com"
                      hint="Used for sign-in and Ship Notifications. Changing this re-verifies."
                      edit
                    />
                    <Field
                      label="Password"
                      value="•••••••••••• (last changed 47 days ago)"
                      hint="Argon2id. We don't see your password — only its hash."
                      action="Change"
                    />
                    <Field
                      label="Two-factor"
                      value="On · TOTP"
                      tag="strongly recommended"
                      hint="Required for Owners. Backup codes regenerate after each use; you have 7 left."
                      action="Manage"
                    />
                    <Field
                      label="Backup codes"
                      value="7 / 10 remaining"
                      hint="Each code works once. Regenerate when you've used most of them."
                      action="Regenerate"
                    />
                  </dl>
                </section>

                {/* ACTIVE SESSIONS */}
                <section className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Active sessions
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      {SESSIONS.length} signed in
                    </span>
                  </div>
                  <ul className="divide-y divide-stone-200">
                    {SESSIONS.map((s) => (
                      <li
                        key={s.label}
                        className="py-5 grid grid-cols-[120px_1fr_auto] items-baseline gap-6"
                      >
                        <span className="font-mono text-xs uppercase tracking-widest text-stone-500">
                          {s.label}
                        </span>
                        <div>
                          <div className="text-base font-medium text-stone-900">
                            {s.device}
                          </div>
                          <div className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                            <span>{s.where}</span>
                            <span className="text-stone-300">·</span>
                            <span
                              className={s.current ? "text-emerald-700" : ""}
                            >
                              {s.last}
                            </span>
                          </div>
                        </div>
                        <span>
                          {s.current ? (
                            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                              this is you
                            </span>
                          ) : (
                            <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                              sign out →
                            </a>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-5 py-2.5 rounded-full">
                      Sign out everywhere →
                    </button>
                  </div>
                </section>

                {/* RECENT ACTIVITY */}
                <section className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Recent activity
                    </h2>
                    <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                      full audit log →
                    </a>
                  </div>
                  <ul className="divide-y divide-stone-200">
                    {RECENT_ACTIVITY.map((a, i) => (
                      <li
                        key={i}
                        className="py-4 grid grid-cols-[1fr_auto] items-baseline gap-6 text-sm"
                      >
                        <span className="text-stone-700">{a.what}</span>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          {a.when}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* DANGER ZONE */}
                <section className="mt-20">
                  <div className="border-b border-rose-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-rose-700">
                      Danger zone
                    </h2>
                  </div>
                  <ul className="divide-y divide-rose-100">
                    <DangerRow
                      title="Export everything"
                      body="Download a JSON dump of every Ticket, Brief, Job record, and Result for every Project you own."
                      action="Export"
                      danger={false}
                    />
                    <DangerRow
                      title="Delete account"
                      body="Permanent. Tears down every Project, revokes every Collaborator invitation, expires every Bridge token. Cannot be undone."
                      action="Delete account →"
                      danger
                    />
                  </ul>
                </section>

                <p className="mt-16 text-sm italic text-stone-500 leading-relaxed">
                  Atlas keeps a 90-day audit log of significant account events
                  (sign-ins, password changes, Bridge tokens issued).{" "}
                  <a className="not-italic font-mono text-xs text-stone-700 hover:text-amber-600 cursor-pointer">
                    open audit log →
                  </a>
                </p>
              </div>

              {/* RIGHT RAIL */}
              <aside className="space-y-12">
                {/* The big monogram */}
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-8 text-center">
                  <div className="relative inline-block h-28 w-28 rounded-full bg-stone-900 text-stone-50 flex items-center justify-center text-6xl font-bold tracking-tighter leading-none">
                    <span className="block leading-none -mt-2">O</span>
                    <span className="absolute right-3 top-3 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                  <div className="mt-5 text-base font-medium text-stone-900">
                    Onkesh
                  </div>
                  <div className="mt-1 font-mono text-xs text-stone-500">
                    @onkesh
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                      <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Bridge online
                  </div>
                  <a className="mt-5 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    edit avatar →
                  </a>
                </section>

                {/* At-a-glance */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    At a glance
                  </div>
                  <dl className="mt-5 space-y-3 text-sm">
                    <Stat label="Projects" value="6 owned" />
                    <Stat label="Tickets reviewed" value="142 lifetime" />
                    <Stat label="PRs merged" value="98 via Atlas" />
                    <Stat label="Member since" value="Apr 28, 2026" />
                    <Stat label="Trust circle" value="4 Collaborators" />
                  </dl>
                </section>

                {/* Profile URL */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Your profile URL
                  </div>
                  <div className="mt-3 rounded-xl bg-white/70 border border-stone-200 px-3 py-2.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-stone-700 truncate">
                      atlas.com/@onkesh
                    </span>
                    <a className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-600 cursor-pointer shrink-0">
                      copy
                    </a>
                  </div>
                  <p className="mt-3 text-sm italic text-stone-500 leading-relaxed">
                    Collaborators can&rsquo;t see your profile page — it&rsquo;s
                    Owner-only. The URL is for sign-in links and email
                    signatures.
                  </p>
                </section>

                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    Atlas treats your account like a code review — every change
                    to it shows up in your audit log. Auth events email you
                    when they happen.
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant QQ · editorial profile
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  hint,
  tag,
  edit,
  action,
  readOnly,
}: {
  label: string;
  value: string;
  hint: string;
  tag?: string;
  edit?: boolean;
  action?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="py-5 grid grid-cols-[150px_1fr_auto] items-baseline gap-6">
      <span className="font-mono text-xs uppercase tracking-widest text-stone-500">
        {label}
      </span>
      <div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-base text-stone-900">{value}</span>
          {tag && (
            <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm text-stone-500 leading-relaxed">{hint}</p>
      </div>
      <span className="whitespace-nowrap">
        {readOnly ? (
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
            locked
          </span>
        ) : edit ? (
          <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
            edit →
          </a>
        ) : action ? (
          <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
            {action} →
          </a>
        ) : null}
      </span>
    </div>
  );
}

function DangerRow({
  title,
  body,
  action,
  danger,
}: {
  title: string;
  body: string;
  action: string;
  danger: boolean;
}) {
  return (
    <li className="py-5 grid grid-cols-[1fr_auto] items-baseline gap-6">
      <div>
        <div className="text-base font-medium text-stone-900">{title}</div>
        <p className="mt-1.5 text-sm text-stone-600 leading-relaxed max-w-md">
          {body}
        </p>
      </div>
      <a
        className={`font-mono text-xs uppercase tracking-widest cursor-pointer whitespace-nowrap ${
          danger
            ? "text-rose-700 hover:text-rose-900"
            : "text-stone-700 hover:text-amber-600"
        }`}
      >
        {action}
      </a>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-stone-500">{label}</span>
      <span className="font-mono text-stone-700">{value}</span>
    </div>
  );
}
