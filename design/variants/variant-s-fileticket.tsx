// THROWAWAY — Editorial File-a-Ticket prototype.
// The Collaborator's primary action: filing a new Ticket against a Project.

import { NAV } from "./mock-data";

const RECENT_FILED = [
  { id: "T-301", title: "Add CSV export to ticket list", reporter: "ada", when: "2h ago", state: "triage" },
  { id: "T-302", title: "Onboarding screenshots are stale", reporter: "carmen", when: "5h ago", state: "triage" },
  { id: "T-280", title: "Mermaid renders blank on iOS", reporter: "you", when: "3d ago", state: "backlog" },
];

export function VariantSFileTicket() {
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
              Projects · acme-website · File a Ticket
            </div>

            <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
              {/* MAIN COL */}
              <div className="max-w-2xl">
                {/* Hero */}
                <h1 className="text-5xl font-bold tracking-tighter">
                  What needs fixing?
                </h1>
                <p className="mt-4 text-lg text-stone-700 leading-relaxed">
                  Tell us what you ran into, or what you&rsquo;d love to see. Atlas
                  shapes it into a Brief, the Engine takes it from there, and
                  you&rsquo;ll see what shipped.
                </p>

                {/* Form */}
                <section className="mt-16 space-y-12">
                  {/* TITLE */}
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                      Title
                    </label>
                    <input
                      type="text"
                      placeholder="One short sentence — e.g. &lsquo;Export buttons feel buried&rsquo;"
                      className="mt-3 w-full bg-transparent border-b border-stone-300 py-3 text-2xl font-bold tracking-tight text-stone-900 placeholder:text-stone-400 placeholder:font-normal focus:outline-none focus:border-stone-900 transition"
                    />
                  </div>

                  {/* BODY */}
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                      What&rsquo;s the story?
                    </label>
                    <p className="mt-2 text-sm text-stone-500 italic leading-relaxed">
                      What did you try · what did you expect · what actually happened.
                      Or just: what you wish Atlas did instead.
                    </p>
                    <textarea
                      rows={8}
                      placeholder={`When I open the ticket list, I can't find any obvious way to export the data. I know we shipped JSON export but the buttons feel buried — they're in the overflow menu and the icon doesn't read as "download" to me.\n\nCould we surface the export options as primary affordances near the top of the toolbar?`}
                      className="mt-4 w-full bg-transparent border-b border-stone-300 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition resize-none leading-relaxed"
                    />
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      Markdown OK · the Engine reads this verbatim
                    </div>
                  </div>

                  {/* KIND segmented */}
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                      What kind?
                    </label>
                    <p className="mt-2 text-sm text-stone-500 italic leading-relaxed">
                      Pick one. Or leave it — Atlas will guess.
                    </p>
                    <div className="mt-4 inline-flex items-center font-mono text-xs uppercase tracking-widest rounded-full border border-stone-200 overflow-hidden">
                      <button className="px-4 py-2.5 text-stone-500 hover:bg-stone-100">
                        Bug
                      </button>
                      <button className="px-4 py-2.5 bg-stone-900 text-stone-50">
                        Enhancement
                      </button>
                      <button className="px-4 py-2.5 text-stone-500 hover:bg-stone-100">
                        Something else
                      </button>
                    </div>
                  </div>

                  {/* PRIORITY segmented */}
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                      How urgent? <span className="text-stone-400">· optional</span>
                    </label>
                    <div className="mt-4 inline-flex items-center font-mono text-xs uppercase tracking-widest rounded-full border border-stone-200 overflow-hidden">
                      <button className="px-4 py-2.5 bg-stone-900 text-stone-50">
                        Whenever
                      </button>
                      <button className="px-4 py-2.5 text-stone-500 hover:bg-stone-100">
                        Soon
                      </button>
                      <button className="px-4 py-2.5 text-stone-500 hover:bg-stone-100">
                        Today
                      </button>
                      <button className="px-4 py-2.5 text-stone-500 hover:bg-stone-100">
                        Broken now
                      </button>
                    </div>
                  </div>

                  {/* ATTACHMENT */}
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                      Anything to attach? <span className="text-stone-400">· optional</span>
                    </label>
                    <p className="mt-2 text-sm text-stone-500 italic leading-relaxed">
                      Screenshots, logs, links. Drag &amp; drop or paste.
                    </p>
                    <div className="mt-4 border border-dashed border-stone-300 rounded-lg p-6 text-center font-mono text-[10px] uppercase tracking-widest text-stone-400 hover:border-stone-400 transition cursor-pointer">
                      drop files here · or click to choose
                    </div>
                  </div>

                  {/* SUBMIT */}
                  <div className="pt-4 flex items-center gap-4">
                    <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-6 py-3.5 rounded-full shadow-sm inline-flex items-center gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                      File this Ticket
                      <span className="text-stone-400">→</span>
                    </button>
                    <span className="italic font-sans text-sm text-stone-500">
                      it&rsquo;ll appear in Triage in a few seconds
                    </span>
                  </div>
                </section>
              </div>

              {/* RIGHT RAIL */}
              <aside className="space-y-14">
                {/* Tips for a good ticket */}
                <section>
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    What makes a good Ticket
                  </div>
                  <ol className="mt-5 space-y-4 text-sm text-stone-700 leading-relaxed">
                    <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                      <span className="font-mono text-xs text-stone-400">01</span>
                      <div>
                        Tell the story, not the solution. The Engine is good at
                        figuring out <em>how</em>; tell it the <em>what</em>.
                      </div>
                    </li>
                    <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                      <span className="font-mono text-xs text-stone-400">02</span>
                      <div>
                        Mention the page, file, or moment in the app where you ran
                        into it.
                      </div>
                    </li>
                    <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                      <span className="font-mono text-xs text-stone-400">03</span>
                      <div>
                        One thing per Ticket. If you have three asks, file three
                        Tickets.
                      </div>
                    </li>
                  </ol>
                </section>

                {/* What happens next */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    What happens next
                  </div>
                  <ol className="mt-5 space-y-3 text-sm text-stone-700 leading-relaxed">
                    <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                      <span className="font-mono text-xs text-stone-400">→</span>
                      <span>
                        Atlas writes a <em>Brief</em> from your description.
                      </span>
                    </li>
                    <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                      <span className="font-mono text-xs text-stone-400">→</span>
                      <span>The Owner reviews and approves.</span>
                    </li>
                    <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                      <span className="font-mono text-xs text-stone-400">→</span>
                      <span>The Engine ships a fix on their Bridge.</span>
                    </li>
                    <li className="grid grid-cols-[24px_1fr] gap-3 items-baseline">
                      <span className="font-mono text-xs text-stone-400">→</span>
                      <span>
                        You get an email with{" "}
                        <em>how to verify</em> what changed.
                      </span>
                    </li>
                  </ol>
                </section>

                {/* Recently filed on this project */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Recently filed here
                  </div>
                  <ul className="mt-5 divide-y divide-stone-200">
                    {RECENT_FILED.map((t) => (
                      <li
                        key={t.id}
                        className="py-3 group cursor-pointer"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm text-stone-700 group-hover:text-stone-900 truncate">
                            {t.title}
                          </span>
                          <span className="font-mono text-[10px] text-stone-400 whitespace-nowrap">
                            {t.when}
                          </span>
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          {t.id} · {t.reporter}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Footer */}
                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    You can edit or close any Ticket you file. The Owner sees
                    everything; other Collaborators only see what shipped.
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant S · editorial file a ticket
        </div>
      </div>
    </>
  );
}
