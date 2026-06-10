// THROWAWAY — Editorial Notifications inbox prototype.
// Cross-project activity feed: what's happened to things you care about.

import { NAV } from "./mock-data";

type NotifKind = "shipped" | "replied" | "moved" | "completed" | "filed" | "accepted";

type Notif = {
  kind: NotifKind;
  who: string;
  what: string;
  ticketId?: string;
  preview?: string;
  project: string;
  at: string;
  group: "Today" | "Yesterday" | "Earlier this week" | "Last week";
  unread?: boolean;
};

const NOTIFS: Notif[] = [
  {
    kind: "shipped",
    who: "Engine",
    what: "shipped T-249 — Add JSON export endpoint",
    ticketId: "T-249",
    preview: "Try downloading the ticket list — there's now a JSON option.",
    project: "acme-website",
    at: "1h ago",
    group: "Today",
    unread: true,
  },
  {
    kind: "replied",
    who: "Onkesh",
    what: "replied on T-247",
    ticketId: "T-247",
    preview: "Could you share a screenshot? I'm trying to repro on an iPad mini.",
    project: "acme-website",
    at: "3h ago",
    group: "Today",
    unread: true,
  },
  {
    kind: "moved",
    who: "Onkesh",
    what: "moved T-280 to the backlog",
    ticketId: "T-280",
    project: "atlas-internal",
    at: "yesterday",
    group: "Yesterday",
  },
  {
    kind: "completed",
    who: "Engine",
    what: "completed T-201 — Refactor checkout flow",
    ticketId: "T-201",
    project: "acme-website",
    at: "yesterday",
    group: "Yesterday",
  },
  {
    kind: "accepted",
    who: "You",
    what: "accepted Onkesh's invite to acme-website",
    project: "acme-website",
    at: "2 days ago",
    group: "Earlier this week",
  },
  {
    kind: "filed",
    who: "Carmen",
    what: "filed T-302 — Onboarding screenshots are stale",
    ticketId: "T-302",
    project: "acme-website",
    at: "3 days ago",
    group: "Earlier this week",
  },
  {
    kind: "shipped",
    who: "Engine",
    what: "shipped T-204 — your typo fix is live",
    ticketId: "T-204",
    preview: "Checkout now reads 'proceed' instead of 'preocceed'.",
    project: "acme-website",
    at: "1 week ago",
    group: "Last week",
  },
];

function kindDot(k: NotifKind): string {
  if (k === "shipped" || k === "completed") return "bg-emerald-500";
  if (k === "replied") return "bg-sky-400";
  if (k === "moved") return "bg-stone-400";
  if (k === "accepted") return "bg-amber-500";
  return "bg-stone-400";
}
function kindLabel(k: NotifKind): string {
  if (k === "shipped") return "shipped";
  if (k === "completed") return "completed";
  if (k === "replied") return "replied";
  if (k === "moved") return "moved";
  if (k === "filed") return "filed";
  return "accepted";
}

export function VariantZInbox() {
  const unreadCount = NOTIFS.filter((n) => n.unread).length;
  const groups: Array<Notif["group"]> = [
    "Today",
    "Yesterday",
    "Earlier this week",
    "Last week",
  ];

  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          {/* SIDEBAR — nothing in NAV active (Inbox is accessed via the `o` user avatar) */}
          <aside className="w-[56px] shrink-0 sticky top-0 h-screen self-start flex flex-col items-center justify-between py-8 border-r border-stone-200/60 z-10">
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none">a</div>
            </div>
            <nav className="flex flex-col items-center gap-5">
              {NAV.map((n) => {
                const initial = n.short.charAt(0);
                return (
                  <a
                    key={n.key}
                    className="relative h-7 w-7 flex items-center justify-center cursor-pointer transition text-stone-400 hover:text-stone-900"
                  >
                    <span className="text-base font-medium">{initial}</span>
                    {n.badge !== undefined && (
                      <span className="absolute -top-1 -right-1 font-mono text-[9px] leading-none text-stone-600 bg-amber-50 px-0.5">
                        {n.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
            {/* User mark with unread indicator */}
            <div className="relative group">
              <div className="relative h-6 w-6 flex items-center justify-center cursor-pointer">
                <div className="text-xl font-bold tracking-tighter leading-none text-stone-900">
                  o
                </div>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-amber-500 text-stone-900 font-mono text-[9px] leading-none">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
          </aside>

          {/* MAIN */}
          <main className="flex-1 px-16 pt-8 pb-24">
            {/* Top */}
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Inbox
              </div>
              <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                mark all read ↗
              </a>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
              {/* MAIN COL */}
              <div className="max-w-2xl">
                {/* Hero */}
                <div className="flex items-baseline gap-6 flex-wrap">
                  <h1 className="text-5xl font-bold tracking-tighter">
                    What&rsquo;s happened.
                  </h1>
                  <p className="text-base text-stone-500">
                    <span className="font-mono text-amber-600">{unreadCount}</span>{" "}
                    new ·{" "}
                    <span className="font-mono text-stone-900">{NOTIFS.length}</span>{" "}
                    total this week
                  </p>
                </div>

                {/* Filter chips */}
                <div className="mt-8 flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                    Show
                  </span>
                  <InboxChip label="Everything" active />
                  <InboxChip label="Shipped" />
                  <InboxChip label="Replies" />
                  <InboxChip label="Mentions" />
                </div>

                {/* Grouped notifications */}
                <div className="mt-12 space-y-12">
                  {groups.map((group) => {
                    const groupNotifs = NOTIFS.filter((n) => n.group === group);
                    if (groupNotifs.length === 0) return null;

                    return (
                      <section key={group}>
                        <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                          <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                            {group}
                          </h2>
                          <span className="font-mono text-xs text-stone-400">
                            {groupNotifs.length}
                          </span>
                        </div>
                        <ol className="divide-y divide-stone-200">
                          {groupNotifs.map((n, i) => (
                            <li
                              key={`${group}-${i}`}
                              className="py-5 grid grid-cols-[12px_1fr_auto] items-baseline gap-4 group cursor-pointer"
                            >
                              {/* Unread indicator OR state dot */}
                              <span className="relative h-1.5 w-1.5 mt-2">
                                {n.unread ? (
                                  <span
                                    className={`inline-block h-1.5 w-1.5 rounded-full ${kindDot(
                                      n.kind,
                                    )}`}
                                  />
                                ) : (
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-stone-200" />
                                )}
                              </span>

                              <div>
                                {/* The sentence */}
                                <div
                                  className={`text-base leading-snug ${
                                    n.unread ? "text-stone-900" : "text-stone-600"
                                  }`}
                                >
                                  <span className="font-medium">{n.who}</span>{" "}
                                  <span
                                    className={`font-mono text-xs uppercase tracking-widest mx-1 ${
                                      n.unread
                                        ? kindDotText(n.kind)
                                        : "text-stone-400"
                                    }`}
                                  >
                                    {kindLabel(n.kind)}
                                  </span>{" "}
                                  {n.what.replace(
                                    new RegExp(`^${kindLabel(n.kind)}\\s*`),
                                    "",
                                  )}
                                </div>
                                {/* Project context */}
                                <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                                  in {n.project}
                                  {n.ticketId && (
                                    <>
                                      <span className="mx-1">·</span>
                                      {n.ticketId}
                                    </>
                                  )}
                                </div>
                                {/* Preview (italic, for shipped/replied) */}
                                {n.preview && (
                                  <p className="mt-2 text-sm italic text-stone-600 leading-relaxed">
                                    &ldquo;{n.preview}&rdquo;
                                  </p>
                                )}
                              </div>

                              {/* Timestamp */}
                              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 whitespace-nowrap text-right">
                                {n.at}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </section>
                    );
                  })}
                </div>

                {/* Load more */}
                <a className="mt-12 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                  show older →
                </a>
              </div>

              {/* RIGHT RAIL */}
              <aside className="space-y-14">
                {/* Inbox hero */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    This week
                  </div>
                  <div className="mt-3">
                    <span className="relative text-2xl font-bold tracking-tight">
                      {unreadCount} unread
                      <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-amber-500" />
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                    Down from <span className="font-mono">12</span> last week.
                    You&rsquo;re on top of it.
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Shipped for you</span>
                      <span className="font-mono text-emerald-600">2</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Replies waiting</span>
                      <span className="font-mono text-sky-600">1</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Updates this week</span>
                      <span className="font-mono text-stone-900">7</span>
                    </li>
                  </ul>
                </section>

                {/* Reply CTA — featured */}
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
                    Someone&rsquo;s waiting on you
                  </div>
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                    Onkesh replied on{" "}
                    <span className="font-mono text-stone-900">T-247</span> 3 hours
                    ago. They asked for a screenshot.
                  </p>
                  <button className="mt-5 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3 rounded-full shadow-sm inline-flex items-center justify-center gap-2">
                    Open the reply
                    <span className="text-stone-400">→</span>
                  </button>
                </section>

                {/* What triggers notifications */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    What you hear about
                  </div>
                  <ul className="mt-5 space-y-3 text-sm">
                    <li className="flex items-baseline gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5" />
                      <span className="text-stone-700">
                        Tickets you filed: shipped, replied, declined
                      </span>
                    </li>
                    <li className="flex items-baseline gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400 mt-1.5" />
                      <span className="text-stone-700">
                        Direct replies from the Owner
                      </span>
                    </li>
                    <li className="flex items-baseline gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5" />
                      <span className="text-stone-700">
                        Project-wide ships (only if you have a stake)
                      </span>
                    </li>
                  </ul>
                  <a className="mt-5 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    Tune notifications →
                  </a>
                </section>

                {/* Footer */}
                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    Atlas mirrors what landed in your email — so you can clear
                    your real inbox without losing track of what shipped.
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant Z · editorial inbox
        </div>
      </div>
    </>
  );
}

function InboxChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className={`group inline-flex items-center px-3 py-1.5 rounded-full transition cursor-pointer ${
        active
          ? "bg-stone-900 text-stone-50"
          : "bg-stone-100 hover:bg-stone-200 text-stone-700"
      }`}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest">
        {label}
      </span>
    </button>
  );
}

function kindDotText(k: NotifKind): string {
  if (k === "shipped" || k === "completed") return "text-emerald-700";
  if (k === "replied") return "text-sky-700";
  if (k === "moved") return "text-stone-700";
  if (k === "accepted") return "text-amber-700";
  return "text-stone-700";
}
