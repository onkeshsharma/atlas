// THROWAWAY — Editorial Settings 2-pane prototype.
// Sub-nav left (200px), content right. Mirrors the Vercel/Linear 2-pane
// pattern in editorial register: text labels (no icons), mono uppercase
// section labels, segmented controls for choices, dividers between
// form sections. No right rail (Settings is personal — no contextual rail).

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
  { key: "preferences", label: "Preferences", active: true },
  { key: "account", label: "Account", upcoming: true },
  { key: "notifications", label: "Notifications", upcoming: true },
  { key: "billing", label: "Billing", upcoming: true },
];

function ShortcutRow({
  keys,
  label,
  soon,
}: {
  keys: string[];
  label: string;
  soon?: boolean;
}) {
  return (
    <li className="flex items-baseline justify-between">
      <span className={`flex items-baseline gap-2 ${soon ? "text-stone-400" : "text-stone-700"}`}>
        <span>{label}</span>
        {soon && (
          <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
            soon
          </span>
        )}
      </span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={i}
            className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded font-mono text-[10px] uppercase ${
              soon
                ? "bg-stone-100 text-stone-400 border border-stone-200"
                : "bg-stone-100 text-stone-700 border border-stone-200 group-hover:border-stone-300"
            }`}
          >
            {k}
          </kbd>
        ))}
      </span>
    </li>
  );
}

export function VariantHSettings() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          {/* SIDEBAR — S is active for Settings */}
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

          {/* SETTINGS 2-PANE — sub-nav 200px + content 1fr */}
          <main className="flex-1 px-16 pt-8 pb-24">
            {/* Top breadcrumb — baselines with `a` */}
            <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
              Settings · Preferences
            </div>

            <div className="mt-8 grid grid-cols-[200px_1fr_360px] gap-16">
              {/* SUB-NAV (left pane) */}
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

              {/* CONTENT (centre pane) — Preferences active. More breathing room. */}
              <div className="max-w-2xl">
                <h1 className="text-5xl font-bold tracking-tighter">Preferences.</h1>
                <p className="mt-4 text-lg text-stone-500 leading-relaxed max-w-xl">
                  How you want Atlas to behave for you. Changes save instantly.
                </p>

                {/* Section: Project sort */}
                <section className="mt-20 pb-14 border-b border-stone-200">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Project sort
                  </div>
                  <p className="mt-4 text-base text-stone-500 leading-relaxed">
                    How project cards are ordered on the dashboard.
                  </p>
                  <div className="mt-7 inline-flex items-center font-mono text-xs uppercase tracking-widest rounded-full border border-stone-200 overflow-hidden">
                    <button className="px-4 py-2.5 bg-stone-900 text-stone-50">
                      Recent
                    </button>
                    <button className="px-4 py-2.5 text-stone-500 hover:bg-stone-100">
                      Alphabetic
                    </button>
                    <button className="px-4 py-2.5 text-stone-500 hover:bg-stone-100">
                      Pinned then activity
                    </button>
                  </div>
                </section>

                {/* Section: Kanban density default */}
                <section className="mt-16 pb-14 border-b border-stone-200">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Kanban density default
                  </div>
                  <p className="mt-4 text-base text-stone-500 leading-relaxed">
                    How tickets render on the Kanban. You can also toggle per-board.
                  </p>
                  <div className="mt-7 inline-flex items-center font-mono text-xs uppercase tracking-widest rounded-full border border-stone-200 overflow-hidden">
                    <button className="px-4 py-2.5 text-stone-500 hover:bg-stone-100">
                      Compact
                    </button>
                    <button className="px-4 py-2.5 bg-stone-900 text-stone-50">
                      Medium
                    </button>
                    <button className="px-4 py-2.5 text-stone-500 hover:bg-stone-100">
                      Rich
                    </button>
                  </div>
                </section>

                {/* Section: Pinned projects */}
                <section className="mt-16 pb-14 border-b border-stone-200">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Pinned projects
                  </div>
                  <p className="mt-4 text-base text-stone-500 leading-relaxed">
                    Projects shown in the Pinned strip on your dashboard.
                  </p>
                  <ul className="mt-7 divide-y divide-stone-200">
                    <li className="py-4 flex items-baseline justify-between group cursor-pointer">
                      <span className="flex items-baseline gap-3">
                        <span className="text-amber-500">★</span>
                        <span className="text-base tracking-tight font-medium">
                          acme-website
                        </span>
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          last activity 12m ago
                        </span>
                      </span>
                      <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-rose-600 cursor-pointer">
                        unpin →
                      </a>
                    </li>
                  </ul>
                  <a className="mt-5 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    + pin a project
                  </a>
                </section>

                {/* Save row — primary CTA + secondary note */}
                <div className="mt-16 flex items-center gap-5">
                  <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-6 py-3 rounded-full shadow-sm">
                    Save preferences
                  </button>
                  <span className="italic font-sans text-sm text-stone-500">
                    or just change a value — Atlas saves as you go
                  </span>
                </div>
              </div>

              {/* RIGHT RAIL — editorial reference: shortcuts, docs, about */}
              <aside className="space-y-14">
                {/* Keyboard shortcuts — Ctrl on Windows, ⌘ on Mac */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Shortcuts
                  </div>
                  <ul className="mt-5 space-y-3 text-sm">
                    <ShortcutRow keys={["Ctrl", "K"]} label="Command palette" soon />
                    <ShortcutRow keys={["Ctrl", "/"]} label="Search Tickets" />
                    <ShortcutRow keys={["G", "T"]} label="Go to Triage" />
                    <ShortcutRow keys={["G", "R"]} label="Go to Review" />
                    <ShortcutRow keys={["G", "S"]} label="Go to Settings" />
                    <ShortcutRow keys={["?"]} label="Show all shortcuts" />
                  </ul>
                  <div className="mt-5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    For Windows · <span className="text-stone-500">⌘</span> on Mac
                  </div>
                </section>

                {/* Docs */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Docs
                  </div>
                  <ul className="mt-5 space-y-3">
                    <li>
                      <a className="group flex items-baseline justify-between text-sm text-stone-700 hover:text-stone-900 cursor-pointer">
                        <span>Getting started</span>
                        <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                          →
                        </span>
                      </a>
                    </li>
                    <li>
                      <a className="group flex items-baseline justify-between text-sm text-stone-700 hover:text-stone-900 cursor-pointer">
                        <span>Atlas concepts</span>
                        <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                          →
                        </span>
                      </a>
                    </li>
                    <li>
                      <a className="group flex items-baseline justify-between text-sm text-stone-700 hover:text-stone-900 cursor-pointer">
                        <span>Bridges &amp; dispatch</span>
                        <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                          →
                        </span>
                      </a>
                    </li>
                    <li>
                      <a className="group flex items-baseline justify-between text-sm text-stone-700 hover:text-stone-900 cursor-pointer">
                        <span>Sequence hints &amp; Ship Groups</span>
                        <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                          →
                        </span>
                      </a>
                    </li>
                  </ul>
                </section>

                {/* About */}
                <section className="pt-6 border-t border-stone-200/80">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    About
                  </div>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-500">Version</span>
                      <span className="font-mono text-stone-900">v1.3.0-design</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-500">Build</span>
                      <span className="font-mono text-stone-900">ab05f49</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-500">Status</span>
                      <span className="font-mono text-emerald-600 flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        all systems normal
                      </span>
                    </li>
                  </ul>
                </section>
              </aside>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant H · editorial settings
        </div>
      </div>
    </>
  );
}
