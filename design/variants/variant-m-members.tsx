// THROWAWAY — Editorial Project Members prototype.
// Per-project member roster: current members + invite form + pending invites.

import { NAV } from "./mock-data";

type Role = "owner" | "collaborator";
type Member = {
  email: string;
  initial: string;
  display: string;
  role: Role;
  joined: string;
  lastActive: string;
  online?: boolean;
};

const MEMBERS: Member[] = [
  {
    email: "onkesh19@yahoo.co.in",
    initial: "o",
    display: "You",
    role: "owner",
    joined: "6 months ago",
    lastActive: "now",
    online: true,
  },
  {
    email: "ada@acme.io",
    initial: "a",
    display: "Ada",
    role: "collaborator",
    joined: "3 months ago",
    lastActive: "2 minutes ago",
    online: true,
  },
  {
    email: "carmen@acme.io",
    initial: "c",
    display: "Carmen",
    role: "collaborator",
    joined: "1 month ago",
    lastActive: "1 hour ago",
  },
  {
    email: "max@acme.io",
    initial: "m",
    display: "Max",
    role: "collaborator",
    joined: "2 weeks ago",
    lastActive: "yesterday",
  },
];

const PENDING_INVITES = [
  {
    email: "dev@acme.io",
    sentBy: "you",
    sentAt: "2 days ago",
    welcomeNote: "Welcome to acme-website. You'll be filing bugs on the new checkout flow.",
  },
];

export function VariantMMembers() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          {/* SIDEBAR — P active */}
          <aside className="w-[56px] shrink-0 sticky top-0 h-screen self-start flex flex-col items-center justify-between py-8 border-r border-stone-200/60 z-10">
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none">a</div>
            </div>
            <nav className="flex flex-col items-center gap-5">
              {NAV.map((n) => {
                const initial = n.short.charAt(0);
                const isActive = n.key === "projects";
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

          {/* MAIN */}
          <main className="flex-1 px-16 pt-8 pb-24">
            {/* Top breadcrumb */}
            <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
              Projects · acme-website · Members
            </div>

            <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
              {/* MAIN COL */}
              <div className="max-w-2xl">
                {/* Hero — title + stats inline */}
                <div className="flex items-baseline gap-6 flex-wrap">
                  <h1 className="text-5xl font-bold tracking-tighter">Members.</h1>
                  <p className="text-base text-stone-500">
                    <span className="font-mono text-stone-900">{MEMBERS.length}</span>{" "}
                    on this Project ·{" "}
                    <span className="font-mono text-stone-900">
                      {MEMBERS.filter((m) => m.online).length}
                    </span>{" "}
                    active right now
                  </p>
                </div>

                {/* MEMBERS list — divided rows */}
                <section className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Roster
                    </h2>
                    <span className="font-mono text-xs text-stone-400">
                      {MEMBERS.length}
                    </span>
                  </div>
                  <ul className="divide-y divide-stone-200">
                    {MEMBERS.map((m) => (
                      <li
                        key={m.email}
                        className="py-5 grid grid-cols-[32px_1fr_auto_auto] items-center gap-5 group cursor-pointer"
                      >
                        {/* Member mark — mirrors brand `a` / user `o` register */}
                        <div className="relative h-7 w-7 flex items-center justify-center">
                          <span className="text-xl font-bold tracking-tighter leading-none text-stone-900">
                            {m.initial}
                          </span>
                          {m.online && (
                            <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          )}
                        </div>

                        {/* Identity */}
                        <div>
                          <div className="text-base text-stone-900 font-medium tracking-tight">
                            {m.display}
                            {m.role === "owner" && (
                              <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-amber-700">
                                owner
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-stone-500">
                            {m.email}
                          </div>
                        </div>

                        {/* Last active */}
                        <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400 text-right">
                          <div>{m.online ? "online now" : "last active"}</div>
                          {!m.online && (
                            <div className="text-stone-500">{m.lastActive}</div>
                          )}
                        </div>

                        {/* Action affordance */}
                        {m.role === "collaborator" ? (
                          <a className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-rose-600 cursor-pointer opacity-0 group-hover:opacity-100 transition">
                            remove →
                          </a>
                        ) : (
                          <span className="w-[60px]" />
                        )}
                      </li>
                    ))}
                  </ul>
                </section>

                {/* INVITE form */}
                <section className="mt-16">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Invite a Collaborator
                  </div>
                  <p className="mt-4 text-base text-stone-500 leading-relaxed">
                    Send an email invite. They&rsquo;ll be able to file Tickets and
                    see what the Engine ships, but won&rsquo;t see the code or the
                    raw diffs.
                  </p>

                  <div className="mt-8 space-y-7">
                    {/* Email */}
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="name@example.com"
                        className="mt-2 w-full bg-transparent border-b border-stone-300 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition"
                      />
                    </div>

                    {/* Welcome note */}
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        Welcome note <span className="text-stone-400">· optional</span>
                      </label>
                      <textarea
                        rows={3}
                        placeholder="A quick line so they know what they're being invited to."
                        className="mt-2 w-full bg-transparent border-b border-stone-300 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition resize-none"
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex items-center gap-4">
                    <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-5 py-3 rounded-full shadow-sm">
                      Send invite →
                    </button>
                    <span className="italic font-sans text-sm text-stone-500">
                      they&rsquo;ll get a magic-link email · expires in 14 days
                    </span>
                  </div>
                </section>

                {/* PENDING invites */}
                {PENDING_INVITES.length > 0 && (
                  <section className="mt-16">
                    <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                      <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                        Pending
                      </h2>
                      <span className="font-mono text-xs text-stone-400">
                        {PENDING_INVITES.length}
                      </span>
                    </div>
                    <ul className="divide-y divide-stone-200">
                      {PENDING_INVITES.map((inv) => (
                        <li
                          key={inv.email}
                          className="py-5 grid grid-cols-[1fr_auto] items-baseline gap-6 group cursor-pointer"
                        >
                          <div>
                            <div className="text-base text-stone-900 font-medium font-mono tracking-tight">
                              {inv.email}
                            </div>
                            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                              invited by {inv.sentBy} · {inv.sentAt}
                            </div>
                            <p className="mt-2 text-sm italic text-stone-500 leading-relaxed">
                              &ldquo;{inv.welcomeNote}&rdquo;
                            </p>
                          </div>
                          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition">
                            <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                              resend →
                            </a>
                            <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-rose-600 cursor-pointer">
                              revoke ✕
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              {/* RIGHT RAIL */}
              <aside className="space-y-14">
                {/* Hero stat — active right now */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    On this Project
                  </div>
                  <div className="mt-3">
                    <span className="relative text-2xl font-bold tracking-tight">
                      {MEMBERS.length} members
                      <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                    1 Owner · {MEMBERS.filter((m) => m.role === "collaborator").length}{" "}
                    Collaborators · {PENDING_INVITES.length} pending invite
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Active right now</span>
                      <span className="font-mono text-stone-900">
                        {MEMBERS.filter((m) => m.online).length}
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Active this week</span>
                      <span className="font-mono text-stone-900">3</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Tickets filed</span>
                      <span className="font-mono text-stone-900">47</span>
                    </li>
                  </ul>
                </section>

                {/* Roles & permissions help */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Roles
                  </div>
                  <div className="mt-5 space-y-5 text-sm leading-relaxed">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-amber-700">
                        owner
                      </div>
                      <p className="mt-1 text-stone-700">
                        Reviews everything the Engine produces. Approves what ships.
                        One per Project.
                      </p>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-stone-700">
                        collaborator
                      </div>
                      <p className="mt-1 text-stone-700">
                        Files Tickets and reads shipped summaries. Never sees code
                        or raw diffs.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Quick invite by link card — featured */}
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Quick invite
                  </div>
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                    Generate a one-time magic link to share over Signal or Slack.
                  </p>
                  <button className="mt-5 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3 rounded-full shadow-sm">
                    Generate link →
                  </button>
                </section>

                {/* Docs footer */}
                <section className="pt-4 border-t border-stone-200/80">
                  <ul className="text-sm space-y-2">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-500">Docs</span>
                      <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                        members & roles →
                      </a>
                    </li>
                  </ul>
                </section>
              </aside>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant M · editorial members
        </div>
      </div>
    </>
  );
}
