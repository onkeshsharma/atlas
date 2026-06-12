"use client";
/**
 * M15 — the editorial 500 interior (PRD #56; charter item 2), shared by
 * app/error.tsx (route-tree failures) and app/global-error.tsx
 * (root-layout failures — same moment, self-hosted shell).
 *
 * Ported from design/variants/variant-zz-500.tsx:8–141 (corner chrome ·
 * text-[14rem] numeral with the amber rule · rose LivePulse kicker ·
 * text-4xl "We're sorry." [canon §1.2/E11] · action row · What-we-know /
 * What-we-did grid · status FeaturedCard · italic footer).
 *
 * Honesty pass — every mocked claim replaced by a true one (recorded in
 * notes/M15-manual-test.md):
 *  - ZZ:14 "Status ↗" / ZZ:57 "open status page ↗" → `→`: /status is
 *    internal now (canon §3.6 — ↗ means leaves Atlas; M14 precedent).
 *  - ZZ:15 "Dashboard →" → "Home →" to `/` — CONTEXT.md naming law
 *    (never "dashboard"); `/` lands each role on its surface.
 *  - ZZ:44 "Onkesh will see it within the hour" dropped — no alerting
 *    exists; the What-we-did list names that absence instead (the MM
 *    name-the-absence precedent).
 *  - ZZ:70–75 mock rows (Endpoint/Trace/within-60s) → the real facts:
 *    error digest, boundary time, the real path (usePathname).
 *  - ZZ:86–106 rollback/Grafana/email fictions → what actually holds:
 *    boundary containment, single-statement writes, the digest log line.
 *  - ZZ:111–128 live status sentences ("operational"/"degraded") → an
 *    honest pointer: a client error boundary can't probe the DB; the
 *    REAL probes live on /status (HANDOFF-M14's named seam).
 *  - ZZ:50–51 "Try again →" is the boundary's real reset(), not an <a>.
 *  - ZZ:138 colophon = design-lab artifact, never ported (canon §4 note).
 */
import { startTransition, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { FeaturedCard, LivePulse } from "@/src/components/kit";

export function ErrorEditorial({
  digest,
  reset,
}: {
  digest?: string;
  reset: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  // boundary-render time — client-only render, captured once (ZZ:71).
  const [at] = useState(() => new Date());
  const time = at.toLocaleTimeString("en-GB", { hour12: false });

  // ZZ:50's "Try again" made REAL for server errors too: reset() alone
  // only re-renders the broken client payload — the Next-canonical
  // refresh-then-reset re-attempts the server render (charter item 2).
  const tryAgain = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <div className="relative min-h-screen overflow-auto text-stone-900 font-sans">
      {/* Top chrome (ZZ:9–16) */}
      <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
        Atlas · 500 · unexpected error
      </div>
      <div className="absolute top-8 right-8 flex items-center gap-5 font-mono text-xs uppercase tracking-widest text-stone-500">
        {/* canon §3.6 — /status is internal: → not ↗ (ZZ drew status.atlas.com) */}
        <Link href="/status" className="hover:text-stone-900 cursor-pointer">
          Status →
        </Link>
        <Link href="/" className="hover:text-stone-900 cursor-pointer">
          Home →
        </Link>
      </div>

      <main className="min-h-screen flex items-center justify-center px-8 py-28">
        <div className="max-w-3xl w-full">
          {/* The very big number (ZZ:20–29) */}
          <div className="grid grid-cols-[auto_1fr] gap-12 items-start">
            <div>
              <div className="relative font-bold leading-none tracking-tighter">
                <span className="text-[14rem] text-stone-900 leading-[0.85]">500</span>
                <span className="absolute -bottom-2 left-0 right-0 h-[6px] bg-amber-500" />
              </div>
            </div>

            <div className="pt-8">
              {/* rose LivePulse kicker (ZZ:32–38; §2.7 — a live outage pulses) */}
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-rose-700 flex items-center gap-2">
                <LivePulse color="rose" />
                Something broke on our side
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tighter leading-tight">
                We&rsquo;re sorry.
              </h1>
              <p className="mt-5 text-lg text-stone-700 leading-relaxed">
                Whatever you were doing didn&rsquo;t complete. The failure is
                logged with the error ID below. Your work isn&rsquo;t lost —
                Atlas&rsquo;s writes are single-statement, so it didn&rsquo;t
                roll forward past the break.
              </p>

              {/* Actions (ZZ:49–59) — Try again is the boundary's reset() */}
              <div className="mt-8 flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={tryAgain}
                  className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-5 py-3 rounded-full cursor-pointer transition"
                >
                  Try again →
                </button>
                <Link
                  href="/"
                  className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer transition"
                >
                  take me home
                </Link>
                {/* canon §3.6 — internal link, no ↗ */}
                <Link
                  href="/status"
                  className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer transition"
                >
                  open the status page →
                </Link>
              </div>
            </div>
          </div>

          {/* What we know / What we did (ZZ:63–108) — true facts only */}
          <section className="mt-20 grid grid-cols-2 gap-10">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">
                What we know
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <Row
                  label="Error ID"
                  value={digest ?? "none — it broke in your browser"}
                  mono={Boolean(digest)}
                />
                <Row label="Time" value={time} mono />
                <Row label="Path" value={pathname ?? "—"} mono />
                <Row
                  label="Logged"
                  value={digest ? "server log · by that ID" : "browser console"}
                />
              </dl>
              <p className="mt-5 text-xs italic text-stone-500 leading-relaxed">
                Quote the error ID if you report this — it pins the exact line
                in the server log.
              </p>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">
                What we did
              </div>
              <ul className="mt-5 space-y-3 text-sm text-stone-700 leading-relaxed">
                <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                  <span className="text-emerald-500 mt-1">✓</span>
                  <span>
                    Caught the failure at this boundary — the rest of Atlas keeps
                    working.
                  </span>
                </li>
                <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                  <span className="text-emerald-500 mt-1">✓</span>
                  <span>
                    Left no half-state behind — every Atlas write is a single
                    conditional statement.
                  </span>
                </li>
                <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                  <span className="text-emerald-500 mt-1">✓</span>
                  <span>Logged the failure where it happened, under the ID on the left.</span>
                </li>
                <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
                  <span className="text-amber-500 mt-1">→</span>
                  <span>
                    Nobody gets paged — alerting isn&rsquo;t built yet. If this
                    keeps happening, the status page is where it shows.
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* Status card (ZZ:110–128) — the real /status cross-link.
              Chrome via kit FeaturedCard (canon §2.4 — ZZ's bare
              border-stone-200 folds to the kit's /80). */}
          <section className="mt-20">
            <FeaturedCard padding="6">
              <div className="flex items-baseline justify-between gap-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">
                  Right now on the status page
                </div>
                <p className="mt-3 text-base text-stone-700 leading-relaxed">
                  {/* canon §1.2 — paths render mono */}
                  <Link
                    href="/status"
                    className="font-mono text-sm text-stone-900 hover:text-amber-600 transition"
                  >
                    /status
                  </Link>{" "}
                  probes this same instance live — page render, a timed database
                  check, the feed cursor&rsquo;s age. If something broke
                  instance-wide, it shows there first.
                </p>
              </div>
                <Link
                  href="/status"
                  className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer whitespace-nowrap"
                >
                  full status →
                </Link>
              </div>
            </FeaturedCard>
          </section>

          {/* Footer (ZZ:130–134) — true: a solo instance */}
          <p className="mt-16 text-sm italic text-stone-500 leading-relaxed text-center max-w-xl mx-auto">
            Atlas is bootstrapped — when something breaks, it&rsquo;s one person
            fixing it. We&rsquo;ll be quick.
          </p>
        </div>
      </main>
    </div>
  );
}

/** ZZ:146–163 — the What-we-know definition row. */
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-stone-500">{label}</span>
      <span className={mono ? "font-mono text-stone-700" : "text-stone-700"}>{value}</span>
    </div>
  );
}
