/**
 * M17 — /activity — Activity Monitor (Owner-only, live).
 *
 * Sanctioned composition: no variant draws this surface directly.
 * Composed from the kit per the /projects index precedent (M7's §M7
 * note: "no variant draws the index grid — compose from kit + cite
 * canon"). Citation: canon §2.2 routed header, §2.3 DividedList,
 * §2.5 MonoSectionLabel, §2.6 RunStateDot, §2.7 LivePulse, §2.9
 * PillButton (ghost cancel), §2.19 bars (resource meters), §3.1 rail
 * 360px, §3.3 live-state law, §4-M9 (running calm, needs-input pulses).
 *
 * Convergence: 3 rounds (0/0/0) — 1920/1440/1280.
 */
import Link from "next/link";

import {
  EmptyState,
  LivePulse,
  MonoSectionLabel,
  PageHeader,
  RunStateDot,
  runStateLabelClass,
  runStateLabelText,
} from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireOwner } from "@/src/domain/auth/guard";
import { latestCursor } from "@/src/domain/live/broker";
import {
  computeAggregate,
  monitorCap,
  monitorRuns,
  RUNAWAY_CPU_PCT,
  STUCK_MINUTES,
  runHealth,
  type MonitorRunRow,
} from "@/src/domain/monitor/queries";

import { cancelRunAction } from "./actions";

export const dynamic = "force-dynamic";

// ── Resource bar rendering (§2.19 bars — amber-400/60, current amber-500) ─

function cpuBar(pct: number) {
  const isHigh = pct >= RUNAWAY_CPU_PCT;
  // §2.19: bars bg-amber-400/60 / current bg-amber-500 rounded-t-sm
  // for resource meters: use rose-400/80 for runaway (§1.1 rose = fail)
  const fill = isHigh ? "bg-rose-400/80" : "bg-amber-400/60";
  const w = Math.max(1, Math.min(100, pct));
  return (
    <div className="flex flex-col gap-0.5">
      <div className="h-3 w-20 bg-stone-100 rounded-sm overflow-hidden">
        <div
          className={`h-full rounded-sm transition-all ${fill}`}
          style={{ width: `${w}%` }}
        />
      </div>
      <span className={`font-mono text-[9px] uppercase tracking-widest ${isHigh ? "text-rose-600 font-bold" : "text-stone-400"}`}>
        {pct.toFixed(1)}% cpu
      </span>
    </div>
  );
}

function memBar(bytes: number) {
  const mb = bytes / 1_048_576;
  // scale: 0–1024 MB = full bar
  const pct = Math.min(100, (mb / 1_024) * 100);
  return (
    <div className="flex flex-col gap-0.5">
      <div className="h-3 w-20 bg-stone-100 rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm bg-amber-400/60 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
        {mb >= 1_024
          ? `${(mb / 1_024).toFixed(1)} GB mem`
          : `${mb.toFixed(0)} MB mem`}
      </span>
    </div>
  );
}

function diskBar(bytes: number) {
  const mb = bytes / 1_048_576;
  const pct = Math.min(100, (mb / 512) * 100);
  return (
    <div className="flex flex-col gap-0.5">
      <div className="h-3 w-20 bg-stone-100 rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm bg-amber-400/60 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
        {mb >= 1_024
          ? `${(mb / 1_024).toFixed(1)} GB disk`
          : `${mb.toFixed(0)} MB disk`}
      </span>
    </div>
  );
}

// ── Elapsed time ────────────────────────────────────────────────────────────

function elapsed(since: Date, now: Date = new Date()): string {
  const ms = Math.max(0, now.getTime() - since.getTime());
  const s = Math.floor(ms / 1_000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// ── Monitor row ─────────────────────────────────────────────────────────────

function MonitorRow({ row, now }: { row: MonitorRunRow; now: Date }) {
  const labelClass = runStateLabelClass(row.state);
  const health = runHealth(row, now);
  // §3.3 motion law: running stays calm; needs-input owns motion.
  const isRunaway = health === "runaway";
  const isStuck = health === "stuck";

  return (
    <li
      className={`py-5 grid grid-cols-[1fr_auto] gap-4 items-start ${
        isRunaway || isStuck
          ? "border-l-2 border-rose-300 pl-3 -ml-3"
          : ""
      }`}
    >
      {/* left: run identity + stdout */}
      <div className="space-y-1.5">
        {/* project · ticket · state */}
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
            {row.projectName}
          </span>
          {row.ticketRef && (
            <>
              <span className="text-stone-300 font-mono text-[10px]">·</span>
              <Link
                href={`/tickets/${row.ticketRef}`}
                className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-600 transition"
              >
                {row.ticketRef}
              </Link>
            </>
          )}
          <span className="text-stone-300 font-mono text-[10px]">·</span>
          {/* §3.3: RunStateDot handles pulse vs static per context */}
          <span className="flex items-center gap-1.5">
            <RunStateDot state={row.state} context="live" />
            <span className={`font-mono text-[10px] uppercase tracking-widest ${labelClass}`}>
              {runStateLabelText(row.state)}
            </span>
          </span>
        </div>

        {/* run title */}
        <Link
          href={`/runs/${row.ref}`}
          className="block text-base text-stone-900 hover:text-amber-700 transition leading-snug"
        >
          {row.title}
        </Link>

        {/* last stdout line */}
        {row.lastStdout && (
          <p className="font-mono text-[10px] text-stone-400 truncate max-w-prose">
            {row.lastStdout}
          </p>
        )}

        {/* health signal */}
        {isRunaway && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-rose-600">
            ▲ runaway — high cpu
          </p>
        )}
        {isStuck && !isRunaway && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-rose-600">
            ▲ no stdout for {STUCK_MINUTES}+ min
          </p>
        )}
      </div>

      {/* right: elapsed + resources + cancel */}
      <div className="flex flex-col gap-2.5 items-end shrink-0">
        {/* elapsed */}
        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
          {elapsed(row.startedAt, now)}
        </span>

        {/* resource bars (§2.19) */}
        {row.resources ? (
          <div className="flex gap-3">
            {cpuBar(row.resources.cpuPct)}
            {memBar(row.resources.memBytes)}
            {diskBar(row.resources.diskBytes)}
          </div>
        ) : (
          <span className="font-mono text-[9px] uppercase tracking-widest text-stone-300">
            sampling…
          </span>
        )}

        {/* cancel — ghost link, danger hover (§2.9 ghost link) */}
        {(row.state === "running" || row.state === "queued" || row.state === "needs-input") && (
          <form action={cancelRunAction}>
            <input type="hidden" name="runId" value={row.id} />
            <button
              type="submit"
              className="font-mono text-[10px] uppercase tracking-widest text-stone-400 hover:text-rose-600 transition cursor-pointer"
            >
              cancel →
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

// ── Aggregate total bar ──────────────────────────────────────────────────────

function AggBar({ label, pct, warn }: { label: string; pct: number; warn?: boolean }) {
  const fill = warn && pct > 80 ? "bg-rose-400/80" : "bg-amber-500";
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-32 bg-stone-100 rounded-sm overflow-hidden">
        <div
          className={`h-full rounded-sm ${fill} transition-all`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
        {label}
      </span>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function ActivityPage() {
  await requireOwner();

  const now = new Date();
  const [rows, cap, cursor] = await Promise.all([
    monitorRuns(),
    monitorCap(),
    latestCursor(),
  ]);

  const agg = computeAggregate(rows, cap);
  const total = rows.length;
  const memTotalMb = agg.totalMemBytes / 1_048_576;
  const cpuTotalPct = agg.totalCpuPct;

  // cap utilisation pct for the AggBar
  const capUsedPct = cap > 0 ? Math.round((agg.running / cap) * 100) : 0;

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      {/* M17 live seam — any feed event re-renders the server tree (ADR-0001). */}
      <LiveRefresh since={cursor} />

      {/* §2.2 routed page header — mono breadcrumb (F:147) */}
      <PageHeader kind="routed" breadcrumb="Activity" />

      <h1 className="mt-8 text-5xl font-bold tracking-tighter">Activity.</h1>

      {/* hero sentence — the aggregate story */}
      <p className="mt-3 text-3xl leading-tight tracking-tight text-stone-700">
        {total === 0 ? (
          "No active Engine sessions."
        ) : (
          <>
            <span className="font-mono font-bold text-stone-900">{agg.running}</span>{" "}
            of{" "}
            <span className="font-mono font-bold text-stone-900">{cap}</span>{" "}
            {cap === 1 ? "slot" : "slots"} running
            {agg.queued > 0 && (
              <>
                ,{" "}
                <span className="font-mono font-bold text-stone-900">{agg.queued}</span>{" "}
                queued
              </>
            )}
            {agg.needsInput > 0 && (
              <>
                ,{" "}
                <span className="font-mono font-bold text-amber-600">{agg.needsInput}</span>{" "}
                waiting for you
              </>
            )}
            .
          </>
        )}
      </p>

      <div className="mt-12 grid grid-cols-[1fr_360px] gap-16">
        {/* ── main column: the dense run grid ── */}
        <div>
          {total === 0 ? (
            /* §2.17 column empty state — absence is good news here */
            <EmptyState shape="column" note="No active sessions." goodNews="That's a good thing." />
          ) : (
            <>
              <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                {/* §2.5 MonoSectionLabel */}
                <MonoSectionLabel>
                  <span className="flex items-center gap-2">
                    {/* §2.7 running-in-live-context uses stone pulse */}
                    {agg.running > 0 && <LivePulse color="stone" />}
                    Active sessions
                  </span>
                </MonoSectionLabel>
                <span className="font-mono text-[10px] text-stone-400 uppercase tracking-widest">
                  {total} {total === 1 ? "session" : "sessions"}
                </span>
              </div>

              <ul className="divide-y divide-stone-200">
                {rows.map((row) => (
                  <MonitorRow key={row.id} row={row} now={now} />
                ))}
              </ul>
            </>
          )}
        </div>

        {/* ── rail (360px §3.1): aggregate + cap ── */}
        <aside className="space-y-14">
          {/* cap section */}
          <div className="space-y-4">
            {/* §2.5 rail MonoSectionLabel (standalone) */}
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500">
              Concurrency cap
            </p>
            {/* rail hero number + amber 2×8px underline (§3.1) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-stone-900">
                  {agg.running}
                  <span className="text-stone-400 text-xl"> / {cap}</span>
                </span>
              </div>
              <div className="h-[2px] w-8 bg-amber-500" />
            </div>
            {/* cap utilisation bar */}
            <AggBar
              label={`${capUsedPct}% of cap`}
              pct={capUsedPct}
              warn={true}
            />
            {/* link to cap dial — M10's settings page */}
            <Link
              href="/settings/bridges"
              className="inline-block font-mono text-[10px] uppercase tracking-widest text-stone-400 hover:text-amber-600 transition"
            >
              Adjust cap →
            </Link>
            {agg.queued > 0 && (
              <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                {agg.queued} {agg.queued === 1 ? "session" : "sessions"} queued · cap is the limit
              </p>
            )}
          </div>

          {/* aggregate resource section (only when sessions are active + have data) */}
          {total > 0 && (cpuTotalPct > 0 || memTotalMb > 0) && (
            <div className="space-y-4">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500">
                Total resource use
              </p>
              <div className="space-y-3">
                <AggBar
                  label={`${cpuTotalPct.toFixed(1)}% cpu total`}
                  pct={Math.min(100, cpuTotalPct)}
                  warn={true}
                />
                <AggBar
                  label={`${memTotalMb >= 1_024 ? `${(memTotalMb / 1_024).toFixed(1)} GB` : `${Math.round(memTotalMb)} MB`} mem total`}
                  pct={Math.min(100, (memTotalMb / 4_096) * 100)}
                />
              </div>
              <p className="text-xs italic text-stone-500">
                Across all running sessions · refreshed each heartbeat.
              </p>
            </div>
          )}

          {/* health legend */}
          {total > 0 && (
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500">
                Health signals
              </p>
              <div className="space-y-2 text-sm text-stone-600">
                <p>
                  <span className="font-mono text-[10px] text-rose-600 uppercase tracking-widest">▲ runaway</span>
                  {" "}— CPU above {RUNAWAY_CPU_PCT}%
                </p>
                <p>
                  <span className="font-mono text-[10px] text-rose-600 uppercase tracking-widest">▲ stuck</span>
                  {" "}— no stdout for {STUCK_MINUTES}+ min
                </p>
              </div>
            </div>
          )}

          {/* footer footnote (§3.1 rail closes with italic stone-500 above border-t) */}
          <div className="border-t border-stone-200 pt-6">
            <p className="text-xs italic text-stone-500">
              Resource data from the Bridge heartbeat · sampling ~every 30 s.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
