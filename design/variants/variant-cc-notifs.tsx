// THROWAWAY — Editorial Notifications Settings prototype.
// Fourth Settings sub-page (H Preferences + N Bridges + BB Account + CC).

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
  { key: "account", label: "Account" },
  { key: "notifications", label: "Notifications", active: true },
  { key: "billing", label: "Billing", upcoming: true },
];

export function VariantCCNotifs() {
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

          {/* SETTINGS 2-PANE */}
          <main className="flex-1 px-16 pt-8 pb-24">
            <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
              Settings · Notifications
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

              {/* CONTENT — Notifications */}
              <div className="max-w-2xl">
                <h1 className="text-5xl font-bold tracking-tighter">Notifications.</h1>
                <p className="mt-4 text-lg text-stone-500 leading-relaxed max-w-xl">
                  Atlas mirrors what lands in your inbox. Tell it how loud and how
                  often you want it.
                </p>

                {/* DELIVERY — where */}
                <section className="mt-20 pb-14 border-b border-stone-200">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Where
                  </div>
                  <p className="mt-4 text-base text-stone-500 leading-relaxed">
                    The channels Atlas can reach you on.
                  </p>

                  <ul className="mt-7 divide-y divide-stone-200">
                    <ChannelRow
                      label="Email"
                      sub="onkesh19@yahoo.co.in"
                      status="on"
                    />
                    <ChannelRow
                      label="In-app inbox"
                      sub="the · O · avatar in your sidebar"
                      status="on"
                      locked
                    />
                    <ChannelRow
                      label="Slack"
                      sub="connect a workspace"
                      status="off"
                      upcoming
                    />
                  </ul>
                </section>

                {/* FREQUENCY */}
                <section className="mt-16 pb-14 border-b border-stone-200">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    How often
                  </div>
                  <p className="mt-4 text-base text-stone-500 leading-relaxed">
                    Atlas can ping you on every event, or batch it up.
                  </p>
                  <div className="mt-7 inline-flex items-center font-mono text-xs uppercase tracking-widest rounded-full border border-stone-200 overflow-hidden">
                    <button className="px-4 py-2.5 bg-stone-900 text-stone-50">
                      Instant
                    </button>
                    <button className="px-4 py-2.5 text-stone-500 hover:bg-stone-100">
                      Daily digest
                    </button>
                    <button className="px-4 py-2.5 text-stone-500 hover:bg-stone-100">
                      Weekly digest
                    </button>
                    <button className="px-4 py-2.5 text-stone-500 hover:bg-stone-100">
                      Off
                    </button>
                  </div>
                </section>

                {/* WHAT YOU CARE ABOUT */}
                <section className="mt-16 pb-14 border-b border-stone-200">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    What you care about
                  </div>
                  <p className="mt-4 text-base text-stone-500 leading-relaxed">
                    Each kind of event toggles independently.
                  </p>

                  <div className="mt-7 space-y-1">
                    <div className="text-xs font-mono uppercase tracking-widest text-stone-500 pb-2">
                      Tickets you filed
                    </div>
                    <ul className="divide-y divide-stone-200">
                      <EventRow label="Shipped" sub="the Engine completed and merged" on />
                      <EventRow label="Owner replied" sub="they asked you something or added a note" on />
                      <EventRow label="Declined" sub='Owner marked "won&rsquo;t fix"' on />
                      <EventRow label="State changed" sub="moved between Triage / Backlog / Active / Review" />
                    </ul>
                  </div>

                  <div className="mt-10 space-y-1">
                    <div className="text-xs font-mono uppercase tracking-widest text-stone-500 pb-2">
                      Project-wide
                    </div>
                    <ul className="divide-y divide-stone-200">
                      <EventRow label="Something shipped" sub="any Ticket you didn&rsquo;t file" />
                      <EventRow label="New Collaborator joined" sub="someone accepted an invite" />
                      <EventRow label="Triage queue ≥ 5" sub="Owner-only · helps you keep up" on />
                    </ul>
                  </div>
                </section>

                {/* QUIET HOURS */}
                <section className="mt-16 pb-14 border-b border-stone-200">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Quiet hours
                  </div>
                  <p className="mt-4 text-base text-stone-500 leading-relaxed">
                    Atlas holds email until your window opens.
                  </p>
                  <div className="mt-7 grid grid-cols-2 gap-6 max-w-md">
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        Quiet from
                      </label>
                      <input
                        type="text"
                        defaultValue="22:00"
                        className="mt-2 w-full bg-transparent border-b border-stone-300 py-2 text-base font-mono text-stone-900 focus:outline-none focus:border-stone-900 transition"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        Until
                      </label>
                      <input
                        type="text"
                        defaultValue="08:00"
                        className="mt-2 w-full bg-transparent border-b border-stone-300 py-2 text-base font-mono text-stone-900 focus:outline-none focus:border-stone-900 transition"
                      />
                    </div>
                  </div>
                  <div className="mt-5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    Time zone · Europe/London · detected from browser
                  </div>
                </section>

                {/* EMAIL FORMAT */}
                <section className="mt-16">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Email format
                  </div>
                  <p className="mt-4 text-base text-stone-500 leading-relaxed">
                    How emails render in your inbox.
                  </p>
                  <div className="mt-7 inline-flex items-center font-mono text-xs uppercase tracking-widest rounded-full border border-stone-200 overflow-hidden">
                    <button className="px-4 py-2.5 bg-stone-900 text-stone-50">
                      Editorial
                    </button>
                    <button className="px-4 py-2.5 text-stone-500 hover:bg-stone-100">
                      Plain text
                    </button>
                  </div>
                  <a className="mt-5 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    preview a sample email ↗
                  </a>
                </section>
              </div>

              {/* RIGHT RAIL */}
              <aside className="space-y-14">
                {/* Recent activity hero */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    This week
                  </div>
                  <div className="mt-3">
                    <span className="relative text-2xl font-bold tracking-tight">
                      7 sent
                      <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                    Atlas was quiet — that&rsquo;s the goal.
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Emails sent</span>
                      <span className="font-mono text-stone-900">4</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">In-app pings</span>
                      <span className="font-mono text-stone-900">7</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Quieted overnight</span>
                      <span className="font-mono text-stone-900">3</span>
                    </li>
                  </ul>
                </section>

                {/* Test card — featured */}
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Try it
                  </div>
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                    Send yourself a sample of each notification kind. Lands in
                    seconds.
                  </p>
                  <button className="mt-5 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3 rounded-full shadow-sm inline-flex items-center justify-center gap-2 transition">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Send test pack
                    <span className="text-stone-400">→</span>
                  </button>
                  <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    last test · never
                  </div>
                </section>

                {/* Tips */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Tips
                  </div>
                  <ul className="mt-5 space-y-3 text-sm text-stone-700 leading-relaxed">
                    <li className="flex items-baseline gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5" />
                      <span>
                        If you only care about ships, set everything else to off and
                        keep Frequency on instant.
                      </span>
                    </li>
                    <li className="flex items-baseline gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5" />
                      <span>
                        Daily digest works well if you check Atlas at the same time
                        each day anyway.
                      </span>
                    </li>
                    <li className="flex items-baseline gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5" />
                      <span>
                        Owner-only events (like the Triage queue ping) help you
                        notice when Collaborators are waiting.
                      </span>
                    </li>
                  </ul>
                </section>

                {/* Footer */}
                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    Atlas never emails Collaborators on your behalf without telling
                    you exactly what it&rsquo;ll say first.
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant CC · editorial notifications
        </div>
      </div>
    </>
  );
}

function ChannelRow({
  label,
  sub,
  status,
  locked,
  upcoming,
}: {
  label: string;
  sub: string;
  status: "on" | "off";
  locked?: boolean;
  upcoming?: boolean;
}) {
  return (
    <li className="py-4 flex items-baseline justify-between gap-6">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-base text-stone-900 font-medium">{label}</span>
          {locked && (
            <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
              always on
            </span>
          )}
          {upcoming && (
            <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
              soon
            </span>
          )}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-stone-500">{sub}</div>
      </div>
      <div className="inline-flex items-center font-mono text-xs uppercase tracking-widest rounded-full border border-stone-200 overflow-hidden">
        <button
          className={`px-3 py-1.5 ${
            status === "on"
              ? "bg-stone-900 text-stone-50"
              : "text-stone-400"
          }`}
        >
          On
        </button>
        <button
          className={`px-3 py-1.5 ${
            status === "off" && !upcoming
              ? "bg-stone-900 text-stone-50"
              : upcoming
              ? "bg-stone-100 text-stone-400"
              : "text-stone-500 hover:bg-stone-100"
          }`}
        >
          Off
        </button>
      </div>
    </li>
  );
}

function EventRow({
  label,
  sub,
  on,
}: {
  label: string;
  sub: string;
  on?: boolean;
}) {
  return (
    <li className="py-3 flex items-baseline justify-between gap-6">
      <div>
        <div className="text-sm text-stone-900 font-medium">{label}</div>
        <div className="mt-0.5 text-xs text-stone-500 italic">{sub}</div>
      </div>
      <div className="inline-flex items-center font-mono text-[10px] uppercase tracking-widest rounded-full border border-stone-200 overflow-hidden">
        <button
          className={`px-2.5 py-1 ${
            on ? "bg-stone-900 text-stone-50" : "text-stone-400"
          }`}
        >
          On
        </button>
        <button
          className={`px-2.5 py-1 ${
            !on ? "bg-stone-900 text-stone-50" : "text-stone-500"
          }`}
        >
          Off
        </button>
      </div>
    </li>
  );
}
