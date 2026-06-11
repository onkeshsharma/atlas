// M14 — public status page. Ported from
// design/variants/variant-mm-status.tsx:66–272 (fidelity protocol §5):
// corner chrome, day-stamp + text-6xl status sentence with the §2.2 accent,
// live ping line, Services divided rows, Recent section, featured card,
// italic footer. The design-lab colophon is NOT ported (canon §4 footnote).
//
// Honest composition (charter item 5, the M6 deviation precedent — all
// recorded in notes/M14-manual-test.md):
//  - Signals are REAL probes only: app (self-evident at render), DB
//    (timed select 1), live feed cursor age. MM's mock services, 90-day
//    uptime percentages and bars do NOT port — no history exists.
//  - Bridge connectivity is intentionally NOT shown: per-instance private
//    state (the Owner's sidebar owns it). Said out loud in the footnote.
//  - MM's mock incidents do not port — §2.17 column empty state instead.
//  - MM:235–257's subscribe card (email + RSS) promises pipelines that
//    don't exist → an honest changelog pointer card.
//  - MM:106 "auto-refreshes every 30s" is made TRUE via <AutoRefresh/>.
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, FeaturedCard, LivePulse, MonoSectionLabel } from "@/src/components/kit";
import { AutoRefresh } from "@/src/components/public/AutoRefresh";
import { PublicTopNav, TopNavLink } from "@/src/components/public/PublicTopNav";
import {
  composeStatus,
  probeDatabase,
  probeFeed,
  type SignalState,
} from "@/src/domain/status/probes";
import { dayStamp } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Atlas — status",
  description: "Live service signals, probed the moment you load the page.",
};

const DOT: Record<SignalState, string> = {
  operational: "bg-emerald-500",
  unreachable: "bg-rose-500",
};
const DOT_TEXT: Record<SignalState, string> = {
  operational: "text-emerald-700",
  unreachable: "text-rose-700",
};

export default async function StatusPage() {
  const now = new Date();
  const [dbProbe, feedProbe] = await Promise.all([probeDatabase(), probeFeed()]);
  const status = composeStatus(dbProbe, feedProbe, now);
  const clock = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative flex-1 text-stone-900 font-sans">
      <AutoRefresh seconds={30} />
      <PublicTopNav
        surface="status"
        links={
          <>
            <TopNavLink href="/docs">Docs</TopNavLink>
            <TopNavLink href="/">Atlas →</TopNavLink>
          </>
        }
      />

      <main className="min-h-screen pt-28 pb-24 px-8">
        <div className="max-w-3xl mx-auto">
          {/* Day-stamp (MM:80–82) — real clock, no timezone theater */}
          <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
            {dayStamp(now)} · {clock}
          </div>

          {/* Big status sentence (MM:85–92) — §2.2 sentence-title accent */}
          <h1 className="mt-4 text-6xl font-bold tracking-tighter leading-[0.95]">
            Atlas is{" "}
            <span className="relative">
              {status.word}
              <span
                className={`absolute -bottom-1 left-0 right-0 h-[3px] ${
                  status.allGreen ? "bg-amber-500" : "bg-rose-500"
                }`}
              />
            </span>
            .
          </h1>
          <p className="mt-7 text-2xl tracking-tight text-stone-700 leading-tight">
            {status.sentence}
          </p>

          {/* Live ping (MM:99–107) — the refresh claim is real (AutoRefresh) */}
          <div className="mt-7 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
            <LivePulse color={status.allGreen ? "emerald" : "rose"} />
            <span>checked the moment this page rendered</span>
            <span className="text-stone-300">·</span>
            <span>auto-refreshes every 30s</span>
          </div>

          {/* SIGNALS (MM:110–188 minus the mock uptime bars/percentages) */}
          <section className="mt-20">
            <MonoSectionLabel rule count="probed at render">
              Signals
            </MonoSectionLabel>
            <ul className="divide-y divide-stone-200">
              {status.signals.map((s) => (
                <li key={s.name} className="py-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex items-baseline gap-3">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${DOT[s.state]} mt-1.5 shrink-0`}
                      />
                      <div>
                        <div className="text-base font-medium text-stone-900">{s.name}</div>
                        <div className="mt-0.5 flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-widest">
                          <span className={DOT_TEXT[s.state]}>{s.state}</span>
                          <span className="text-stone-300">·</span>
                          <span className="text-stone-400 normal-case tracking-normal italic font-sans text-xs">
                            {s.note}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-base text-stone-900 whitespace-nowrap">
                      {s.value}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {/* charter item 5 — the missing row, named (canon §3.8 voice) */}
            <p className="mt-5 text-sm italic text-stone-500 leading-relaxed">
              No Bridge row here, on purpose — Bridge health is per-instance,
              private state. The Owner sees it live in the cockpit&rsquo;s
              sidebar, not on a public page.
            </p>
          </section>

          {/* RECENT (MM:191–232) — no incident history exists yet; §2.17 */}
          <section className="mt-20">
            <MonoSectionLabel rule count="0 incidents">
              Recent
            </MonoSectionLabel>
            <div className="py-10">
              <EmptyState
                shape="column"
                note="Nothing here."
                goodNews="No incidents recorded — this page's history starts with v2."
              />
            </div>
          </section>

          {/* The longer story (replaces MM:235–257's subscribe card) */}
          <section className="mt-20">
            <FeaturedCard padding="6">
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Want the longer story?
              </div>
              <p className="mt-3 text-base text-stone-700 leading-relaxed">
                Atlas doesn&rsquo;t have incident history yet — what it has is
                a build log: every module that shipped, in order, in plain
                language.
              </p>
              <Link
                href="/changelog"
                className="mt-5 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
              >
                read the changelog →
              </Link>
            </FeaturedCard>
          </section>

          {/* Footer line (MM:260–264, adapted) */}
          <p className="mt-16 text-sm italic text-stone-500 leading-relaxed">
            Atlas is small — one operator, one instance. This page reads its
            own database the moment you load it; there&rsquo;s no synthetic
            uptime theater, because the alternative is you wondering
            &ldquo;is it me?&rdquo;
          </p>
        </div>
      </main>
    </div>
  );
}
