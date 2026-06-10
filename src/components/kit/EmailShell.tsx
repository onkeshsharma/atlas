/**
 * Kit — EmailShell + EmailStat: the Collaborator email chrome.
 *
 * Shell ported from design/variants/variant-aa-email.tsx:29–56 (header
 * rows) with the footer from variant-yy-digest.tsx:195–203 (folded inside
 * the overflow-hidden shell — same rendered geometry). EmailStat ported
 * from variant-yy-digest.tsx:221–232. Governing canon: §4-M13 — the
 * stone-100 canvas behind the shell is the email SURFACE's job (§1.1:
 * the amber page wash is absent only in emails); email is the one surface
 * where FeaturedCards may carry the layout.
 */

export function EmailShell({
  from,
  fromAddress,
  to,
  subject,
  footerLeft,
  footerRight,
  children,
}: {
  from: string;
  fromAddress: string;
  to: string;
  subject: string;
  /** mono footer left — "atlas.com · @atlas-internal" (YY:197). */
  footerLeft?: React.ReactNode;
  /** mono footer right — unsubscribe / preferences links (YY:198–202). */
  footerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-2xl bg-amber-50/40 rounded-2xl border border-stone-200 shadow-lg overflow-hidden">
      {/* Header — from / to / subj */}
      <div className="px-10 pt-10 pb-6 border-b border-stone-200">
        <div className="space-y-2 font-mono text-xs uppercase tracking-widest">
          <div className="flex items-baseline gap-3">
            <span className="text-stone-400 w-12">from</span>
            <span className="text-stone-900">
              {from}{" "}
              <span className="text-stone-400 normal-case tracking-normal font-sans text-xs">
                &lt;{fromAddress}&gt;
              </span>
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-stone-400 w-12">to</span>
            <span className="text-stone-900 normal-case tracking-normal font-mono">{to}</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-stone-400 w-12">subj</span>
            <span className="text-stone-900 normal-case tracking-normal font-sans text-sm">
              {subject}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <article className="px-10 pt-10 pb-10">{children}</article>

      {/* Footer */}
      {(footerLeft || footerRight) && (
        <div className="bg-stone-50 border-t border-stone-200 px-10 py-6 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-stone-400">
          <span>{footerLeft}</span>
          <span className="flex items-center gap-3">{footerRight}</span>
        </div>
      )}
    </div>
  );
}

/** YY:221–232 — digest stat card: mono display number over a quiet label. */
export function EmailStat({ n, label }: { n: string; label: string }) {
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
