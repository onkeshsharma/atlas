// THROWAWAY — Editorial Ship Notification email prototype.
// What lands in the reporter's inbox when their Ticket ships.
// Email-constrained: web-safe layout, no JS, centred card.

export function VariantAAEmail() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-stone-100 text-stone-900 font-sans">
        {/* Top — preview-mode chrome (mimics "viewing email" in Atlas) */}
        <div className="absolute top-0 left-0 right-0 px-8 py-4 bg-stone-900 text-stone-50 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest">
          <span>
            <span className="text-stone-400">Preview</span>{" "}
            <span className="mx-1 text-stone-500">·</span> ship notification ·
            sent <span className="text-stone-50">10:42 AM</span>
          </span>
          <span className="flex items-center gap-3">
            <a className="text-stone-50 hover:text-amber-400 cursor-pointer">
              edit template ↗
            </a>
            <span className="text-stone-500">·</span>
            <a className="text-stone-50 hover:text-amber-400 cursor-pointer">
              close
            </a>
          </span>
        </div>

        {/* Email card — centred on the page like an email client preview */}
        <main className="min-h-screen flex items-start justify-center pt-24 pb-24 px-8">
          <div className="w-full max-w-2xl bg-amber-50/40 rounded-2xl border border-stone-200 shadow-lg overflow-hidden">
            {/* Email header — from / to / subject */}
            <div className="px-10 pt-10 pb-6 border-b border-stone-200">
              <div className="space-y-2 font-mono text-xs uppercase tracking-widest">
                <div className="flex items-baseline gap-3">
                  <span className="text-stone-400 w-12">from</span>
                  <span className="text-stone-900">
                    Atlas{" "}
                    <span className="text-stone-400 normal-case tracking-normal font-sans text-xs">
                      &lt;ship@atlas.com&gt;
                    </span>
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-stone-400 w-12">to</span>
                  <span className="text-stone-900 normal-case tracking-normal font-mono">
                    carmen@acme.io
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-stone-400 w-12">subj</span>
                  <span className="text-stone-900 normal-case tracking-normal font-sans text-sm">
                    Your &ldquo;Add JSON export&rdquo; is shipped
                  </span>
                </div>
              </div>
            </div>

            {/* Email body */}
            <article className="px-10 pt-10 pb-10">
              {/* Greeting */}
              <p className="text-base text-stone-700 leading-relaxed">
                Hi <span className="font-medium text-stone-900">Carmen</span>,
              </p>

              {/* Lede — the shipped sentence */}
              <p className="mt-6 text-2xl tracking-tight leading-tight text-stone-900">
                The{" "}
                <span className="font-semibold">JSON export</span> you asked for
                is live on{" "}
                <span className="font-semibold">acme-website</span>.
              </p>

              {/* What changed — editorial pull-quote */}
              <div className="relative mt-10 pl-6">
                <span className="absolute -left-1 -top-3 font-bold text-5xl text-emerald-400/80 leading-none select-none">
                  &ldquo;
                </span>
                <p className="text-base italic text-stone-800 leading-relaxed">
                  To check this works: open the ticket list at{" "}
                  <span className="font-mono text-sm not-italic text-stone-700">
                    /projects/acme/tickets
                  </span>
                  , click <span className="not-italic">Export ▾</span>, and pick{" "}
                  <span className="not-italic">JSON</span>. You should get a
                  file with every visible ticket, including its state and
                  reporter. Archived tickets are excluded by default — toggle
                  &ldquo;include archived&rdquo; to see them too.
                </p>
                <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  what the Engine did, in plain language
                </div>
              </div>

              {/* Actions */}
              <div className="mt-12 flex flex-wrap gap-3">
                <a className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-5 py-3 rounded-full inline-flex items-center gap-2 shadow-sm cursor-pointer">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Try it on acme.com
                  <span className="text-stone-400">↗</span>
                </a>
                <a className="font-mono text-xs uppercase tracking-widest text-stone-700 bg-white border border-stone-200 hover:border-stone-300 px-5 py-3 rounded-full inline-flex items-center cursor-pointer">
                  See the Pull Request
                  <span className="ml-2 text-stone-400">↗</span>
                </a>
              </div>

              {/* If something's wrong */}
              <p className="mt-12 text-base text-stone-700 leading-relaxed">
                If anything still feels off, just reply to this email or click{" "}
                <a className="text-amber-600 hover:underline cursor-pointer">
                  &ldquo;Still broken&rdquo;
                </a>{" "}
                in Atlas. It&rsquo;ll go straight back to{" "}
                <span className="font-medium text-stone-900">Onkesh</span>.
              </p>

              {/* Signature */}
              <p className="mt-12 text-base text-stone-700 leading-relaxed">
                — Onkesh
                <br />
                <span className="font-mono text-xs text-stone-500">
                  via Atlas
                </span>
              </p>

              {/* Inline ticket reference */}
              <div className="mt-12 pt-6 border-t border-stone-200/80 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-stone-400">
                <span>
                  Ticket{" "}
                  <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                    T-249
                  </a>
                  <span className="mx-2">·</span>
                  filed by you{" "}
                  <span className="text-stone-500">3 days ago</span>
                </span>
                <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                  view in Atlas →
                </a>
              </div>
            </article>

            {/* Email footer — quiet Atlas branding */}
            <div className="px-10 py-6 bg-stone-50/60 border-t border-stone-200/80">
              <div className="flex items-baseline justify-between gap-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  <span className="text-stone-900 font-bold">atlas</span>
                  <span className="mx-2">·</span>
                  a quiet portal for the work your Engine does
                </div>
                <a className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-600 cursor-pointer">
                  unsubscribe
                </a>
              </div>
            </div>
          </div>
        </main>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant AA · editorial ship email
        </div>
        <div className="absolute bottom-8 right-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          mailto plain-text fallback{" "}
          <a className="ml-2 text-stone-700 hover:text-amber-600 cursor-pointer">
            view ↗
          </a>
        </div>
      </div>
    </>
  );
}
