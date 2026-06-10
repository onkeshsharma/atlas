// THROWAWAY — Editorial 500 error prototype.
// Sibling to X (404). Something broke on Atlas's side. Quiet, honest, useful.

export function VariantZZ500() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        {/* Top chrome */}
        <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          Atlas · 500 · unexpected error
        </div>
        <div className="absolute top-8 right-8 flex items-center gap-5 font-mono text-xs uppercase tracking-widest text-stone-500">
          <a className="hover:text-stone-900 cursor-pointer">Status ↗</a>
          <a className="hover:text-stone-900 cursor-pointer">Dashboard →</a>
        </div>

        <main className="min-h-screen flex items-center justify-center px-8 py-28">
          <div className="max-w-3xl w-full">
            {/* The very big number */}
            <div className="grid grid-cols-[auto_1fr] gap-12 items-start">
              <div>
                <div className="relative font-bold leading-none tracking-tighter">
                  <span className="text-[14rem] text-stone-900 leading-[0.85]">
                    500
                  </span>
                  <span className="absolute -bottom-2 left-0 right-0 h-[6px] bg-amber-500" />
                </div>
              </div>

              <div className="pt-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-rose-700 flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-60" />
                    <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
                  </span>
                  Something broke on our side
                </div>
                <h1 className="mt-4 text-4xl font-bold tracking-tighter leading-tight">
                  We&rsquo;re sorry.
                </h1>
                <p className="mt-5 text-lg text-stone-700 leading-relaxed">
                  Whatever you were doing didn&rsquo;t complete. We&rsquo;ve
                  logged the failure and Onkesh will see it within the hour.
                  Your work isn&rsquo;t lost — Atlas didn&rsquo;t roll forward
                  past the break.
                </p>

                <div className="mt-8 flex items-center gap-3 flex-wrap">
                  <a className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-5 py-3 rounded-full cursor-pointer">
                    Try again →
                  </a>
                  <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    take me home
                  </a>
                  <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                    open status page ↗
                  </a>
                </div>
              </div>
            </div>

            {/* What we know */}
            <section className="mt-20 grid grid-cols-2 gap-10">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">
                  What we know
                </div>
                <dl className="mt-5 space-y-3 text-sm">
                  <Row label="Error ID" value="err_8f4b2a91" mono />
                  <Row label="Time" value="10:42:17 BST" />
                  <Row label="Endpoint" value="POST /api/tickets" mono />
                  <Row label="Trace" value="2 services touched" />
                  <Row label="Logged for Owner" value="yes · within 60s" />
                </dl>
                <p className="mt-5 text-xs italic text-stone-500 leading-relaxed">
                  Quote this error ID if you email Onkesh — it gives them the
                  exact request to look at.
                </p>
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">
                  What we did
                </div>
                <ul className="mt-5 space-y-3 text-sm text-stone-700 leading-relaxed">
                  <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                    <span className="text-emerald-500 mt-1">✓</span>
                    <span>Rolled the operation back so no half-state lingers.</span>
                  </li>
                  <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                    <span className="text-emerald-500 mt-1">✓</span>
                    <span>Wrote a structured log for the on-call Owner.</span>
                  </li>
                  <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                    <span className="text-emerald-500 mt-1">✓</span>
                    <span>Bumped the relevant metric so Grafana paged.</span>
                  </li>
                  <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                    <span className="text-amber-500 mt-1">→</span>
                    <span>
                      Notified Onkesh by email if it&rsquo;s the third 500 in 10
                      minutes.
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Status sentence */}
            <section className="mt-20 rounded-2xl bg-white/70 border border-stone-200 p-6 flex items-baseline justify-between gap-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">
                  Right now on status.atlas.com
                </div>
                <p className="mt-3 text-base text-stone-700 leading-relaxed">
                  Atlas Portal is{" "}
                  <span className="text-emerald-700 font-medium">operational</span>;
                  Ticket enrichment is{" "}
                  <span className="text-amber-700 font-medium">degraded</span>.
                  If your error involved a new Ticket, that&rsquo;s probably
                  why — try again in a minute.
                </p>
              </div>
              <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer whitespace-nowrap">
                full status ↗
              </a>
            </section>

            {/* Footer */}
            <p className="mt-16 text-sm italic text-stone-500 leading-relaxed text-center max-w-xl mx-auto">
              Atlas is bootstrapped — when something breaks, it&rsquo;s one
              person fixing it. We&rsquo;ll be quick.
            </p>
          </div>
        </main>

        <div className="absolute bottom-8 left-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant ZZ · editorial 500
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-stone-500">{label}</span>
      <span className={mono ? "font-mono text-stone-700" : "text-stone-700"}>
        {value}
      </span>
    </div>
  );
}
