// THROWAWAY — Editorial Weekly Digest email prototype.
// The Collaborator's weekly summary email layout — sibling to AA (per-Ticket
// Ship Notification). This one is the round-up that lands every Monday 09:00
// in the Collaborator's mailbox.

export function VariantYYDigest() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-stone-100 text-stone-900 font-sans">
        {/* Header chrome — mock Resend preview */}
        <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          Resend · preview · weekly-digest.atlas-internal · Mon 09:00 BST
        </div>
        <div className="absolute top-8 right-8 flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-stone-500">
          <a className="hover:text-stone-900 cursor-pointer">desktop</a>
          <a className="text-stone-900 cursor-pointer border-b border-amber-500 pb-0.5">mobile</a>
          <a className="hover:text-stone-900 cursor-pointer">plain-text →</a>
        </div>

        <main className="min-h-screen pt-28 pb-24 px-6">
          {/* Email envelope */}
          <div className="max-w-2xl mx-auto">
            {/* Mail headers */}
            <div className="rounded-t-2xl bg-white border border-stone-200 border-b-0 px-7 pt-6 pb-4 font-mono text-xs text-stone-500 space-y-1.5">
              <div className="flex items-baseline gap-3">
                <span className="w-12 text-stone-400 uppercase tracking-widest text-[10px]">
                  From
                </span>
                <span className="text-stone-700">Atlas &lt;hello@atlas.com&gt;</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="w-12 text-stone-400 uppercase tracking-widest text-[10px]">
                  To
                </span>
                <span className="text-stone-700">Priya &lt;priya@trinetr.in&gt;</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="w-12 text-stone-400 uppercase tracking-widest text-[10px]">
                  Subject
                </span>
                <span className="text-stone-900 font-medium normal-case font-sans text-sm">
                  4 things shipped on atlas-internal this week
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="w-12 text-stone-400 uppercase tracking-widest text-[10px]">
                  Preview
                </span>
                <span className="text-stone-500 normal-case font-sans text-sm">
                  Including the timezone fix you filed Friday.
                </span>
              </div>
            </div>

            {/* Email body */}
            <div className="bg-amber-50/40 border-x border-stone-200 px-10 py-12">
              {/* Brand line */}
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="relative inline-block">
                    <span className="text-2xl font-bold tracking-tighter leading-none">
                      a
                    </span>
                    <span className="absolute -right-1 top-0 inline-block h-1 w-1 rounded-full bg-amber-500" />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                    Atlas · weekly digest
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  Week 19 · May 6 → 12
                </span>
              </div>

              {/* Big hello */}
              <h1 className="mt-8 text-4xl font-bold tracking-tighter leading-tight">
                Morning, Priya.
              </h1>
              <p className="mt-4 text-lg text-stone-700 leading-relaxed">
                Onkesh shipped{" "}
                <span className="relative">
                  <span className="font-bold">4 changes</span>
                  <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-amber-500" />
                </span>{" "}
                you cared about on atlas-internal last week, including the
                timezone fix you flagged Friday afternoon.
              </p>

              {/* Numbers */}
              <div className="mt-10 grid grid-cols-3 gap-6">
                <Stat n="4" label="shipped" />
                <Stat n="2" label="opened" />
                <Stat n="1" label="still in review" />
              </div>

              {/* Shipped section */}
              <section className="mt-14">
                <div className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500 border-b border-stone-300 pb-2">
                  What shipped
                </div>
                <ol className="divide-y divide-stone-200">
                  <Ship
                    n="01"
                    title="Timezone crash on signup is fixed."
                    body="The missing-header path now falls back to UTC. Your reproduction from Friday works correctly now."
                    meta="Ticket #142 · merged Tue · PR #142"
                    you
                  />
                  <Ship
                    n="02"
                    title="New OG image on the marketing landing."
                    body="Search-shareable image now reflects the v1.2 dashboard. Sam will sleep better."
                    meta="Ticket #141 · merged Mon"
                  />
                  <Ship
                    n="03"
                    title="Brief drafter is 2× faster."
                    body="Helper Job now caches CONTEXT.md across runs. New Tickets get a Brief in ~3s instead of ~7s."
                    meta="Ticket #138 · merged Mon"
                  />
                  <Ship
                    n="04"
                    title="Bridge offline banner no longer flashes."
                    body="Race condition between initial load and first heartbeat ping is gone."
                    meta="Ticket #135 · merged Mon"
                  />
                </ol>
              </section>

              {/* In review */}
              <section className="mt-14">
                <div className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500 border-b border-stone-300 pb-2">
                  Still in review
                </div>
                <ul className="divide-y divide-stone-200">
                  <li className="py-4 grid grid-cols-[1fr_auto] items-baseline gap-4">
                    <div>
                      <div className="text-base text-stone-900">
                        Add &ldquo;mark as not-mine&rdquo; on Ticket lists
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                        Ticket #143 · awaiting Brief approval
                      </div>
                    </div>
                    <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer whitespace-nowrap">
                      view →
                    </a>
                  </li>
                </ul>
              </section>

              {/* What didn't ship */}
              <section className="mt-14">
                <div className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500 border-b border-stone-300 pb-2">
                  Filed but not progressed
                </div>
                <p className="mt-4 text-sm text-stone-600 leading-relaxed italic">
                  No Tickets from you got stuck this week. Two from Marcus are
                  awaiting Brief; Onkesh will get to them Monday.
                </p>
              </section>

              {/* CTA card */}
              <section className="mt-14 rounded-2xl bg-white border border-stone-200 p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber-700">
                  Got something for next week?
                </div>
                <p className="mt-3 text-base text-stone-700 leading-relaxed">
                  File a Ticket in plain English. Onkesh sees it in their
                  Triage inbox; Atlas drafts the Brief; you hear back when
                  it&rsquo;s shipped.
                </p>
                <a className="mt-5 inline-block font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-5 py-3 rounded-full cursor-pointer">
                  Open Atlas →
                </a>
              </section>

              {/* Colophon */}
              <div className="mt-16 pt-10 border-t border-stone-300/80">
                <p className="text-sm italic text-stone-500 leading-relaxed">
                  You&rsquo;re receiving this digest because you&rsquo;re a
                  Collaborator on atlas-internal. Atlas only emails you for
                  things that touched a Ticket you filed or @-mentioned you
                  in. Switch to per-Ticket pings or turn the digest off
                  entirely from{" "}
                  <a className="not-italic font-mono text-xs text-amber-700 cursor-pointer">
                    notification settings →
                  </a>
                  .
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="rounded-b-2xl bg-stone-50 border border-stone-200 border-t-0 px-10 py-6 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-stone-400">
              <span>atlas.com · @atlas-internal</span>
              <span className="flex items-center gap-3">
                <a className="hover:text-stone-700 cursor-pointer">unsubscribe</a>
                <span className="text-stone-300">·</span>
                <a className="hover:text-stone-700 cursor-pointer">notification preferences</a>
              </span>
            </div>
          </div>

          <p className="mt-12 max-w-2xl mx-auto text-sm italic text-stone-500 leading-relaxed text-center">
            Atlas&rsquo;s digest is the only marketing-shaped thing it sends —
            and even this is opt-out per Project. Per-Ticket Ship Notifications
            (variant AA) are the default.
          </p>
        </main>

        <div className="absolute bottom-8 left-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant YY · editorial weekly digest
        </div>
      </div>
    </>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/60 border border-stone-200 p-5 text-center">
      <div className="font-mono text-4xl font-bold tracking-tighter text-stone-900 leading-none">
        {n}
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
        {label}
      </div>
    </div>
  );
}

function Ship({
  n,
  title,
  body,
  meta,
  you,
}: {
  n: string;
  title: string;
  body: string;
  meta: string;
  you?: boolean;
}) {
  return (
    <li className="py-5 grid grid-cols-[40px_1fr] gap-5 items-baseline">
      <span className="font-mono text-xs text-stone-400">{n}</span>
      <div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-lg font-semibold tracking-tight text-stone-900 leading-snug">
            {title}
          </span>
          {you && (
            <span className="font-mono text-[9px] uppercase tracking-widest text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
              from you
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-stone-700 leading-relaxed">{body}</p>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          {meta}
        </div>
      </div>
    </li>
  );
}
