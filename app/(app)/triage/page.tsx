/**
 * M8 — Triage. One ticket at a time, keyboard-first (PRD #12).
 *
 * Ported from design/variants/variant-i-triage.tsx:79–197 (breadcrumb +
 * counter row, centered max-w-2xl reading column: metadata strip → text-5xl
 * title → text-lg prose → AI section with confidence meter → action grid →
 * prev/skip row). Action deck + keys live in ./triage-deck.tsx.
 *
 * Honest data: the AI section renders the REAL Helper-Run enrichment
 * payload, or its quiet pending state when none exists yet (the Helper
 * Run itself is M9 — PRD #17's surface contract holds either way).
 */
import Link from "next/link";

import { EmptyState, PageHeader } from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireOwner } from "@/src/domain/auth/guard";
import { latestCursor } from "@/src/domain/live/broker";
import { confidenceSegments, parseEnrichment } from "@/src/domain/ticket/enrichment";
import { triageQueue } from "@/src/domain/ticket/queries";
import { timeAgo } from "@/src/lib/format";

import { TriageDeck } from "./triage-deck";

export const dynamic = "force-dynamic";

/** I:146–151 — the 5-segment confidence meter. */
function ConfidenceMeter({ confidence }: { confidence: "low" | "medium" | "high" }) {
  const filled = confidenceSegments(confidence);
  return (
    <div className="mt-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
      <span>Confidence</span>
      <span className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`inline-block h-3 w-1.5 ${i < filled ? "bg-amber-500" : "bg-stone-200"}`}
          />
        ))}
      </span>
      <span className="text-stone-700">{confidence}</span>
    </div>
  );
}

export default async function TriagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOwner();
  const params = await searchParams;

  const [queue, cursor] = await Promise.all([triageQueue(), latestCursor()]);

  if (queue.length === 0) {
    return (
      <main className="flex-1 px-16 pt-8 pb-24">
        <LiveRefresh since={cursor} />
        <PageHeader kind="routed" breadcrumb="Tickets · Triage" />
        {/* §2.17 page-level shape — absence is good news here */}
        <div className="mt-16 mx-auto max-w-2xl w-full">
          <EmptyState
            shape="page"
            title="All clear."
            sentence="Nothing is waiting for triage."
            secondary={<span className="italic">That&rsquo;s a good thing.</span>}
            action={
              <Link
                href="/board"
                className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 transition"
              >
                Back to the board →
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  const requested = Number(typeof params.i === "string" ? params.i : 0);
  const index = Number.isFinite(requested) ? Math.min(Math.max(requested, 0), queue.length - 1) : 0;
  const ticket = queue[index];
  const enrichment = parseEnrichment(ticket.enrichment);
  const paragraphs = ticket.body ? ticket.body.split("\n\n") : [];

  return (
    <main className="flex-1 px-16 pt-8 pb-24 flex flex-col">
      <LiveRefresh since={cursor} />
      {/* Top: breadcrumb + counter (I:81–91) */}
      <PageHeader
        kind="routed"
        breadcrumb="Tickets · Triage"
        nav={
          <div className="font-mono text-xs uppercase tracking-widest text-stone-700">
            <span className="text-stone-900 font-medium">{index + 1}</span>
            <span className="text-stone-400"> of </span>
            <span>{queue.length}</span>
          </div>
        }
      />

      {/* Centered editorial reading column (I:93–115) */}
      <div className="mt-16 mx-auto max-w-2xl w-full">
        <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
          <span className="text-stone-700">{ticket.kind ?? "unclassified"}</span>
          <span className="mx-2 text-stone-300">·</span>
          filed by <span className="text-stone-700">{ticket.reporter}</span>
          <span className="mx-2 text-stone-300">·</span>
          {timeAgo(ticket.createdAt)}
        </div>

        <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
          {ticket.title}
        </h1>

        {paragraphs.length > 0 ? (
          <div className="mt-12 space-y-5 text-lg text-stone-700 leading-relaxed">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : (
          <div className="mt-12">
            <EmptyState shape="strip">No story attached — just the title.</EmptyState>
          </div>
        )}

        {/* AI section (I:117–154) — real enrichment or honest pending */}
        <section className="mt-16 pt-10 border-t border-stone-200">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
            AI
          </div>
          {enrichment ? (
            <>
              <p className="mt-5 text-base text-stone-700 leading-relaxed">
                The Engine reads this as{" "}
                {enrichment.kind === "enhancement" ? "an" : "a"}{" "}
                <span className="font-semibold text-stone-900">{enrichment.kind}</span> at{" "}
                <span className="font-semibold text-stone-900">{enrichment.severity}</span>{" "}
                severity.
                {enrichment.similarTo && (
                  <>
                    {" "}
                    Similar to{" "}
                    <Link
                      href={`/tickets/${enrichment.similarTo}`}
                      className="text-amber-600 hover:underline cursor-pointer"
                    >
                      {enrichment.similarTo}
                    </Link>
                    .
                  </>
                )}
                {enrichment.likelyFiles.length > 0 && (
                  <>
                    {" "}
                    It&rsquo;ll likely touch{" "}
                    {enrichment.likelyFiles.map((f, i, arr) => (
                      <span key={f}>
                        <span className="font-mono text-sm text-stone-600">
                          {f.split("/").pop()}
                        </span>
                        {i < arr.length - 2 ? ", " : i === arr.length - 2 ? " and " : ""}
                      </span>
                    ))}
                    .
                  </>
                )}
              </p>
              <ConfidenceMeter confidence={enrichment.confidence} />
            </>
          ) : (
            <div className="mt-5">
              <EmptyState shape="strip">
                Enrichment pending — a Helper Run reads new Tickets once the Engine arrives
                (M9).
              </EmptyState>
            </div>
          )}
        </section>

        {/* Actions + prev/skip (client deck — I:156–196) */}
        <TriageDeck
          ticketId={ticket.id}
          at={index}
          prevHref={index > 0 ? `/triage?i=${index - 1}` : null}
          skipHref={index < queue.length - 1 ? `/triage?i=${index + 1}` : null}
        />
      </div>
    </main>
  );
}
