// THROWAWAY — Editorial Trust Circle prototype.
// The Owner's cross-Project roster — who you've invited anywhere, what they
// can see, the longest-tenured first. Distinct from variant M (per-Project
// Members) which is scoped to one Project.

import { NAV } from "./mock-data";

type Person = {
  initial: string;
  name: string;
  handle: string;
  email: string;
  joinedDays: number;
  projects: string[];
  tickets: number;
  bridgeOnline?: boolean;
  pending?: boolean;
  pendingFor?: string;
};

const PEOPLE: Person[] = [
  {
    initial: "P",
    name: "Priya Sharma",
    handle: "@priya",
    email: "priya@trinetr.in",
    joinedDays: 71,
    projects: ["atlas-internal", "trinetr-mes"],
    tickets: 38,
  },
  {
    initial: "M",
    name: "Marcus Lee",
    handle: "@marcus",
    email: "marcus@example.com",
    joinedDays: 47,
    projects: ["atlas-internal", "marketing-site"],
    tickets: 24,
  },
  {
    initial: "S",
    name: "Sam Akinola",
    handle: "@sam",
    email: "sam@example.com",
    joinedDays: 22,
    projects: ["marketing-site"],
    tickets: 9,
  },
  {
    initial: "R",
    name: "Rohan Verma",
    handle: "@rohan",
    email: "rohan@example.com",
    joinedDays: 1,
    projects: ["trinetr-mes"],
    tickets: 1,
  },
  {
    initial: "?",
    name: "j@example.com",
    handle: "—",
    email: "j@example.com",
    joinedDays: 0,
    projects: ["atlas-internal"],
    tickets: 0,
    pending: true,
    pendingFor: "12 minutes",
  },
];

function dayLabel(d: number): string {
  if (d === 0) return "pending";
  if (d === 1) return "1 day ago";
  if (d < 30) return `${d} days ago`;
  if (d < 60) return "~1 month ago";
  return `${Math.round(d / 30)} months ago`;
}

export function VariantWWTrust() {
  const accepted = PEOPLE.filter((p) => !p.pending);
  const pending = PEOPLE.filter((p) => p.pending);

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
                Settings · People · Trust circle
              </div>
              <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                <a className="hover:text-stone-900 cursor-pointer">Per-project Members</a>
                <a className="text-stone-900 cursor-pointer border-b border-amber-500 pb-0.5">Trust circle</a>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_300px] gap-16">
              <div className="max-w-2xl">
                {/* Hero */}
                <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
                  Your people · everyone, every Project
                </div>
                <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-[1.05]">
                  Your{" "}
                  <span className="relative">
                    trust circle
                    <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-amber-500" />
                  </span>
                  .
                </h1>
                <p className="mt-5 text-xl text-stone-700 leading-relaxed">
                  Atlas is invite-only by design. {accepted.length} people are
                  in here because you invited them, sometime, somewhere.
                </p>

                {/* Live stats sentence */}
                <p className="mt-6 text-base text-stone-700 leading-relaxed">
                  <span className="font-mono text-stone-900">
                    {accepted.length}
                  </span>{" "}
                  Collaborators across{" "}
                  <span className="font-mono text-stone-900">3</span> Projects
                  have filed{" "}
                  <span className="font-mono text-stone-900">
                    {accepted.reduce((s, p) => s + p.tickets, 0)}
                  </span>{" "}
                  Tickets in the last 30 days.{" "}
                  {pending.length > 0 && (
                    <span>
                      <span className="font-mono text-amber-700">
                        {pending.length}
                      </span>{" "}
                      invitation hasn&rsquo;t been accepted yet.
                    </span>
                  )}
                </p>

                {/* ACCEPTED */}
                <section className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      In your circle
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      sorted by tenure
                    </span>
                  </div>
                  <ul className="divide-y divide-stone-200">
                    {accepted.map((p) => (
                      <li
                        key={p.handle}
                        className="py-5 grid grid-cols-[48px_1fr_auto] items-baseline gap-5"
                      >
                        {/* Monogram */}
                        <div className="relative h-10 w-10 rounded-full bg-stone-900 text-stone-50 flex items-center justify-center text-base font-bold tracking-tighter leading-none">
                          {p.initial}
                          {p.bridgeOnline && (
                            <span className="absolute right-0 top-0 inline-block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                          )}
                        </div>

                        {/* Identity */}
                        <div>
                          <div className="flex items-baseline gap-3 flex-wrap">
                            <span className="text-base font-medium text-stone-900">
                              {p.name}
                            </span>
                            <span className="font-mono text-xs text-stone-500">
                              {p.handle}
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-400 flex-wrap">
                            <span>{p.email}</span>
                            <span className="text-stone-300">·</span>
                            <span>{dayLabel(p.joinedDays)}</span>
                            <span className="text-stone-300">·</span>
                            <span>
                              {p.tickets} Ticket{p.tickets === 1 ? "" : "s"} ·
                            </span>
                          </div>
                          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                            {p.projects.map((proj) => (
                              <span
                                key={proj}
                                className="font-mono text-[10px] uppercase tracking-widest text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full"
                              >
                                {proj}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-2 whitespace-nowrap">
                          <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                            view profile →
                          </a>
                          <a className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-rose-700 cursor-pointer">
                            revoke access
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* PENDING */}
                {pending.length > 0 && (
                  <section className="mt-16">
                    <div className="flex items-baseline justify-between border-b border-amber-200 pb-3">
                      <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-amber-700">
                        Pending invitations
                      </h2>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                        haven&rsquo;t accepted yet
                      </span>
                    </div>
                    <ul className="divide-y divide-amber-100">
                      {pending.map((p) => (
                        <li
                          key={p.email}
                          className="py-5 grid grid-cols-[48px_1fr_auto] items-baseline gap-5"
                        >
                          <div className="relative h-10 w-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-base font-bold tracking-tighter leading-none border-2 border-dashed border-amber-300">
                            ?
                          </div>
                          <div>
                            <div className="text-base text-stone-900">
                              {p.email}
                            </div>
                            <div className="mt-1 flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                              <span>invited to {p.projects[0]}</span>
                              <span className="text-stone-300">·</span>
                              <span className="text-amber-700">
                                pending {p.pendingFor}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 whitespace-nowrap">
                            <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                              resend ↗
                            </a>
                            <a className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-rose-700 cursor-pointer">
                              cancel invite
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* INVITE BAR */}
                <section className="mt-16 rounded-2xl bg-white/70 border border-stone-200 p-6">
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">
                    Add to your circle
                  </div>
                  <p className="mt-3 text-base text-stone-700 leading-relaxed">
                    Atlas doesn&rsquo;t allow public sign-up. Send an
                    invitation by email; the recipient lands on the onboarding
                    flow.
                  </p>
                  <div className="mt-5 flex items-center gap-3 flex-wrap">
                    <input
                      type="email"
                      placeholder="someone@example.com"
                      className="flex-1 min-w-[240px] bg-transparent border-b border-stone-300 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition"
                    />
                    <select
                      defaultValue="atlas-internal"
                      className="bg-transparent border-b border-stone-300 py-2 text-base text-stone-700 focus:outline-none focus:border-stone-900"
                    >
                      <option>atlas-internal</option>
                      <option>marketing-site</option>
                      <option>trinetr-mes</option>
                    </select>
                    <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-5 py-2.5 rounded-full">
                      Send invite →
                    </button>
                  </div>
                  <p className="mt-4 text-sm italic text-stone-500 leading-relaxed">
                    The invitee receives a Resend email with a magic link.
                    Invitations expire in 7 days.
                  </p>
                </section>

                <p className="mt-16 text-sm italic text-stone-500 leading-relaxed">
                  Revoking access is immediate — the Collaborator can&rsquo;t
                  see Tickets, file new ones, or receive Ship Notifications.
                  Their prior Tickets stay attributed to them in the audit log;
                  Atlas never rewrites history.
                </p>
              </div>

              {/* RAIL */}
              <aside className="space-y-12">
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-6 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                    Circle size
                  </div>
                  <div className="mt-3 font-mono text-6xl font-bold tracking-tighter text-stone-900 leading-none">
                    {accepted.length}
                  </div>
                  <p className="mt-4 text-xs text-stone-500 leading-relaxed">
                    Atlas works best with{" "}
                    <span className="text-stone-900 font-medium">2–8</span>{" "}
                    people. After that, Tickets pile up faster than you can
                    review.
                  </p>
                </section>

                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    At a glance
                  </div>
                  <dl className="mt-5 space-y-3 text-sm">
                    <Stat label="Active 30d" value={`${accepted.length} of ${accepted.length}`} />
                    <Stat label="Pending invites" value={String(pending.length)} />
                    <Stat label="Projects shared" value="3" />
                    <Stat label="Tickets / month" value={`~${accepted.reduce((s, p) => s + p.tickets, 0)}`} />
                  </dl>
                </section>

                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Why a circle, not a tenant
                  </div>
                  <p className="mt-4 text-sm text-stone-600 leading-relaxed">
                    Most products call this &ldquo;your team&rdquo; or
                    &ldquo;workspace members.&rdquo; Atlas is one Owner with a
                    circle of trusted Collaborators — fundamentally different
                    shape. Calling it what it is.
                  </p>
                </section>

                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    Per-Project membership lives at{" "}
                    <a className="not-italic font-mono text-xs text-stone-700 hover:text-amber-600 cursor-pointer">
                      Settings · Members →
                    </a>{" "}
                    if you need to tweak access for one Project at a time.
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant WW · editorial trust circle
        </div>
      </div>
    </>
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
