/**
 * M10 — /settings (Preferences, the Settings-tier index).
 *
 * Ported from design/variants/variant-h-settings.tsx:159–245 (hero,
 * §4-M10 section recipe `mt-20/16 pb-14 border-b`, pinned-projects rows
 * H:209–235, the instant-save italic H:242) + rail H:249–332.
 * Sanctioned deviations (HANDOFF-M10): H's "Project sort" and "Kanban
 * density default" sections mock preferences NOTHING consumes — the
 * honesty bar (no dead switches) replaces them with the one preference
 * that is real and persisted, the §2.1 sidebar density; H's Save button
 * (H:239) drops because every control here saves on change (its own
 * italic line says so — kept); the rail's Docs section drops (the docs
 * tier is M14, in flight — no fake links) and Shortcuts lists only keys
 * that exist (triage deck, M8) — palette "soon" removed at M-SHIP sweep (M12 shipped it);
 * About's mock build-sha row is replaced by real facts.
 */
import {
  DividedList,
  Kbd,
  LivePulse,
  MonoSectionLabel,
  PillButton,
} from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { SettingsShell } from "@/src/components/settings/SettingsShell";
import { requireOwner } from "@/src/domain/auth/guard";
import { bridgeViews } from "@/src/domain/bridge/queries";
import { projectRows } from "@/src/domain/cockpit/queries";
import { latestCursor } from "@/src/domain/live/broker";
import { sidebarCollapsed } from "@/src/domain/preferences/sidebar";
import {
  afkFallbackMinutes,
  afkLevel,
  athenaApiKeyIsSet,
  athenaCouncilSize,
  athenaLocation,
} from "@/src/domain/settings/instance";
import { secretsAvailable } from "@/src/lib/secret";
import { shortAgo } from "@/src/lib/format";

import { pinProjectAction, unpinProjectAction } from "./actions";
import { AfkPrefControl } from "./afk-pref-control";
import { AthenaKeyControl } from "./athena-key-control";
import { SidebarPrefControl } from "./sidebar-pref-control";

export const dynamic = "force-dynamic";

const APP_VERSION = "2.0.0-dev"; // the v2 rebuild line — honest pre-release tag

/** H:25–60 ShortcutRow — Kbd kit per §2.14. */
function ShortcutRow({
  keys,
  label,
  soon,
}: {
  keys: string[];
  label: string;
  soon?: boolean;
}) {
  return (
    <li className="flex items-baseline justify-between">
      <span className={`flex items-baseline gap-2 ${soon ? "text-stone-400" : "text-stone-700"}`}>
        <span>{label}</span>
        {soon && (
          <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
            soon
          </span>
        )}
      </span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <Kbd key={i}>{k}</Kbd>
        ))}
      </span>
    </li>
  );
}

export default async function PreferencesPage() {
  const user = await requireOwner();
  const [rows, collapsed, afkLvl, afkDelay, afkLoc, councilSize, keyIsSet, bridges, cursor] =
    await Promise.all([
      projectRows(),
      sidebarCollapsed(user.id),
      afkLevel(),
      afkFallbackMinutes(),
      athenaLocation(),
      athenaCouncilSize(),
      athenaApiKeyIsSet(),
      bridgeViews(),
      latestCursor(),
    ]);
  const keyStorageAvailable = secretsAvailable();
  const pinned = rows.filter((p) => p.pinned);
  const unpinned = rows.filter((p) => !p.pinned);
  const healthyBridge = bridges.find((b) => b.health === "healthy");

  return (
    <SettingsShell
      breadcrumb="Settings · Preferences"
      active="preferences"
      bridgeBadge={bridges.length}
      rail={
        <>
          {/* Shortcuts — H:251–266, honest key list only */}
          <section>
            <MonoSectionLabel>Shortcuts</MonoSectionLabel>
            <ul className="mt-5 space-y-3 text-sm">
              <ShortcutRow keys={["Ctrl", "K"]} label="Command palette" /> {/* M-SHIP: palette shipped M12 — soon removed */}
              <ShortcutRow keys={["A"]} label="Triage · approve" />
              <ShortcutRow keys={["B"]} label="Triage · backlog" />
              <ShortcutRow keys={["I"]} label="Triage · needs info" />
              <ShortcutRow keys={["D"]} label="Triage · decline" />
              <ShortcutRow keys={["←", "→"]} label="Triage · previous / skip" />
            </ul>
            <div className="mt-5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
              Triage keys work on the triage deck
            </div>
          </section>

          {/* About — H:310–331, real facts only */}
          <section className="pt-6 border-t border-stone-200/80">
            <MonoSectionLabel>About</MonoSectionLabel>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-baseline justify-between">
                <span className="text-stone-500">Version</span>
                <span className="font-mono text-stone-900">{APP_VERSION}</span>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-stone-500">Bridge daemon</span>
                <span className="font-mono text-stone-900">
                  {healthyBridge?.capabilities.version ?? "not connected"}
                </span>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-stone-500">Bridge</span>
                {healthyBridge ? (
                  <span className="font-mono text-emerald-600 flex items-center gap-1.5">
                    <LivePulse color="emerald" />
                    online
                  </span>
                ) : (
                  <span className="font-mono text-stone-400 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-stone-300" />
                    {bridges.length ? "offline" : "not paired"}
                  </span>
                )}
              </li>
            </ul>
          </section>
        </>
      }
    >
      <LiveRefresh since={cursor} />
      {/* §2.2 — single-word title, period, never the accent. */}
      <h1 className="text-5xl font-bold tracking-tighter">Preferences.</h1>
      <p className="mt-4 text-lg text-stone-500 leading-relaxed max-w-xl">
        How you want Atlas to behave for you. Changes save instantly.
      </p>

      {/* Section: Sidebar — the §2.1 persisted preference (real) */}
      <section className="mt-20 pb-14 border-b border-stone-200">
        <MonoSectionLabel>Sidebar</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          The collapsed 56px rail is the canon shell; expand it for labelled navigation.
          Persisted to your account.
        </p>
        <div className="mt-7">
          <SidebarPrefControl collapsed={collapsed} />
        </div>
      </section>

      {/* Section: AFK Mode — ADR-0006 §4, Athena answers Asks while you're away */}
      <section className="mt-16 pb-14 border-b border-stone-200">
        <MonoSectionLabel>AFK Mode</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          When a Run needs a decision and you&apos;re away, <span className="font-medium text-stone-700">Athena</span> —
          the decision delegate — answers on your behalf so work keeps moving, and every
          decision is recorded in the feed. <span className="font-medium text-stone-700">On</span> keeps a
          safety rail (high-stakes Asks still come to you); <span className="font-medium text-stone-700">Ultra</span> drops
          the rail (Athena answers everything). <span className="font-medium text-stone-700">Off</span> sends Asks to
          you, with Athena as a fallback after the delay you set.
        </p>
        <div className="mt-7">
          <AfkPrefControl
            level={afkLvl}
            fallbackMinutes={afkDelay}
            location={afkLoc}
            councilSize={councilSize}
          />
        </div>
        <div className="mt-9">
          <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
            Anthropic key (cloud tier)
          </p>
          <div className="mt-4">
            <AthenaKeyControl isSet={keyIsSet} available={keyStorageAvailable} />
          </div>
        </div>
      </section>

      {/* Section: Pinned projects — H:209–235 over real rows */}
      <section className="mt-16 pb-14 border-b border-stone-200">
        <MonoSectionLabel>Pinned projects</MonoSectionLabel>
        <p className="mt-4 text-base text-stone-500 leading-relaxed">
          Projects shown in the Pinned strip on Today.
        </p>
        {pinned.length > 0 ? (
          <ul className="mt-7 divide-y divide-stone-200">
            {pinned.map((p) => (
              <li key={p.id} className="py-4 flex items-baseline justify-between group">
                <span className="flex items-baseline gap-3">
                  <span className="text-amber-500">★</span>
                  <span className="text-base tracking-tight font-medium">{p.name}</span>
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    last activity {p.lastActivityAt ? shortAgo(p.lastActivityAt) : "—"}
                  </span>
                </span>
                <form action={unpinProjectAction}>
                  <input type="hidden" name="projectId" value={p.id} />
                  <PillButton kind="ghost" ghostDanger type="submit">
                    unpin →
                  </PillButton>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          // §2.17 strip-level empty state — one quiet sentence.
          <p className="mt-7 text-sm italic text-stone-500">
            Nothing pinned yet — pin a project below and it leads Today.
          </p>
        )}
        {unpinned.length > 0 && (
          // H:232's "+ pin a project" — disclosure keeps the page quiet.
          <details className="mt-5">
            <summary className="inline-block font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer list-none">
              + pin a project
            </summary>
            <DividedList>
              {unpinned.map((p) => (
                <li key={p.id} className="py-4 flex items-baseline justify-between">
                  <span className="text-base tracking-tight">{p.name}</span>
                  <form action={pinProjectAction}>
                    <input type="hidden" name="projectId" value={p.id} />
                    <PillButton kind="ghost" type="submit">
                      pin →
                    </PillButton>
                  </form>
                </li>
              ))}
            </DividedList>
          </details>
        )}
      </section>

      {/* H:242 — the honest closing line; every control above saves on change. */}
      <div className="mt-16">
        <span className="italic font-sans text-sm text-stone-500">
          just change a value — Atlas saves as you go
        </span>
      </div>
    </SettingsShell>
  );
}
