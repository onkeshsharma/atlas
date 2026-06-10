// THROWAWAY — Editorial destructive-confirmation modal.
// Pattern: modal over a ghosted background, type-the-name confirmation,
// quiet rose accents (not alarm-red).

import { NAV } from "./mock-data";

export function VariantJJDelete() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-hidden bg-amber-50/30 text-stone-900 font-sans">
        {/* GHOSTED PROJECT PAGE BEHIND THE MODAL */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="flex min-h-screen">
            <aside className="w-[56px] shrink-0 flex flex-col items-center justify-between py-8 border-r border-stone-200/60">
              <div className="relative h-6 w-6 flex items-center justify-center">
                <div className="text-xl font-bold tracking-tighter leading-none">a</div>
              </div>
              <nav className="flex flex-col items-center gap-5">
                {NAV.map((n) => (
                  <a
                    key={n.key}
                    className="relative h-7 w-7 flex items-center justify-center text-stone-400"
                  >
                    <span className="text-base font-medium">{n.short.charAt(0)}</span>
                  </a>
                ))}
              </nav>
              <div className="relative h-6 w-6 flex items-center justify-center">
                <div className="text-xl font-bold tracking-tighter leading-none text-stone-900">o</div>
              </div>
            </aside>
            <main className="flex-1 px-16 pt-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Projects · acme-website
              </div>
              <h1 className="mt-3 text-5xl font-bold tracking-tighter">acme-website.</h1>
            </main>
          </div>
        </div>

        {/* MODAL — centered destructive confirmation */}
        <div className="absolute inset-0 backdrop-blur-md bg-amber-50/40 flex items-center justify-center px-8">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-stone-200 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 border-b border-stone-200">
              <div className="font-mono text-xs uppercase tracking-widest text-rose-700">
                ● Permanent · cannot be undone
              </div>
              <h2 className="mt-3 text-4xl font-bold tracking-tighter leading-tight">
                Delete <span className="font-mono text-stone-700">acme-website</span>?
              </h2>
              <p className="mt-4 text-base text-stone-700 leading-relaxed">
                Atlas will forget this Project, every Ticket filed against it,
                every Job that ran, every Brief, and every Collaborator
                relationship. Your code on the Bridge stays where it is.
              </p>
            </div>

            {/* What gets removed */}
            <div className="px-8 py-6 border-b border-stone-200">
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                What goes away
              </div>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li className="flex items-baseline gap-3">
                  <span className="text-rose-500 mt-1.5">✕</span>
                  <span className="text-stone-700">
                    <span className="font-mono text-stone-900">47</span> Tickets,
                    including <span className="font-mono text-stone-900">3</span>{" "}
                    you have open right now
                  </span>
                </li>
                <li className="flex items-baseline gap-3">
                  <span className="text-rose-500 mt-1.5">✕</span>
                  <span className="text-stone-700">
                    <span className="font-mono text-stone-900">62</span> Jobs run
                    by the Engine
                  </span>
                </li>
                <li className="flex items-baseline gap-3">
                  <span className="text-rose-500 mt-1.5">✕</span>
                  <span className="text-stone-700">
                    The CONTEXT.md you maintained
                  </span>
                </li>
                <li className="flex items-baseline gap-3">
                  <span className="text-rose-500 mt-1.5">✕</span>
                  <span className="text-stone-700">
                    <span className="font-mono text-stone-900">3</span>{" "}
                    Collaborators&rsquo; access to this Project (their accounts
                    stay)
                  </span>
                </li>
              </ul>
              <div className="mt-5 flex items-baseline gap-3 pt-4 border-t border-stone-200">
                <span className="text-emerald-600 mt-1.5">●</span>
                <span className="text-sm text-stone-700">
                  Your{" "}
                  <span className="font-mono text-stone-900">
                    github.com/acme/website
                  </span>{" "}
                  repository — unchanged. Atlas never had it.
                </span>
              </div>
            </div>

            {/* Confirmation input */}
            <div className="px-8 py-6 border-b border-stone-200">
              <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                Type{" "}
                <span className="text-stone-900 normal-case tracking-normal font-mono bg-stone-100 px-1.5 py-0.5 rounded">
                  acme-website
                </span>{" "}
                to confirm
              </label>
              <input
                type="text"
                placeholder="acme-website"
                className="mt-3 w-full bg-transparent border-b border-stone-300 py-2 text-base font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-rose-500 transition"
              />
            </div>

            {/* Actions */}
            <div className="px-8 py-5 flex items-center justify-between bg-stone-50/40">
              <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-stone-900 cursor-pointer">
                cancel
              </a>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  ⏎ to confirm
                </span>
                <button
                  className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-rose-600 hover:bg-rose-700 px-5 py-3 rounded-full shadow-sm inline-flex items-center gap-2 disabled:bg-stone-300 disabled:cursor-not-allowed"
                  disabled
                >
                  Delete forever
                  <span className="text-rose-200">✕</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-8 font-mono text-[10px] uppercase tracking-widest text-stone-400 z-10">
          atlas · v1.3 design lab · variant JJ · editorial destructive modal
        </div>
      </div>
    </>
  );
}
