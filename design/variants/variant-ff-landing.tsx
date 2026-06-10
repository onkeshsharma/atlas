// THROWAWAY — Editorial Marketing Landing prototype.
// atlas.com public homepage. The page that converts a visitor into an Owner.

export function VariantFFLanding() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        {/* Top nav — minimal */}
        <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          Atlas
        </div>
        <div className="absolute top-8 right-8 flex items-center gap-5 font-mono text-xs uppercase tracking-widest text-stone-500">
          <a className="hover:text-stone-900 cursor-pointer">Docs</a>
          <a className="hover:text-stone-900 cursor-pointer">Pricing</a>
          <a className="hover:text-stone-900 cursor-pointer">About</a>
          <a className="text-stone-900 hover:text-amber-600 cursor-pointer underline-offset-4 hover:underline">
            Sign in
          </a>
        </div>

        {/* Page content */}
        <main className="min-h-screen pt-32 pb-32 px-8">
          {/* HERO */}
          <section className="max-w-3xl mx-auto">
            <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
              Atlas · v1.3
            </div>
            <h1 className="mt-4 text-[5.5rem] font-bold tracking-tighter leading-[0.9]">
              A quiet place
              <br />
              for the work
              <br />
              your AI does.
            </h1>
            <p className="mt-10 text-2xl tracking-tight leading-snug text-stone-700 max-w-2xl">
              Atlas is a friendly portal that lets the non-technical people in
              your team drive software changes — without ever opening a CLI. You
              review what Atlas&rsquo;s Engine produces; the rest of your team
              files{" "}
              <span className="italic">&ldquo;please fix this&rdquo;</span> in
              plain language.
            </p>
            <div className="mt-12 flex items-center gap-5">
              <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-6 py-4 rounded-full shadow-sm inline-flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                Request an Owner invite
                <span className="text-stone-400">→</span>
              </button>
              <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                or watch a 2-min tour ↗
              </a>
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-stone-400">
              Invite-only · solo Owners run on Atlas Free
            </p>
          </section>

          {/* TWO AUDIENCES */}
          <section className="mt-40 max-w-4xl mx-auto">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Two ways in
            </div>
            <h2 className="mt-3 text-5xl font-bold tracking-tighter">
              Atlas serves two people.
            </h2>
            <div className="mt-12 grid grid-cols-2 gap-12">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-amber-700">
                  the Owner
                </div>
                <p className="mt-3 text-2xl tracking-tight leading-tight">
                  The one human reviewing every diff.
                </p>
                <p className="mt-4 text-base text-stone-700 leading-relaxed">
                  You sign in, install a Bridge, ingest a repo. The Engine runs
                  on your machine through your Claude Code account. You approve
                  what ships. Everyone else asks you to fix things.
                </p>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
                  the Collaborator
                </div>
                <p className="mt-3 text-2xl tracking-tight leading-tight">
                  The people who file in plain language.
                </p>
                <p className="mt-4 text-base text-stone-700 leading-relaxed">
                  They see a list of what they filed and what shipped, and
                  reply when the Owner asks them something. They never see
                  code, diffs, or other people&rsquo;s Tickets.
                </p>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section className="mt-40 max-w-3xl mx-auto">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              How it works
            </div>
            <h2 className="mt-3 text-5xl font-bold tracking-tighter">
              Three steps. No magic.
            </h2>

            <ol className="mt-12 space-y-14">
              <li className="grid grid-cols-[48px_1fr] gap-8 items-baseline">
                <span className="font-mono text-3xl text-stone-300 font-bold">
                  01
                </span>
                <div>
                  <h3 className="text-2xl tracking-tight font-semibold">
                    Someone files a Ticket.
                  </h3>
                  <p className="mt-3 text-base text-stone-700 leading-relaxed">
                    Plain language. &ldquo;The export buttons feel buried&rdquo;
                    or &ldquo;this typo bugs me.&rdquo; Atlas reads it, shapes
                    a Brief, surfaces relevant context.
                  </p>
                </div>
              </li>
              <li className="grid grid-cols-[48px_1fr] gap-8 items-baseline">
                <span className="font-mono text-3xl text-stone-300 font-bold">
                  02
                </span>
                <div>
                  <h3 className="text-2xl tracking-tight font-semibold">
                    You review and dispatch.
                  </h3>
                  <p className="mt-3 text-base text-stone-700 leading-relaxed">
                    Glance at the Brief. Edit it if you want. Click Dispatch.
                    The Engine runs on your computer, opens a PR, runs tests,
                    sends it back ready for review.
                  </p>
                </div>
              </li>
              <li className="grid grid-cols-[48px_1fr] gap-8 items-baseline">
                <span className="font-mono text-3xl text-stone-300 font-bold">
                  03
                </span>
                <div>
                  <h3 className="text-2xl tracking-tight font-semibold">
                    You ship. Atlas tells the reporter.
                  </h3>
                  <p className="mt-3 text-base text-stone-700 leading-relaxed">
                    Hit &ldquo;ship&rdquo;, the PR merges, the reporter gets an
                    email explaining what changed and how to verify. You move
                    on to the next Ticket.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          {/* PRIVACY PULL-QUOTE */}
          <section className="mt-40 max-w-3xl mx-auto">
            <div className="relative pl-8">
              <span className="absolute -left-2 -top-4 font-bold text-7xl text-emerald-400/80 leading-none select-none">
                &ldquo;
              </span>
              <p className="text-3xl italic text-stone-800 leading-tight tracking-tight">
                Atlas never sees your code. The Engine runs on{" "}
                <span className="not-italic font-semibold">your machine</span>{" "}
                through{" "}
                <span className="not-italic font-semibold">your Claude Code account</span>
                . What lands on Atlas&rsquo;s servers is the Brief text, the
                Result summary, and a heartbeat. Nothing else.
              </p>
              <div className="mt-5 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                The privacy story · &nbsp;
                <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                  read the full architecture →
                </a>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-40 max-w-3xl mx-auto">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Common questions
            </div>
            <h2 className="mt-3 text-5xl font-bold tracking-tighter">
              You probably want to ask.
            </h2>
            <ol className="mt-12 divide-y divide-stone-200">
              <FaqRow
                q="What does Atlas actually charge for?"
                a="Free for solo Owners up to 3 Projects with 5 Collaborators each. Atlas Pro ($12/mo) adds unlimited Projects, custom email domain, and Cloud Bridge fallback. Engine compute uses your Claude Code plan — Atlas never charges per-Ticket."
              />
              <FaqRow
                q="How does the Bridge work?"
                a="A small daemon you install once. It receives Job dispatches from Atlas, spawns the Engine locally on your machine, and ships results back. The Engine never runs in Atlas's cloud — only on yours, via the Bridge."
              />
              <FaqRow
                q="Can my Collaborators see my code?"
                a="No. Collaborators see Tickets they filed, what shipped, and the Owner's plain-language replies. They never see diffs, Engine output, or other Collaborators' Tickets."
              />
              <FaqRow
                q="What happens if I leave Atlas?"
                a="Your code on your machines stays exactly where it is. Atlas deletes its account-metadata, Brief text, Result summaries, and Bridge tokens. There's no lock-in because the Engine never moved off your computer."
              />
              <FaqRow
                q="Is there a self-hosted version?"
                a="Not yet. The portal is bootstrapped and small — running one Atlas server is enough for now. Self-host is on the v2 roadmap if there's demand."
              />
            </ol>
          </section>

          {/* CLOSING CTA */}
          <section className="mt-40 max-w-3xl mx-auto text-center">
            <p className="text-3xl tracking-tight leading-tight text-stone-700">
              Atlas is invite-only while we tune it.
              <br />
              If you have a codebase and an idea for who should drive it,
              ask for an Owner code.
            </p>
            <div className="mt-12 flex items-center justify-center gap-5">
              <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-6 py-4 rounded-full shadow-sm inline-flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                Request an Owner invite
                <span className="text-stone-400">→</span>
              </button>
              <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                or get one from a friend ↗
              </a>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="mt-40 max-w-5xl mx-auto pt-12 border-t border-stone-200">
            <div className="grid grid-cols-4 gap-12">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  Atlas
                </div>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li>
                    <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                      What it is
                    </a>
                  </li>
                  <li>
                    <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                      Pricing
                    </a>
                  </li>
                  <li>
                    <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                      Changelog
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  Learn
                </div>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li>
                    <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                      Docs
                    </a>
                  </li>
                  <li>
                    <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                      API
                    </a>
                  </li>
                  <li>
                    <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                      Architecture
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  Legal
                </div>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li>
                    <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                      Privacy
                    </a>
                  </li>
                  <li>
                    <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                      Terms
                    </a>
                  </li>
                  <li>
                    <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                      Security
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  Made by
                </div>
                <p className="mt-4 text-sm text-stone-700 leading-relaxed">
                  Onkesh, solo, in London. Bootstrapped, slow on purpose.
                </p>
                <a className="mt-3 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                  Say hi ↗
                </a>
              </div>
            </div>
            <div className="mt-12 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-stone-400">
              <span>atlas · MMXXVI</span>
              <span>
                Built with Next, Tailwind, Geist · runs on Vercel + Neon
              </span>
            </div>
          </footer>
        </main>

        {/* Editorial colophon */}
        <div className="absolute bottom-2 left-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant FF · editorial landing
        </div>
      </div>
    </>
  );
}

function FaqRow({ q, a }: { q: string; a: string }) {
  return (
    <li className="py-6 group cursor-pointer">
      <div className="flex items-baseline justify-between gap-6">
        <h3 className="text-xl tracking-tight font-medium text-stone-900 group-hover:text-stone-700">
          {q}
        </h3>
        <span className="font-mono text-stone-400 group-hover:text-stone-900 transition text-xl">
          +
        </span>
      </div>
      <p className="mt-3 text-base text-stone-700 leading-relaxed max-w-xl">
        {a}
      </p>
    </li>
  );
}
