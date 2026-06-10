// THROWAWAY — Editorial Bridges page prototype.
// Same Settings 2-pane structure as variant H but with Bridges active.

import { NAV } from "./mock-data";

type SubNavItem = {
  key: string;
  label: string;
  badge?: number | string;
  active?: boolean;
  upcoming?: boolean;
};

const SUB_NAV: SubNavItem[] = [
  { key: "bridges", label: "Bridges", badge: 1, active: true },
  { key: "preferences", label: "Preferences" },
  { key: "account", label: "Account", upcoming: true },
  { key: "notifications", label: "Notifications", upcoming: true },
  { key: "billing", label: "Billing", upcoming: true },
];

type BridgeStatus = "healthy" | "unhealthy" | "offline";

type Bridge = {
  name: string;
  status: BridgeStatus;
  lastHeartbeat: string;
  registered: string;
  preflightAt: string;
  totalJobs: number;
  activeJobs: number;
};

const BRIDGES: Bridge[] = [
  {
    name: "macbook-pro-2024",
    status: "healthy",
    lastHeartbeat: "12 seconds ago",
    registered: "6 months ago",
    preflightAt: "2 hours ago",
    totalJobs: 247,
    activeJobs: 0,
  },
];

function statusDot(s: BridgeStatus): string {
  if (s === "healthy") return "bg-emerald-500";
  if (s === "unhealthy") return "bg-amber-500";
  return "bg-rose-500";
}
function statusText(s: BridgeStatus): string {
  if (s === "healthy") return "text-emerald-700";
  if (s === "unhealthy") return "text-amber-700";
  return "text-rose-700";
}
function statusLabel(s: BridgeStatus): string {
  if (s === "healthy") return "online · healthy";
  if (s === "unhealthy") return "online · unhealthy";
  return "offline";
}

export function VariantNBridges() {
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

          {/* SETTINGS 2-PANE — sub-nav (200) + content (1fr) + rail (360) */}
          <main className="flex-1 px-16 pt-8 pb-24">
            <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
              Settings · Bridges
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

              {/* CONTENT — Bridges */}
              <div className="max-w-2xl">
                {/* Hero — title + inline stats */}
                <div className="flex items-baseline gap-6 flex-wrap">
                  <h1 className="text-5xl font-bold tracking-tighter">Bridges.</h1>
                  <p className="text-base text-stone-500">
                    <span className="font-mono text-stone-900">{BRIDGES.length}</span>{" "}
                    registered ·{" "}
                    <span className="font-mono text-emerald-600">
                      {BRIDGES.filter((b) => b.status === "healthy").length}
                    </span>{" "}
                    online
                  </p>
                </div>
                <p className="mt-4 text-lg text-stone-500 leading-relaxed max-w-xl">
                  Your Bridge is the daemon that runs the Engine locally on your
                  computer. Atlas dispatches Jobs to it; results come back.
                </p>

                {/* REGISTERED list */}
                <section className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Registered
                    </h2>
                    <span className="font-mono text-xs text-stone-400">
                      {BRIDGES.length}
                    </span>
                  </div>
                  <ul className="divide-y divide-stone-200">
                    {BRIDGES.map((b) => (
                      <li key={b.name} className="py-7 group">
                        <div className="flex items-baseline justify-between gap-6">
                          <div className="flex items-baseline gap-3">
                            <span className="relative flex h-1.5 w-1.5 mt-1.5">
                              {b.status === "healthy" && (
                                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                              )}
                              <span
                                className={`relative inline-block h-1.5 w-1.5 rounded-full ${statusDot(
                                  b.status,
                                )}`}
                              />
                            </span>
                            <div>
                              <div className="text-lg font-medium tracking-tight font-mono text-stone-900">
                                {b.name}
                              </div>
                              <div
                                className={`mt-1 font-mono text-[10px] uppercase tracking-widest ${statusText(
                                  b.status,
                                )}`}
                              >
                                {statusLabel(b.status)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition">
                            <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                              run doctor →
                            </a>
                            <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-rose-600 cursor-pointer">
                              revoke ✕
                            </a>
                          </div>
                        </div>

                        {/* Detail rows */}
                        <ul className="mt-5 ml-5 space-y-1.5 text-sm">
                          <li className="flex items-baseline justify-between">
                            <span className="text-stone-700">Last heartbeat</span>
                            <span className="font-mono text-stone-900">
                              {b.lastHeartbeat}
                            </span>
                          </li>
                          <li className="flex items-baseline justify-between">
                            <span className="text-stone-700">Last preflight</span>
                            <span className="font-mono text-stone-900">
                              {b.preflightAt} · passed
                            </span>
                          </li>
                          <li className="flex items-baseline justify-between">
                            <span className="text-stone-700">Active jobs</span>
                            <span className="font-mono text-stone-900">
                              {b.activeJobs}
                            </span>
                          </li>
                          <li className="flex items-baseline justify-between">
                            <span className="text-stone-700">Total jobs run</span>
                            <span className="font-mono text-stone-900">
                              {b.totalJobs}
                            </span>
                          </li>
                          <li className="flex items-baseline justify-between">
                            <span className="text-stone-700">Registered</span>
                            <span className="font-mono text-stone-900">
                              {b.registered}
                            </span>
                          </li>
                        </ul>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* REGISTER form */}
                <section className="mt-16">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Register a new Bridge
                  </div>
                  <p className="mt-4 text-base text-stone-500 leading-relaxed">
                    Generate a one-time token, then run{" "}
                    <span className="font-mono text-sm text-stone-700">
                      atlas-bridge register
                    </span>{" "}
                    on the machine you want to dispatch Jobs to. The token expires in
                    10 minutes.
                  </p>

                  <div className="mt-7 space-y-7">
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        Label
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. desktop-linux-2024"
                        className="mt-2 w-full bg-transparent border-b border-stone-300 py-2 text-base font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition"
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex items-center gap-4">
                    <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-5 py-3 rounded-full shadow-sm">
                      Generate token →
                    </button>
                    <span className="italic font-sans text-sm text-stone-500">
                      we&rsquo;ll show the install command on the next step
                    </span>
                  </div>
                </section>

                {/* INSTALL HINT — quiet copy block */}
                <section className="mt-16">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    How install works
                  </div>
                  <ol className="mt-5 space-y-4 text-base text-stone-700 leading-relaxed">
                    <li className="grid grid-cols-[24px_1fr] gap-4 items-baseline">
                      <span className="font-mono text-xs text-stone-400">01</span>
                      <div>
                        Generate a token above and copy the one-line install command
                        Atlas shows you.
                      </div>
                    </li>
                    <li className="grid grid-cols-[24px_1fr] gap-4 items-baseline">
                      <span className="font-mono text-xs text-stone-400">02</span>
                      <div>
                        Run it on the machine that will host your Bridge. It downloads
                        the binary, prompts for your Claude Code authorization, and
                        registers itself with Atlas.
                      </div>
                    </li>
                    <li className="grid grid-cols-[24px_1fr] gap-4 items-baseline">
                      <span className="font-mono text-xs text-stone-400">03</span>
                      <div>
                        Atlas detects the heartbeat. The new Bridge appears in the
                        list above with a green dot.
                      </div>
                    </li>
                  </ol>
                  <a className="mt-6 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    Full Bridge docs ↗
                  </a>
                </section>
              </div>

              {/* RIGHT RAIL */}
              <aside className="space-y-14">
                {/* Status hero */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Status
                  </div>
                  <div className="mt-3">
                    <span className="relative text-2xl font-bold tracking-tight">
                      All Bridges online
                      <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-emerald-500" />
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                    No queued jobs · last failure was{" "}
                    <span className="font-mono">8 minutes ago</span> on T-247.
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Uptime · 30d</span>
                      <span className="font-mono text-stone-900">99.1%</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Avg job time</span>
                      <span className="font-mono text-stone-900">~5 min</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Jobs · 30d</span>
                      <span className="font-mono text-stone-900">62</span>
                    </li>
                  </ul>
                </section>

                {/* Doctor card — featured */}
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Doctor
                  </div>
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                    Ask your Bridges to run their preflight checks now (git, gh, gpg,
                    node, claude-code).
                  </p>
                  <button className="mt-5 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3 rounded-full inline-flex items-center justify-center gap-2 shadow-sm">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Run doctor on all
                    <span className="text-stone-400">→</span>
                  </button>
                  <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    last run · 2 hours ago · all green
                  </div>
                </section>

                {/* About */}
                <section className="pt-4 border-t border-stone-200/80">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    About Bridges
                  </div>
                  <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                    The Engine never runs in Atlas&rsquo;s cloud — only on your own
                    machine, via the Bridge. That&rsquo;s how your code stays yours.
                  </p>
                  <a className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    Why your Bridge ↗
                  </a>
                </section>
              </aside>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant N · editorial bridges
        </div>
      </div>
    </>
  );
}
