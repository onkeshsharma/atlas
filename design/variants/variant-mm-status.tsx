// THROWAWAY — Editorial Status Page prototype.
// Public service-health page (atlas.com/status). Pre-app shell.

type ServiceState = "operational" | "degraded" | "outage";

const SERVICES: Array<{
  name: string;
  state: ServiceState;
  uptime90: number;
  note?: string;
}> = [
  { name: "Atlas Portal", state: "operational", uptime90: 99.98 },
  { name: "Bridge dispatch", state: "operational", uptime90: 99.95 },
  { name: "Heartbeat ingress", state: "operational", uptime90: 99.99 },
  { name: "Email · Resend", state: "operational", uptime90: 99.91, note: "third-party" },
  {
    name: "Ticket enrichment",
    state: "degraded",
    uptime90: 98.12,
    note: "slower than usual",
  },
];

const INCIDENTS = [
  {
    title: "Ticket enrichment is slow",
    state: "investigating" as const,
    when: "8 minutes ago",
    note: "Helper Jobs are taking ~30s instead of ~5s. Investigating. No data loss; new Tickets still get enriched, just later than usual.",
  },
  {
    title: "Resend delivery delay",
    state: "resolved" as const,
    when: "yesterday · 14:22 → 14:31 BST",
    note: "Resend reported a 9-minute backlog. Atlas emails landed late but all delivered. Their post-mortem at status.resend.com.",
  },
  {
    title: "Bridge dispatch retry storm",
    state: "resolved" as const,
    when: "May 8 · 09:14 → 09:18 BST",
    note: "A single Bridge sent 12k heartbeats in 4 minutes due to a clock skew bug. Caused brief queueing on our side. Bridge auto-updater shipped a fix.",
  },
];

function dot(state: ServiceState): string {
  if (state === "operational") return "bg-emerald-500";
  if (state === "degraded") return "bg-amber-500";
  return "bg-rose-500";
}
function dotText(state: ServiceState): string {
  if (state === "operational") return "text-emerald-700";
  if (state === "degraded") return "text-amber-700";
  return "text-rose-700";
}
function stateLabel(state: ServiceState): string {
  if (state === "operational") return "operational";
  if (state === "degraded") return "degraded";
  return "outage";
}

export function VariantMMStatus() {
  // Days for the uptime grid — 90 days from oldest to today
  const DAYS = Array.from({ length: 90 }, (_, i) => i);

  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          Atlas · status.atlas.com
        </div>
        <div className="absolute top-8 right-8 flex items-center gap-5 font-mono text-xs uppercase tracking-widest text-stone-500">
          <a className="hover:text-stone-900 cursor-pointer">Docs</a>
          <a className="hover:text-stone-900 cursor-pointer">Atlas →</a>
        </div>

        <main className="min-h-screen pt-28 pb-24 px-8">
          <div className="max-w-3xl mx-auto">
            {/* Day-stamp */}
            <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
              Tuesday · May 13 · 10:42 BST
            </div>

            {/* Big status sentence */}
            <h1 className="mt-4 text-6xl font-bold tracking-tighter leading-[0.95]">
              Atlas is{" "}
              <span className="relative">
                mostly
                <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-amber-500" />
              </span>{" "}
              up.
            </h1>
            <p className="mt-7 text-2xl tracking-tight text-stone-700 leading-tight">
              All core services are operational. Ticket enrichment is slower than
              usual — your Briefs may take a minute to land instead of seconds.
            </p>

            {/* Live ping */}
            <div className="mt-7 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span>last checked 12 seconds ago</span>
              <span className="text-stone-300">·</span>
              <span>auto-refreshes every 30s</span>
            </div>

            {/* SERVICES */}
            <section className="mt-20">
              <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  Services
                </h2>
                <span className="font-mono text-xs text-stone-400">
                  90-day uptime
                </span>
              </div>
              <ul className="divide-y divide-stone-200">
                {SERVICES.map((s) => (
                  <li key={s.name} className="py-5">
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="flex items-baseline gap-3">
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${dot(
                            s.state,
                          )} mt-1.5 shrink-0`}
                        />
                        <div>
                          <div className="text-base font-medium text-stone-900">
                            {s.name}
                          </div>
                          <div className="mt-0.5 flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-widest">
                            <span className={dotText(s.state)}>
                              {stateLabel(s.state)}
                            </span>
                            {s.note && (
                              <>
                                <span className="text-stone-300">·</span>
                                <span className="text-stone-400 normal-case tracking-normal italic font-sans text-xs">
                                  {s.note}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-base text-stone-900 whitespace-nowrap">
                        {s.uptime90.toFixed(2)}%
                      </span>
                    </div>

                    {/* 90-day uptime bar */}
                    <div className="mt-4 flex items-end gap-px h-4">
                      {DAYS.map((d) => {
                        // Simple deterministic fake "where's the bad day?"
                        const isBad =
                          (s.state === "degraded" && d === 89) ||
                          (s.name === "Email · Resend" && d === 88) ||
                          (s.name === "Bridge dispatch" && d === 84);
                        return (
                          <div
                            key={d}
                            className={`flex-1 rounded-sm ${
                              isBad
                                ? s.state === "degraded" && d === 89
                                  ? "bg-amber-400"
                                  : "bg-rose-400"
                                : "bg-emerald-500/70 hover:bg-emerald-500 transition-colors"
                            }`}
                            style={{ minWidth: "2px", height: "100%" }}
                            title={
                              isBad
                                ? "incident on this day"
                                : "all green"
                            }
                          />
                        );
                      })}
                    </div>
                    <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-widest text-stone-400">
                      <span>90 days ago</span>
                      <span>today</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* RECENT INCIDENTS */}
            <section className="mt-20">
              <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  Recent
                </h2>
                <span className="font-mono text-xs text-stone-400">
                  {INCIDENTS.length} incidents · 30 days
                </span>
              </div>
              <ol className="divide-y divide-stone-200">
                {INCIDENTS.map((inc, i) => (
                  <li
                    key={i}
                    className="py-5 grid grid-cols-[80px_1fr] items-baseline gap-6"
                  >
                    <span
                      className={`font-mono text-[10px] uppercase tracking-widest ${
                        inc.state === "investigating"
                          ? "text-amber-700"
                          : "text-stone-500"
                      }`}
                    >
                      {inc.state}
                    </span>
                    <div>
                      <div className="text-lg tracking-tight font-medium">
                        {inc.title}
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                        {inc.when}
                      </div>
                      <p className="mt-3 text-base text-stone-700 leading-relaxed">
                        {inc.note}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <a className="mt-5 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                full incident archive →
              </a>
            </section>

            {/* SUBSCRIBE */}
            <section className="mt-20 rounded-2xl bg-white/70 border border-stone-200/80 p-6">
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Want a heads-up?
              </div>
              <p className="mt-3 text-base text-stone-700 leading-relaxed">
                Atlas posts an update here whenever something&rsquo;s not green.
                Subscribe by email or RSS — we&rsquo;ll only ping you for real
                stuff.
              </p>
              <div className="mt-5 flex items-center gap-3 flex-wrap">
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="flex-1 min-w-[200px] bg-transparent border-b border-stone-300 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition"
                />
                <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-5 py-3 rounded-full shadow-sm">
                  Subscribe →
                </button>
              </div>
              <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                or grab the <a className="text-stone-700 hover:text-amber-600 cursor-pointer">RSS feed ↗</a>
              </div>
            </section>

            {/* Footer line */}
            <p className="mt-16 text-sm italic text-stone-500 leading-relaxed">
              Atlas is bootstrapped and small — one server, one operator. We
              try to be transparent about outages because the alternative is
              you wondering &ldquo;is it me?&rdquo;
            </p>
          </div>
        </main>

        <div className="absolute bottom-8 left-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant MM · editorial status
        </div>
      </div>
    </>
  );
}
