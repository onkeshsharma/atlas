/**
 * M10 — /settings/bridges (N over M9's REAL data; PRD #8, #33, #34).
 *
 * Ported from design/variants/variant-n-bridges.tsx:158–399 (hero +
 * inline stats N:161–171, registered rows N:187–258, register form
 * N:263–297, how-install N:301–332, rail N:336–399 with the emerald
 * status underline N:345). Shell/subnav via SettingsShell (H:110–157).
 *
 * Sanctioned deviations (HANDOFF-M10): "Job" → "Run" everywhere
 * (CONTEXT.md); N's mocked stats (uptime %, avg job time, preflight
 * pass lines) are replaced by derivable facts (run tallies, real
 * doctor verdicts) — no invented numbers; the install story is the
 * REAL daemon recipe (env vars + node, not a fictional binary
 * download); "Full Bridge docs ↗"/"Why your Bridge ↗" links drop (the
 * docs tier is M14, in flight). Doctor affordances are honest-disabled
 * while the daemon is offline (charter item 4).
 *
 * Liveness: LiveRefresh carries the outbox rows (pairing, doctor
 * verdicts); HeartbeatPoll is this page's sanctioned heartbeat
 * exception (see its header).
 */
import {
  FeaturedCard,
  LivePulse,
  MonoSectionLabel,
  NumberedSteps,
  PillButton,
} from "@/src/components/kit";
import { HeartbeatPoll } from "@/src/components/live/HeartbeatPoll";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { SettingsShell } from "@/src/components/settings/SettingsShell";
import { requireOwner } from "@/src/domain/auth/guard";
import { doctorVerdict, type BridgeDoctorResult, type DoctorCheck } from "@/src/domain/bridge/doctor";
import { bridgeViews, runQueueFacts, type BridgeView } from "@/src/domain/bridge/queries";
import { latestCursor } from "@/src/domain/live/broker";
import { runCap } from "@/src/domain/settings/instance";
import { timeAgo } from "@/src/lib/format";

import { runDoctorAction, runDoctorAllAction } from "./actions";
import { CapControl } from "./cap-control";
import { PairingForm } from "./pairing-form";
import { RevokeBridge } from "./revoke-bridge";

export const dynamic = "force-dynamic";

/** N:38 "12 seconds ago" — heartbeat rows keep seconds precision. */
function heartbeatAgo(date: Date, now: Date): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds} seconds ago`;
  return timeAgo(date, now);
}

function statusLabel(b: BridgeView): { text: string; klass: string } {
  if (b.health === "healthy") return { text: "online · healthy", klass: "text-emerald-700" };
  if (b.health === "offline") return { text: "offline", klass: "text-rose-700" };
  return { text: "never connected", klass: "text-stone-400" };
}

const CHECK_DOT: Record<DoctorCheck["status"], string> = {
  pass: "bg-emerald-500",
  warn: "bg-amber-500",
  fail: "bg-rose-500",
};

function doctorSummaryLine(doctor: BridgeDoctorResult, now: Date): string {
  const v = doctorVerdict(doctor);
  const when = timeAgo(new Date(doctor.ranAt), now);
  if (v.failed > 0) return `${v.failed} of ${v.total} checks failed · ${when}`;
  if (v.warned > 0) return `${v.passed} passed · ${v.warned} to look at · ${when}`;
  return `all ${v.total} checks passed · ${when}`;
}

function DoctorBlock({ bridge, now }: { bridge: BridgeView; now: Date }) {
  const pending =
    bridge.doctorRequestedAt !== null &&
    now.getTime() - bridge.doctorRequestedAt.getTime() < 60_000;
  return (
    <div className="mt-5 ml-5">
      {pending && (
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-amber-700">
          <LivePulse color="amber" />
          doctor running…
        </div>
      )}
      {!pending && bridge.doctor && (
        <details className="group/doctor">
          <summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-stone-900 transition">
            <span
              className={
                doctorVerdict(bridge.doctor).failed > 0 ? "text-rose-700" : "text-emerald-700"
              }
            >
              ●
            </span>{" "}
            last doctor · {doctorSummaryLine(bridge.doctor, now)} <span className="text-stone-400">↓</span>
          </summary>
          <ul className="mt-3 divide-y divide-stone-200/80 border-t border-stone-200/80">
            {bridge.doctor.checks.map((check) => (
              <li key={check.key} className="py-2.5 grid grid-cols-[1fr_auto] items-baseline gap-6">
                <span className="flex items-baseline gap-2.5 text-sm text-stone-700">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${CHECK_DOT[check.status]}`}
                  />
                  {check.label}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 text-right">
                  {check.detail}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {!pending && !bridge.doctor && (
        <p className="text-sm italic text-stone-500">
          No doctor run yet
          {bridge.health === "healthy" ? " — run one from the hover actions." : "."}
        </p>
      )}
    </div>
  );
}

export default async function BridgesPage() {
  await requireOwner();
  const now = new Date();
  const [bridges, cap, queue, cursor] = await Promise.all([
    bridgeViews(now),
    runCap(),
    runQueueFacts(),
    latestCursor(),
  ]);
  const online = bridges.filter((b) => b.health === "healthy");
  const allOnline = bridges.length > 0 && online.length === bridges.length;
  const totals = bridges.reduce(
    (acc, b) => ({
      runs30d: acc.runs30d + b.runs30d,
      shipped30d: acc.shipped30d + b.shipped30d,
      failed30d: acc.failed30d + b.failed30d,
    }),
    { runs30d: 0, shipped30d: 0, failed30d: 0 },
  );
  const latestDoctorAt = bridges
    .map((b) => (b.doctor ? new Date(b.doctor.ranAt) : null))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const atlasUrl = process.env.ATLAS_APP_URL ?? "https://your-atlas";
  const confirmedCapBridge = online.find((b) => b.capabilities.cap !== null);

  return (
    <SettingsShell
      breadcrumb="Settings · Bridges"
      active="bridges"
      bridgeBadge={bridges.length}
      rail={
        <>
          {/* Status hero — N:338–366; underline only when genuinely all-online */}
          <section>
            <MonoSectionLabel>Status</MonoSectionLabel>
            <div className="mt-3">
              {allOnline ? (
                <span className="relative text-2xl font-bold tracking-tight">
                  {bridges.length === 1 ? "Bridge online" : "All Bridges online"}
                  {/* N:345 — emerald hero underline: healthy is the ship family */}
                  <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-emerald-500" />
                </span>
              ) : bridges.length > 0 ? (
                <span className="relative text-2xl font-bold tracking-tight">
                  {online.length === 0 ? "Bridge offline" : "A Bridge is offline"}
                  <span className="absolute -bottom-1 left-0 h-[2px] w-8 bg-rose-500" />
                </span>
              ) : (
                <span className="text-2xl font-bold tracking-tight text-stone-400">
                  No Bridge paired
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-stone-500 leading-relaxed">
              {queue.queued > 0 ? (
                <>
                  <span className="font-mono">{queue.queued}</span> Run
                  {queue.queued === 1 ? "" : "s"} queued
                </>
              ) : (
                <>No queued Runs</>
              )}
              {queue.lastFailedAt ? (
                <>
                  {" "}
                  · last failure was <span className="font-mono">{timeAgo(queue.lastFailedAt, now)}</span>
                  {queue.lastFailedRef ? <> on {queue.lastFailedRef}</> : null}.
                </>
              ) : (
                <> · no failures on record.</>
              )}
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Runs · 30d</span>
                <span className="font-mono text-stone-900">{totals.runs30d}</span>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Shipped · 30d</span>
                <span className="font-mono text-stone-900">{totals.shipped30d}</span>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-stone-700">Failed · 30d</span>
                <span className="font-mono text-stone-900">{totals.failed30d}</span>
              </li>
            </ul>
          </section>

          {/* Doctor card — N:369–385, honest-disabled offline */}
          <FeaturedCard>
            <MonoSectionLabel>Doctor</MonoSectionLabel>
            <p className="mt-3 text-sm text-stone-700 leading-relaxed">
              Ask your Bridge to run its preflight now — Atlas reach, git, gh auth, every
              project working copy, stale worktrees.
            </p>
            <form action={runDoctorAllAction} className="mt-5">
              <PillButton kind="primary" fullWidth type="submit" disabled={online.length === 0}>
                Run doctor on all
              </PillButton>
            </form>
            <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-stone-400">
              {online.length === 0
                ? "needs the daemon online"
                : latestDoctorAt
                  ? `last run · ${timeAgo(latestDoctorAt, now)}`
                  : "never run"}
            </div>
          </FeaturedCard>

          {/* About — N:388–399 (doc link drops: M14 in flight) */}
          <section className="pt-4 border-t border-stone-200/80">
            <MonoSectionLabel>About Bridges</MonoSectionLabel>
            <p className="mt-3 text-sm text-stone-500 leading-relaxed">
              The Engine never runs in Atlas&rsquo;s cloud — only on your own machine, via
              the Bridge. That&rsquo;s how your code stays yours.
            </p>
          </section>
        </>
      }
    >
      <LiveRefresh since={cursor} />
      <HeartbeatPoll />

      {/* Hero — N:161–175 */}
      <div className="flex items-baseline gap-6 flex-wrap">
        <h1 className="text-5xl font-bold tracking-tighter">Bridges.</h1>
        <p className="text-base text-stone-500">
          <span className="font-mono text-stone-900">{bridges.length}</span> registered ·{" "}
          <span className="font-mono text-emerald-600">{online.length}</span> online
        </p>
      </div>
      <p className="mt-4 text-lg text-stone-500 leading-relaxed max-w-xl">
        Your Bridge is the daemon that runs the Engine locally on your computer. Atlas
        dispatches Runs to it; results come back.
      </p>

      {/* REGISTERED — N:178–261 over real rows */}
      <section className="mt-16">
        <MonoSectionLabel rule count={bridges.length}>
          Registered
        </MonoSectionLabel>
        {bridges.length === 0 ? (
          <p className="mt-7 text-sm italic text-stone-500">
            No machine paired yet — generate a token below and your Bridge appears here on
            its first heartbeat.
          </p>
        ) : (
          <ul className="divide-y divide-stone-200">
            {bridges.map((b) => {
              const status = statusLabel(b);
              return (
                <li key={b.id} className="py-7 group">
                  <div className="flex items-baseline justify-between gap-6">
                    <div className="flex items-baseline gap-3">
                      <span className="relative flex h-1.5 w-1.5 mt-1.5">
                        {b.health === "healthy" ? (
                          <LivePulse color="emerald" />
                        ) : (
                          <span
                            className={`relative inline-block h-1.5 w-1.5 rounded-full ${
                              b.health === "offline" ? "bg-rose-500" : "bg-stone-300"
                            }`}
                          />
                        )}
                      </span>
                      <div>
                        <div className="text-lg font-medium tracking-tight font-mono text-stone-900">
                          {b.name}
                        </div>
                        <div
                          className={`mt-1 font-mono text-[10px] uppercase tracking-widest ${status.klass}`}
                        >
                          {status.text}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition">
                      {b.health === "healthy" ? (
                        <form action={runDoctorAction}>
                          <input type="hidden" name="bridgeId" value={b.id} />
                          <PillButton kind="ghost" type="submit">
                            run doctor →
                          </PillButton>
                        </form>
                      ) : (
                        // charter item 4 — honest-disabled while offline
                        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          doctor needs the daemon online
                        </span>
                      )}
                      {/* M15 — revoke runs through the §2.11 JJ confirm
                          (PRD #41); ghost is the §3.7 opener now. */}
                      <RevokeBridge
                        bridgeId={b.id}
                        name={b.name}
                        activeRuns={b.capabilities.busyRunIds.length}
                      />
                    </div>
                  </div>

                  {/* Detail rows — N:226–257, real facts */}
                  <ul className="mt-5 ml-5 space-y-1.5 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Last heartbeat</span>
                      <span className="font-mono text-stone-900">
                        {b.lastHeartbeatAt ? heartbeatAgo(b.lastHeartbeatAt, now) : "never"}
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Engine</span>
                      <span className="font-mono text-stone-900">
                        {b.capabilities.engine ?? "—"}
                        {b.capabilities.version ? ` · v${b.capabilities.version}` : ""}
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Active runs</span>
                      <span className="font-mono text-stone-900">
                        {b.capabilities.busyRunIds.length}
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Run cap held</span>
                      <span className="font-mono text-stone-900">
                        {b.capabilities.cap !== null ? `cap ${b.capabilities.cap}` : "—"}
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Total runs</span>
                      <span className="font-mono text-stone-900">
                        {b.totalRuns}
                        {b.runs30d > 0 ? ` · ${b.runs30d} in 30d` : ""}
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Registered</span>
                      <span className="font-mono text-stone-900">{timeAgo(b.createdAt, now)}</span>
                    </li>
                  </ul>

                  <DoctorBlock bridge={b} now={now} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* PAIR A NEW BRIDGE — N:263–297 + the XX show-once panel */}
      <section className="mt-16">
        <MonoSectionLabel>Pair a new Bridge</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          Name the machine, generate its token, and start the daemon there with two
          environment variables. The token shows once; Atlas stores only its hash.
        </p>
        <PairingForm atlasUrl={atlasUrl} />
      </section>

      {/* RUN CAP — PRD #8, the Owner's machine-load dial */}
      <section className="mt-16">
        <MonoSectionLabel>Run cap</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          How many Engine sessions may run at once, across the whole instance. Helper Runs
          always yield the queue to yours.
        </p>
        <div className="mt-7">
          <CapControl cap={cap} />
        </div>
        <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          cap {cap} ·{" "}
          {confirmedCapBridge
            ? confirmedCapBridge.capabilities.cap === cap
              ? `daemon holds cap ${confirmedCapBridge.capabilities.cap}`
              : `daemon still holds cap ${confirmedCapBridge.capabilities.cap} — applies on its next heartbeat, within 30 s`
            : "applies on the daemon's next heartbeat · within 30 s"}
        </div>
      </section>

      {/* HOW PAIRING WORKS — N:301–332, honest recipe */}
      <section className="mt-16">
        <MonoSectionLabel>How pairing works</MonoSectionLabel>
        <div className="mt-5">
          <NumberedSteps
            narrow
            steps={[
              {
                body: "Generate a token above and copy it — it shows exactly once.",
              },
              {
                body: (
                  <>
                    On the machine that hosts your Bridge, start the daemon from the Atlas
                    repo:{" "}
                    <span className="font-mono text-sm text-stone-700">
                      ATLAS_URL=… ATLAS_BRIDGE_TOKEN=… node packages/bridge/src/index.ts
                    </span>
                    .
                  </>
                ),
              },
              {
                body: "Atlas detects the heartbeat. The new Bridge appears in the list above with a green pulse.",
              },
            ]}
          />
        </div>
      </section>
    </SettingsShell>
  );
}
