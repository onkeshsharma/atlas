// THROWAWAY — Editorial Account Settings prototype.
// Third Settings sub-page (with H Preferences + N Bridges).

import { NAV } from "./mock-data";

type SubNavItem = {
  key: string;
  label: string;
  badge?: number | string;
  active?: boolean;
  upcoming?: boolean;
};

const SUB_NAV: SubNavItem[] = [
  { key: "bridges", label: "Bridges", badge: 1 },
  { key: "preferences", label: "Preferences" },
  { key: "account", label: "Account", active: true },
  { key: "notifications", label: "Notifications", upcoming: true },
  { key: "billing", label: "Billing", upcoming: true },
];

const SESSIONS = [
  {
    device: "Mac · Chrome",
    location: "London, UK",
    signedIn: "now",
    here: true,
  },
  {
    device: "iPad · Safari",
    location: "London, UK",
    signedIn: "yesterday",
  },
];

export function VariantBBAccount() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          {/* SIDEBAR — S active */}
          <aside className="w-[56px] shrink-0 sticky top-0 h-screen self-start flex flex-col items-center justify-between py-8 border-r border-stone-200/60 z-10">
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none">a</div>
            </div>
            <nav className="flex flex-col items-center gap-5">
              {NAV.map((n) => {
                const initial = n.short.charAt(0);
                const isActive = n.key === "settings";
                return (
                  <a
                    key={n.key}
                    className={`relative h-7 w-7 flex items-center justify-center cursor-pointer transition group ${
                      isActive ? "text-stone-900" : "text-stone-400 hover:text-stone-900"
                    }`}
                  >
                    <span className={`text-base ${isActive ? "font-semibold" : "font-medium"}`}>
                      {initial}
                    </span>
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-3 bg-amber-500" />
                    )}
                    {n.badge !== undefined && (
                      <span className="absolute -top-1 -right-1 font-mono text-[9px] leading-none text-stone-600 bg-amber-50 px-0.5">
                        {n.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
            <div className="relative group">
              <div className="relative h-6 w-6 flex items-center justify-center cursor-pointer">
                <div className="text-xl font-bold tracking-tighter leading-none text-stone-900 group-hover:text-amber-600 transition">
                  o
                </div>
                <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </aside>

          {/* SETTINGS 2-PANE — sub-nav + content + rail */}
          <main className="flex-1 px-16 pt-8 pb-24">
            <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
              Settings · Account
            </div>

            <div className="mt-8 grid grid-cols-[200px_1fr_360px] gap-16">
              {/* SUB-NAV */}
              <nav className="space-y-1">
                <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500 pb-3 border-b border-stone-200">
                  Settings
                </div>
                <div className="pt-3 space-y-1">
                  {SUB_NAV.map((item) => (
                    <a
                      key={item.key}
                      className={`group flex items-baseline justify-between py-2 cursor-pointer transition ${
                        item.active
                          ? "text-stone-900"
                          : item.upcoming
                          ? "text-stone-400 cursor-not-allowed"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      <span
                        className={`relative text-sm tracking-tight ${
                          item.active ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {item.label}
                        {item.active && (
                          <span className="absolute -bottom-1 left-0 h-[2px] w-6 bg-amber-500" />
                        )}
                      </span>
                      {item.badge !== undefined && (
                        <span className="font-mono text-[10px] text-stone-500">
                          {item.badge}
                        </span>
                      )}
                      {item.upcoming && (
                        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          soon
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </nav>

              {/* CONTENT — Account */}
              <div className="max-w-2xl">
                {/* Hero */}
                <h1 className="text-5xl font-bold tracking-tighter">Account.</h1>
                <p className="mt-4 text-lg text-stone-500 leading-relaxed max-w-xl">
                  The bits about you. Atlas keeps these private — they&rsquo;re
                  never shared with Collaborators.
                </p>

                {/* Section: Profile */}
                <section className="mt-20 pb-14 border-b border-stone-200">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Profile
                  </div>
                  <p className="mt-4 text-base text-stone-500 leading-relaxed">
                    What Collaborators see when you reply or ship something.
                  </p>

                  <div className="mt-8 grid grid-cols-[auto_1fr] gap-6 items-baseline">
                    {/* Avatar mirror */}
                    <div className="relative h-7 w-7 flex items-center justify-center">
                      <span className="text-xl font-bold tracking-tighter leading-none text-stone-900">
                        o
                      </span>
                      <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <div>
                      <div className="text-base text-stone-900 font-medium tracking-tight">
                        Onkesh
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-stone-500">
                        onkesh19@yahoo.co.in
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 space-y-7">
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        Display name
                      </label>
                      <input
                        type="text"
                        defaultValue="Onkesh"
                        className="mt-2 w-full bg-transparent border-b border-stone-300 py-2 text-base text-stone-900 focus:outline-none focus:border-stone-900 transition"
                      />
                    </div>
                  </div>
                </section>

                {/* Section: Email & sign-in */}
                <section className="mt-16 pb-14 border-b border-stone-200">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Email &amp; sign-in
                  </div>
                  <p className="mt-4 text-base text-stone-500 leading-relaxed">
                    How you get into Atlas. Change either at any time.
                  </p>
                  <ul className="mt-8 divide-y divide-stone-200">
                    <li className="py-4 flex items-baseline justify-between group cursor-pointer">
                      <span>
                        <span className="block text-base text-stone-900 font-medium">
                          Email
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] text-stone-500">
                          onkesh19@yahoo.co.in
                        </span>
                      </span>
                      <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                        change →
                      </a>
                    </li>
                    <li className="py-4 flex items-baseline justify-between group cursor-pointer">
                      <span>
                        <span className="block text-base text-stone-900 font-medium">
                          Password
                        </span>
                        <span className="mt-0.5 font-mono text-[11px] text-stone-500">
                          last changed 4 months ago
                        </span>
                      </span>
                      <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                        change →
                      </a>
                    </li>
                    <li className="py-4 flex items-baseline justify-between group cursor-pointer">
                      <span>
                        <span className="flex items-baseline gap-2">
                          <span className="text-base text-stone-900 font-medium">
                            Two-factor
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                            on
                          </span>
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] text-stone-500">
                          authenticator app · 8 recovery codes left
                        </span>
                      </span>
                      <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                        manage →
                      </a>
                    </li>
                  </ul>
                </section>

                {/* Section: Connected services */}
                <section className="mt-16 pb-14 border-b border-stone-200">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Connected services
                  </div>
                  <p className="mt-4 text-base text-stone-500 leading-relaxed">
                    What Atlas talks to on your behalf.
                  </p>
                  <ul className="mt-8 divide-y divide-stone-200">
                    <li className="py-4 flex items-baseline justify-between group cursor-pointer">
                      <span>
                        <span className="flex items-baseline gap-2">
                          <span className="text-base text-stone-900 font-medium">
                            Claude Code
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                            authorized
                          </span>
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] text-stone-500">
                          your Engine runs through this · expires never
                        </span>
                      </span>
                      <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-rose-600 cursor-pointer">
                        revoke →
                      </a>
                    </li>
                    <li className="py-4 flex items-baseline justify-between group cursor-pointer">
                      <span>
                        <span className="flex items-baseline gap-2">
                          <span className="text-base text-stone-900 font-medium">
                            GitHub
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                            authorized
                          </span>
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] text-stone-500">
                          read &amp; PR-create on 3 repositories
                        </span>
                      </span>
                      <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-rose-600 cursor-pointer">
                        revoke →
                      </a>
                    </li>
                  </ul>
                </section>

                {/* Section: Active sessions */}
                <section className="mt-16 pb-14 border-b border-stone-200">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Active sessions
                  </div>
                  <p className="mt-4 text-base text-stone-500 leading-relaxed">
                    Where you&rsquo;re signed in right now.
                  </p>
                  <ul className="mt-8 divide-y divide-stone-200">
                    {SESSIONS.map((s, i) => (
                      <li
                        key={i}
                        className="py-4 flex items-baseline justify-between group cursor-pointer"
                      >
                        <span>
                          <span className="flex items-baseline gap-2">
                            <span className="text-base text-stone-900 font-medium">
                              {s.device}
                            </span>
                            {s.here && (
                              <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                                this device
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block font-mono text-[11px] text-stone-500">
                            {s.location} · signed in {s.signedIn}
                          </span>
                        </span>
                        {!s.here && (
                          <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-rose-600 cursor-pointer">
                            sign out →
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                  <a className="mt-5 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-rose-600 cursor-pointer">
                    sign out everywhere ↗
                  </a>
                </section>

                {/* Section: Delete account — quiet danger zone */}
                <section className="mt-16">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Leave Atlas
                  </div>
                  <p className="mt-4 text-base text-stone-700 leading-relaxed">
                    Delete your account, your Projects, your Tickets, and revoke
                    every Bridge token. There&rsquo;s no undo.
                  </p>
                  <p className="mt-2 text-sm italic text-stone-500 leading-relaxed">
                    Your code on your machines stays where it is — Atlas only
                    forgets that any of it exists.
                  </p>
                  <button className="mt-6 font-mono text-xs uppercase tracking-widest text-rose-700 border border-rose-200 hover:border-rose-300 hover:bg-rose-50 bg-white px-5 py-3 rounded-full">
                    Delete my account
                  </button>
                </section>
              </div>

              {/* RIGHT RAIL */}
              <aside className="space-y-14">
                {/* You hero */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    You on Atlas
                  </div>
                  <div className="mt-3">
                    <span className="relative text-2xl font-bold tracking-tight">
                      6 months in
                      <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                    Since November 2025. 47 Tickets filed, 38 shipped.
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Projects</span>
                      <span className="font-mono text-stone-900">3 owned</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Collaborators</span>
                      <span className="font-mono text-stone-900">12 across all</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Engine quota · 30d</span>
                      <span className="font-mono text-stone-900">42 / 100 hrs</span>
                    </li>
                  </ul>
                </section>

                {/* Privacy card — featured */}
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Your data
                  </div>
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                    Export everything Atlas has on you, anytime. JSON dump
                    delivered to your inbox.
                  </p>
                  <button className="mt-5 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3 rounded-full shadow-sm inline-flex items-center justify-center gap-2 transition">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Request data export
                    <span className="text-stone-400">↗</span>
                  </button>
                </section>

                {/* Audit log */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Recent account activity
                  </div>
                  <ul className="mt-5 space-y-3 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Signed in · this device</span>
                      <span className="font-mono text-[10px] text-stone-400">now</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">2FA re-verified</span>
                      <span className="font-mono text-[10px] text-stone-400">today</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">GitHub token refreshed</span>
                      <span className="font-mono text-[10px] text-stone-400">3d ago</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Display name changed</span>
                      <span className="font-mono text-[10px] text-stone-400">2w ago</span>
                    </li>
                  </ul>
                  <a className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    full audit log →
                  </a>
                </section>

                {/* Footer */}
                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    Atlas only holds account metadata, Brief text, Result summaries
                    and heartbeats — never your code.
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant BB · editorial account
        </div>
      </div>
    </>
  );
}
