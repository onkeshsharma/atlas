/**
 * M11 — /settings/audit, the paper trail, ported from
 * design/variants/variant-tt-audit.tsx:224–465 (breadcrumb + meta row ·
 * accent hero · filter chips · framed search · grouped timeline with
 * the left-[78px] rule and [70px_24px_1fr_auto] rows · load-older row ·
 * retention footer · rail: date range / by actor / legend / immutable
 * footer). Canon: §2.2 sentence-title accent, §3.1 + ledger E9
 * (TT:237's 300 rail → 320), §4-M11 (TT:160–178 dot+text kind mapping
 * — src/domain/audit/events.ts), §3.8 editorial chrome.
 *
 * THE RECORD (honesty bar — what this page reads, and names):
 * feed_events (every kind, the outbox) + Neon Auth sessions (sign-ins;
 * rows age out with their sessions) + api_tokens timestamps (derived;
 * created_at doubles as rotated-at). No fake rows: TT's mock 2FA/brief-
 * approval/job-duration entries have no real counterpart and are not
 * drawn; the footer names what isn't recorded.
 *
 * Deviations (recorded in HANDOFF-M11):
 *  - TT:230 "retained 7 years" + TT:364's retention-policy footer →
 *    "record since <first event>" (no retention policy exists; claiming
 *    one would lie). TT:231 "export csv ↗" dropped (no export route).
 *  - TT:343 per-row "permalink ↗" dropped — no per-event route exists,
 *    and `↗` breaks §3.6 (nothing leaves Atlas).
 *  - TT:386 "pick a custom range ↗" dropped (same `↗` law; the four
 *    real ranges cover the record).
 *  - TT:238 main column max-w-[760px] kept (the timeline's four-column
 *    grid needs it; §3.1's max-w-2xl reads as the default, not a cap —
 *    flagged in the handoff for the ledger if it grates).
 *  - TT:449 "support@atlas.com" footer → honest immutability copy.
 *  - TT's mock "Job #142" vocabulary → Run (CONTEXT.md), throughout.
 */
import Link from "next/link";

import { MonoSectionLabel, PageHeader, PageTitle } from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import {
  AUDIT_FAMILIES,
  AUDIT_FILTERS,
  AUDIT_RANGES,
  AUDIT_RANGE_LABEL,
  FAMILY_STYLE,
  groupByDay,
  inRange,
  matchesFilter,
  matchesQuery,
  parseAuditFilter,
  parseAuditRange,
  type AuditEvent,
  type AuditFilter,
  type AuditRange,
} from "@/src/domain/audit/events";
import { allAuditEvents, recordBeginsAt } from "@/src/domain/audit/queries";
import { requireOwner } from "@/src/domain/auth/guard";
import { latestCursor } from "@/src/domain/live/broker";

import { AuditFilterChips } from "./audit-chips";

export const dynamic = "force-dynamic";

const PAGE_STEP = 20;
const DEFAULT_LIMIT = 25;

function auditHref(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/settings/audit?${s}` : "/settings/audit";
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireOwner();
  const params = await searchParams;
  const filter = parseAuditFilter(params.kind);
  const range = parseAuditRange(params.range);
  const q = (params.q ?? "").trim();
  const actor = (params.actor ?? "").trim();
  const limit = Math.max(1, Number(params.limit) || DEFAULT_LIMIT);
  const now = new Date();

  const [all, beginsAt, cursor] = await Promise.all([
    allAuditEvents(),
    recordBeginsAt(),
    latestCursor(),
  ]);

  const matchesActor = (e: AuditEvent, a: string) =>
    !a || e.actor.toLowerCase() === a.toLowerCase();

  // faceted, all real: each facet's counts respect the OTHER active facets
  const base = (e: AuditEvent) => matchesQuery(e, q);
  const chipCounts = Object.fromEntries(
    AUDIT_FILTERS.map((f) => [
      f,
      all.filter((e) => base(e) && matchesActor(e, actor) && inRange(e, range, now) && matchesFilter(e, f)).length,
    ]),
  ) as Record<AuditFilter, number>;
  const rangeCounts = Object.fromEntries(
    AUDIT_RANGES.map((r) => [
      r,
      all.filter((e) => base(e) && matchesActor(e, actor) && matchesFilter(e, filter) && inRange(e, r, now)).length,
    ]),
  ) as Record<AuditRange, number>;
  const actorTallies = new Map<string, number>();
  for (const e of all) {
    if (base(e) && matchesFilter(e, filter) && inRange(e, range, now)) {
      actorTallies.set(e.actor, (actorTallies.get(e.actor) ?? 0) + 1);
    }
  }
  const actorRows = [...actorTallies.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const filtered = all.filter(
    (e) => base(e) && matchesActor(e, actor) && matchesFilter(e, filter) && inRange(e, range, now),
  );
  const visible = filtered.slice(0, limit);
  const groups = groupByDay(visible, now);

  const carry: Record<string, string> = {};
  if (q) carry.q = q;
  if (range !== "30d") carry.range = range;
  if (actor) carry.actor = actor;
  const kindParam = filter !== "everything" ? filter : undefined;

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      <PageHeader
        kind="routed"
        breadcrumb="Settings · Security · Audit log"
        nav={
          /* TT:229–234 — honest meta in the variant's mono register */
          <span className="text-stone-400">
            {beginsAt
              ? `record since ${beginsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
              : "no events recorded yet"}
          </span>
        }
      >
        <div className="grid grid-cols-[1fr_320px] gap-16">
          {/* canon E9 — TT:237's 300 rail folds to 320 */}
          <div className="max-w-[760px]">
            {/* Hero (TT:240–256) */}
            <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
              Every event, every actor, every Project
            </div>
            <div className="mt-3">
              <PageTitle accent="paper trail" after="." wraps>
                The{" "}
              </PageTitle>
            </div>
            <p className="mt-5 text-xl text-stone-700 leading-relaxed">
              Atlas keeps a structured record of everything that touches your Projects —
              sign-ins, Tickets, Briefs, Runs, ships, invitations, settings changes.
              Reverse-chronological. Read freely, search lazily.
            </p>

            {/* Filter chips (TT:259–279; kit ScopeChip per §2.13) */}
            <AuditFilterChips selected={filter} counts={chipCounts} carry={carry} />

            {/* Search (TT:282–292 — borderless input in a framed row) */}
            <form method="get" action="/settings/audit">
              {kindParam && <input type="hidden" name="kind" value={kindParam} />}
              {range !== "30d" && <input type="hidden" name="range" value={range} />}
              {actor && <input type="hidden" name="actor" value={actor} />}
              <div className="mt-5 flex items-center gap-3 border-b border-stone-300 pb-2">
                <span className="font-mono text-stone-400 text-sm">⌕</span>
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="search this log — actor, kind, free-text… (e.g. 'you invited')"
                  className="flex-1 bg-transparent text-base text-stone-900 placeholder:text-stone-400 focus:outline-none"
                />
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  {filtered.length} event{filtered.length === 1 ? "" : "s"}
                </span>
              </div>
            </form>

            {/* TIMELINE (TT:294–351) */}
            <section className="mt-12">
              {visible.length === 0 ? (
                /* §2.17 column shape — nothing matches */
                <div className="py-10 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    {q ? `Nothing matches "${q}".` : "Nothing here."}
                  </div>
                  <p className="mt-2 text-sm italic text-stone-500">
                    {q || actor || filter !== "everything"
                      ? "Loosen a filter — the record is still there."
                      : "Events appear the moment something happens."}
                  </p>
                </div>
              ) : (
                <ol className="relative">
                  {/* The thin vertical rule (TT:298) */}
                  <div className="absolute top-0 bottom-0 left-[78px] w-px bg-stone-200" />

                  {groups.map((group) => (
                    <li key={group.label}>
                      <div className="pt-8 pb-3 pl-[110px] font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">
                        {group.label}
                      </div>
                      <ol>
                        {group.events.map((e) => {
                          const style = FAMILY_STYLE[e.family];
                          return (
                            <li
                              key={e.id}
                              className="grid grid-cols-[70px_24px_1fr] items-baseline gap-3 py-3.5"
                            >
                              <span className="font-mono text-xs text-stone-400 text-right">
                                {e.at.toLocaleTimeString("en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span className="flex justify-center pt-1.5">
                                <span
                                  className={`inline-block h-2 w-2 rounded-full ${style.dot} ring-4 ring-amber-50/30`}
                                />
                              </span>
                              <div className="pl-3">
                                <div className="flex items-baseline gap-3 flex-wrap">
                                  <span
                                    className={`font-mono text-[9px] uppercase tracking-widest ${style.text}`}
                                  >
                                    {e.kindLabel}
                                  </span>
                                  <span className="font-mono text-[10px] text-stone-400">
                                    {e.actor}
                                  </span>
                                </div>
                                <div className="mt-1 text-base text-stone-900 leading-snug">
                                  {e.title}
                                </div>
                                {e.detail && (
                                  <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                                    {e.detail}
                                  </p>
                                )}
                                {e.meta && (
                                  <div className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                                    {e.meta}
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Load older (TT:353–361 — real pagination) */}
            <div className="mt-10 flex items-center gap-3 font-mono text-xs uppercase tracking-widest">
              {filtered.length > visible.length && (
                <>
                  <Link
                    href={auditHref({
                      ...carry,
                      kind: kindParam,
                      range: range !== "30d" ? range : undefined,
                      limit: String(limit + PAGE_STEP),
                    })}
                    className="text-stone-700 hover:text-amber-600 cursor-pointer"
                  >
                    load {Math.min(PAGE_STEP, filtered.length - visible.length)} older
                    events →
                  </Link>
                  <span className="text-stone-300">·</span>
                </>
              )}
              <span className="text-stone-400">
                showing {visible.length} of {filtered.length}{" "}
                {AUDIT_RANGE_LABEL[range].toLowerCase().replace("last ", "in the last ")}
              </span>
            </div>

            {/* Honesty footer (replaces TT:363–370 — deviations in header) */}
            <p className="mt-16 text-sm italic text-stone-500 leading-relaxed">
              This page reads the live record: the activity feed, the session table, and
              the token register. Sign-ins age out with their sessions; invite, roster
              and profile events are recorded from the day this log shipped; Bridge
              heartbeats are deliberately never recorded.
            </p>
          </div>

          {/* RAIL (TT:373–456) */}
          <aside className="space-y-12">
            {/* Date range (TT:375–388) */}
            <section>
              <MonoSectionLabel>Date range</MonoSectionLabel>
              <div className="mt-5 space-y-1 text-sm">
                {AUDIT_RANGES.map((r) => (
                  <Link
                    key={r}
                    href={auditHref({
                      q: q || undefined,
                      actor: actor || undefined,
                      kind: kindParam,
                      range: r !== "30d" ? r : undefined,
                    })}
                    className="flex items-baseline justify-between gap-3 cursor-pointer py-1"
                  >
                    <span
                      className={
                        r === range
                          ? "text-stone-900 font-medium border-b border-amber-500 pb-0.5"
                          : "text-stone-600 hover:text-stone-900"
                      }
                    >
                      {AUDIT_RANGE_LABEL[r]}
                    </span>
                    <span className="font-mono text-[10px] text-stone-400">
                      {rangeCounts[r]}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* By actor (TT:391–410) */}
            <section>
              <MonoSectionLabel>By actor</MonoSectionLabel>
              {actorRows.length === 0 ? (
                <p className="mt-5 text-sm italic text-stone-500">Nobody yet.</p>
              ) : (
                <ul className="mt-5 space-y-3 text-sm">
                  {actorRows.map(([name, n]) => (
                    <li key={name} className="flex items-baseline justify-between gap-3">
                      <Link
                        href={auditHref({
                          q: q || undefined,
                          kind: kindParam,
                          range: range !== "30d" ? range : undefined,
                          actor: actor.toLowerCase() === name.toLowerCase() ? undefined : name,
                        })}
                        className={
                          actor.toLowerCase() === name.toLowerCase()
                            ? "text-stone-900 font-medium border-b border-amber-500 pb-0.5 cursor-pointer"
                            : "text-stone-700 hover:text-stone-900 cursor-pointer"
                        }
                      >
                        {name}
                      </Link>
                      <span className="font-mono text-[10px] text-stone-400">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Legend (TT:412–443 — the real family census) */}
            <section>
              <MonoSectionLabel>Legend</MonoSectionLabel>
              <ul className="mt-5 grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                {AUDIT_FAMILIES.map((family) => (
                  <li key={family} className="flex items-center gap-2">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${FAMILY_STYLE[family].dot}`}
                    />
                    <span className="text-stone-600">{family}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Immutability footer (TT:445–455 — honest form, header note) */}
            <section className="pt-4 border-t border-stone-200/80">
              <p className="text-sm italic text-stone-500 leading-relaxed">
                Audit events are written once and never edited — Atlas composes this page
                from the records themselves, so what you read is what happened. Trust
                changes live on the{" "}
                <Link
                  href="/settings/people"
                  className="not-italic font-mono text-xs text-stone-700 hover:text-amber-600 cursor-pointer"
                >
                  trust circle →
                </Link>
              </p>
            </section>
          </aside>
        </div>
      </PageHeader>
    </main>
  );
}
