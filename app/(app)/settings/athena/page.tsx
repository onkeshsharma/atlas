/**
 * Athena activity (ADR-0007 §6) — the delegate-answered audit: every decision
 * Athena made on the Owner's behalf, with rationale + confidence. Reachable
 * from the AFK chip and the Preferences AFK section.
 */
import Link from "next/link";

import { MonoSectionLabel, PillButton } from "@/src/components/kit";
import { SettingsShell } from "@/src/components/settings/SettingsShell";
import { athenaDecisions } from "@/src/domain/athena/activity";
import { listMemories } from "@/src/domain/athena/memory";
import { requireOwner } from "@/src/domain/auth/guard";
import { bridgeViews } from "@/src/domain/bridge/queries";
import { afkLevel } from "@/src/domain/settings/instance";
import { shortAgo } from "@/src/lib/format";

import { pruneMemoryAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AthenaActivityPage() {
  await requireOwner();
  const [decisions, memories, bridges, level] = await Promise.all([
    athenaDecisions(50),
    listMemories(50),
    bridgeViews(),
    afkLevel(),
  ]);

  return (
    <SettingsShell
      breadcrumb="Settings · Athena"
      active="preferences"
      bridgeBadge={bridges.length}
      rail={
        <section>
          <MonoSectionLabel>About</MonoSectionLabel>
          <p className="mt-4 text-sm text-stone-500 leading-relaxed">
            Athena answers a Run&apos;s decisions on your behalf while you&apos;re away. Tune the
            three-level dial — Off / On / Ultra — and the takeover delay in{" "}
            <Link href="/settings" className="text-stone-700 hover:text-amber-600">
              Preferences
            </Link>
            .
          </p>
        </section>
      }
    >
      <h1 className="text-5xl font-bold tracking-tighter">Athena.</h1>
      <p className="mt-4 text-lg text-stone-500 leading-relaxed max-w-xl">
        Decisions Athena made on your behalf. AFK is currently{" "}
        <span className="font-medium text-stone-700">{level}</span>.
      </p>

      <section className="mt-16">
        <MonoSectionLabel>Decisions</MonoSectionLabel>
        {decisions.length === 0 ? (
          <p className="mt-7 text-sm italic text-stone-500">
            Athena hasn&apos;t answered anything yet. With AFK on, decisions show up here.
          </p>
        ) : (
          <ul className="mt-7 divide-y divide-stone-200">
            {decisions.map((d) => {
              const answer = d.choice ?? d.text ?? "—";
              const low = d.confidence !== undefined && d.confidence < 0.7;
              return (
                <li key={d.feedId} className="py-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-base tracking-tight font-medium">
                      {d.runRef ? `${d.runRef} — ` : ""}answered &ldquo;{answer}&rdquo;
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 whitespace-nowrap">
                      {shortAgo(d.at)}
                    </span>
                  </div>
                  {d.rationale && (
                    <p className="mt-1 text-sm text-stone-600 leading-relaxed">{d.rationale}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest">
                    {d.confidence !== undefined && (
                      <span className={low ? "text-rose-600" : "text-stone-400"}>
                        confidence {(d.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    <span className="text-amber-600">Athena</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Decision memory (ADR-0007 §7) — the precedents Athena learns from. */}
      <section className="mt-20 pb-14">
        <MonoSectionLabel>Decision memory</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed max-w-xl">
          Past decisions — yours and Athena&apos;s — that Athena retrieves as precedent on
          similar Asks. Your decisions carry the most weight. Prune any you don&apos;t want
          her to learn from.
        </p>
        {memories.length === 0 ? (
          <p className="mt-7 text-sm italic text-stone-500">
            Nothing learned yet — resolved decisions show up here.
          </p>
        ) : (
          <ul className="mt-7 divide-y divide-stone-200">
            {memories.map((m) => (
              <li key={m.id} className="py-5 flex items-start justify-between gap-4 group">
                <div className="min-w-0">
                  <p className="text-sm text-stone-700 leading-relaxed">
                    <span className="text-stone-500">{m.question}</span> →{" "}
                    <span className="font-medium">&ldquo;{m.answer}&rdquo;</span>
                  </p>
                  <div className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest">
                    <span className={m.source === "owner" ? "text-stone-700" : "text-amber-600"}>
                      {m.source}
                    </span>
                    <span className="text-stone-400">{shortAgo(m.at)}</span>
                  </div>
                </div>
                <form action={pruneMemoryAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <PillButton kind="ghost" ghostDanger type="submit">
                    prune →
                  </PillButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SettingsShell>
  );
}
