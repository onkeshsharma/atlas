// THROWAWAY — Editorial 404 prototype.
// The least-frequent page in Atlas — and the most tone-setting.
// Quiet, helpful, no excess chrome.

import { NAV } from "./mock-data";

export function VariantX404() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          {/* SIDEBAR — nothing active (we're nowhere) */}
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
            <div className="relative group">
              <div className="relative h-6 w-6 flex items-center justify-center cursor-pointer">
                <div className="text-xl font-bold tracking-tighter leading-none text-stone-900 group-hover:text-amber-600 transition">
                  o
                </div>
                <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </aside>

          {/* MAIN — single centred editorial moment */}
          <main className="flex-1 flex items-center px-16 pt-8 pb-24">
            <div className="max-w-2xl">
              {/* The status code as a quiet day-stamp */}
              <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
                404 · Not found
              </div>

              {/* The editorial sentence — biggest hero we use, no period this time
                  (the page is honest about being incomplete) */}
              <h1 className="mt-3 text-7xl font-bold tracking-tighter leading-[0.95]">
                Not here.
              </h1>

              {/* Honest explanation in editorial prose */}
              <p className="mt-7 text-xl text-stone-700 leading-relaxed">
                This page doesn&rsquo;t exist — or it did and got renamed, or you
                don&rsquo;t have access to it. Atlas isn&rsquo;t sure which.
              </p>

              {/* What you can do — divided list */}
              <section className="mt-16">
                <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  Where you might want to be
                </div>
                <ul className="mt-5 divide-y divide-stone-200">
                  <li className="py-3 flex items-baseline justify-between group cursor-pointer">
                    <span className="text-base text-stone-700 group-hover:text-stone-900">
                      Your dashboard
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                      go home →
                    </span>
                  </li>
                  <li className="py-3 flex items-baseline justify-between group cursor-pointer">
                    <span className="text-base text-stone-700 group-hover:text-stone-900">
                      Open a Project
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                      pick one →
                    </span>
                  </li>
                  <li className="py-3 flex items-baseline justify-between group cursor-pointer">
                    <span className="text-base text-stone-700 group-hover:text-stone-900">
                      File a Ticket about this broken link
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                      file →
                    </span>
                  </li>
                  <li className="py-3 flex items-baseline justify-between group cursor-pointer">
                    <span className="text-base text-stone-700 group-hover:text-stone-900">
                      Ask the Owner
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                      message ↗
                    </span>
                  </li>
                </ul>
              </section>

              {/* Quiet outro — Atlas's mood is honest, not apologetic */}
              <p className="mt-16 text-sm italic text-stone-500 leading-relaxed">
                If you got here by clicking a link inside Atlas, that&rsquo;s our
                bug — please file a Ticket so we can fix it. If you typed the URL,
                no harm done.
              </p>

              {/* Mono detail at the very bottom */}
              <div className="mt-12 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                Tried:{" "}
                <span className="normal-case tracking-normal text-stone-500">
                  /projects/unknown/tickets/T-9999
                </span>
              </div>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant X · editorial 404
        </div>
      </div>
    </>
  );
}
