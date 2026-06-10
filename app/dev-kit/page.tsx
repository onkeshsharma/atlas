// M4 — /dev-kit: the component-kit gallery. Dev-only design-lab surface
// (gated like /dev-variants); one section per canon §5 primitive, each
// rendering the kit component in its canonical states with a ghost link
// to its source variant render. This page is the first surface composed
// from the kit, so it follows the canon itself (§2.2 routed header,
// §2.5 rule-rows, §3.8 voice). Demo data mirrors the cited variants +
// design/variants/mock-data.ts.
import { Fragment } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import { devVariantsEnabled } from "../dev-variants/_registry";
import { MOCK_FEED, NAV } from "@/design/variants/mock-data";
import {
  AmberPanel,
  CommandPalette,
  DateGutterTimeline,
  DeleteConfirm,
  DividedList,
  DocFigure,
  EmailShell,
  EmailStat,
  EmptyState,
  EmptyStateLink,
  FeaturedCard,
  GateTrack,
  InitialMark,
  Kbd,
  KanbanCard,
  ListRow,
  LivePulse,
  ModalShell,
  MonoSectionLabel,
  NumberedSteps,
  OnOff,
  OptionCard,
  PageHeader,
  PageTitle,
  PillButton,
  PullQuote,
  RecentChip,
  RunStateDot,
  ScopeChip,
  SegmentedControl,
  ShipGroupCluster,
  Sidebar,
  Sparkline,
  StateDot,
  StateMachineTrack,
  StateWord,
  SubnavLink,
  TerminalBlock,
  SecretBlock,
  TimelineRail,
  Tooltip,
  UnderlineInput,
  UnderlineSelect,
  UnderlineTextarea,
  UptimeStrip,
  WeekBars,
  type RunState,
  type SidebarItem,
} from "@/src/components/kit";

export const dynamic = "force-dynamic";

const RUN_STATES: RunState[] = [
  "queued",
  "running",
  "needs-input",
  "review-ready",
  "shipped",
  "failed",
  "cancelled",
];

const SIDEBAR_ITEMS: SidebarItem[] = NAV.map((n) => ({
  key: n.key,
  label: n.label,
  initial: n.short.charAt(0),
  active: n.active,
  badge: n.badge,
}));

const DEMO_USER = { initial: "o", email: "owner@example.com", machine: "macbook-pro-2024" };

/** Gallery scaffolding — a §2.5 rule-row per primitive + citation line. */
function KitSection({
  id,
  n,
  name,
  canon,
  cites,
  variants,
  children,
}: {
  id: string;
  n: number;
  name: string;
  canon: string;
  cites: string;
  variants: string[];
  children: React.ReactNode;
}) {
  return (
    <section id={`kit-${id}`} data-kit-section={id} className="mt-16">
      <MonoSectionLabel
        rule
        action={
          <span className="flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-widest">
            <span className="text-stone-400">{canon}</span>
            {variants.map((k) => (
              <Link
                key={k}
                href={`/dev-variants/${k}`}
                className="text-stone-700 hover:text-amber-600 transition"
              >
                {k} →
              </Link>
            ))}
          </span>
        }
      >
        {String(n).padStart(2, "0")} · {name}
      </MonoSectionLabel>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
        {cites}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** quiet mono caption above a demo state. */
function DemoLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
      {children}
    </div>
  );
}

export default function DevKitPage() {
  if (!devVariantsEnabled()) {
    notFound();
  }
  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <PageHeader
        kind="routed"
        breadcrumb="Atlas · design lab · component kit"
        nav={
          <Link
            href="/dev-variants"
            className="hover:text-stone-900 cursor-pointer"
          >
            all variants →
          </Link>
        }
      >
        <PageTitle>Kit.</PageTitle>
        <p className="mt-5 max-w-2xl text-xl text-stone-700 leading-relaxed">
          The 28 canon primitives (DESIGN-CANON.md §5), each ported from its
          source variant and rendered in its canonical states. Surfaces compose
          from here — a component exists in the kit or it doesn&rsquo;t exist.
        </p>
      </PageHeader>

      <div className="max-w-3xl">
        {/* 01 — Sidebar */}
        <KitSection
          id="sidebar"
          n={1}
          name="Sidebar"
          canon="§2.1 · §3.2"
          cites="ports variant-e:34–107 (collapsed) · variant-c:12–39 (expanded)"
          variants={["e", "c", "d"]}
        >
          <div className="flex gap-8 items-start">
            <div>
              <DemoLabel>collapsed · bridge healthy</DemoLabel>
              <div className="mt-2 relative h-[480px] w-28 overflow-hidden rounded-2xl border border-stone-200/80">
                <Sidebar items={SIDEBAR_ITEMS} user={DEMO_USER} bridge="healthy" />
              </div>
            </div>
            <div>
              <DemoLabel>collapsed · bridge offline</DemoLabel>
              <div className="mt-2 relative h-[480px] w-28 overflow-hidden rounded-2xl border border-stone-200/80">
                <Sidebar items={SIDEBAR_ITEMS} user={DEMO_USER} bridge="offline" />
              </div>
            </div>
            <div className="flex-1">
              <DemoLabel>expanded · weight-shift active state, no underline</DemoLabel>
              <div className="mt-2 relative h-[480px] overflow-hidden rounded-2xl border border-stone-200/80 flex">
                <Sidebar items={SIDEBAR_ITEMS} user={DEMO_USER} bridge="healthy" expanded />
              </div>
            </div>
          </div>
        </KitSection>

        {/* 02 — PageHeader */}
        <KitSection
          id="page-header"
          n={2}
          name="PageHeader"
          canon="§2.2 · §3.2"
          cites="ports variant-e:116–140 (cockpit) · variant-f:147–149, variant-xx:72–96 (routed)"
          variants={["e", "f", "xx"]}
        >
          <DemoLabel>cockpit (Today only — pt-12 at page level)</DemoLabel>
          <div className="mt-3 rounded-2xl border border-stone-200/80 p-8">
            <PageHeader kind="cockpit" dayStamp="Tuesday · May 13" title="Today.">
              <span className="font-mono font-bold tracking-tighter text-stone-900">3</span>{" "}
              tickets need your triage.{" "}
              <span className="font-mono font-bold tracking-tighter text-amber-600">2</span>{" "}
              are ready to ship.
            </PageHeader>
          </div>
          <DemoLabel>
            <span className="block mt-6">routed · breadcrumb + subnav + sentence-title accent</span>
          </DemoLabel>
          <div className="mt-3 rounded-2xl border border-stone-200/80 p-8">
            <PageHeader
              kind="routed"
              breadcrumb="Settings · Security · Access tokens"
              nav={
                <>
                  <SubnavLink>2FA</SubnavLink>
                  <SubnavLink active>Tokens</SubnavLink>
                  <SubnavLink>Audit log →</SubnavLink>
                </>
              }
            >
              <PageTitle accent="bearer tokens" after="." wraps>
                Your{" "}
              </PageTitle>
            </PageHeader>
          </div>
        </KitSection>

        {/* 03 — DividedList */}
        <KitSection
          id="divided-list"
          n={3}
          name="DividedList + ListRow"
          canon="§2.3 · §3.3"
          cites="ports variant-c:77–131 · variant-e:248–286"
          variants={["c", "e"]}
        >
          <DemoLabel>indexed feed rows · state dot + colored state word · no card chrome, ever</DemoLabel>
          <div className="mt-3">
            <MonoSectionLabel rule count={MOCK_FEED.length}>
              Recent
            </MonoSectionLabel>
            <DividedList ordered>
              {MOCK_FEED.slice(0, 4).map((f, i) => (
                <ListRow
                  key={f.id}
                  index={String(i + 1).padStart(2, "0")}
                  state={feedToRunState(f.state)}
                  title={f.title}
                  meta={
                    <>
                      {f.project} · {f.reporter} ·{" "}
                      <StateWord state={feedToRunState(f.state)} />
                    </>
                  }
                  right={f.at}
                />
              ))}
            </DividedList>
          </div>
        </KitSection>

        {/* 04 — FeaturedCard */}
        <KitSection
          id="featured-card"
          n={4}
          name="FeaturedCard"
          canon="§2.4"
          cites="ports variant-e:355–377 (p-5 action) · variant-f:212 (p-6 prose) · variant-ii:410–421 (doc figure)"
          variants={["e", "f", "ii"]}
        >
          <div className="grid grid-cols-2 gap-8 items-start">
            <div>
              <DemoLabel>rail action card · p-5</DemoLabel>
              <div className="mt-2">
                <FeaturedCard>
                  <MonoSectionLabel>Ready to ship</MonoSectionLabel>
                  <div className="mt-3 text-sm text-stone-700 leading-relaxed">
                    <span className="font-mono text-stone-900">2 tickets</span> are
                    parallel-safe. A single Ship Group can land them together.
                  </div>
                  <div className="mt-2 font-mono text-xs text-stone-500">
                    T-247 · T-301 · file-sets disjoint
                  </div>
                  <div className="mt-5">
                    <PillButton kind="ship" fullWidth>
                      Ship 2 now
                    </PillButton>
                  </div>
                </FeaturedCard>
              </div>
            </div>
            <div>
              <DemoLabel>prose panel · p-6</DemoLabel>
              <div className="mt-2">
                <FeaturedCard padding="6">
                  <p className="text-base text-stone-700 leading-relaxed">
                    Add an{" "}
                    <span className="font-semibold text-stone-900">
                      &ldquo;Export as CSV&rdquo;
                    </span>{" "}
                    button to the ticket list page. The button downloads a UTF-8 CSV
                    of all visible tickets.
                  </p>
                </FeaturedCard>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <DemoLabel>doc figure</DemoLabel>
            <div className="mt-2">
              <DocFigure caption="Fig. 1 — what users actually see">
                <p className="text-sm text-stone-700">A bounded artifact.</p>
              </DocFigure>
            </div>
          </div>
        </KitSection>

        {/* 05 — MonoSectionLabel */}
        <KitSection
          id="mono-section-label"
          n={5}
          name="MonoSectionLabel"
          canon="§2.5"
          cites="ports variant-c:71–76 (rule-row) · variant-e:297 (rail) · variant-e:381 (live)"
          variants={["c", "e"]}
        >
          <div className="space-y-6">
            <div>
              <DemoLabel>main-column rule-row · count</DemoLabel>
              <div className="mt-2">
                <MonoSectionLabel rule count={12}>
                  Projects
                </MonoSectionLabel>
              </div>
            </div>
            <div>
              <DemoLabel>rail standalone</DemoLabel>
              <div className="mt-2">
                <MonoSectionLabel>This week</MonoSectionLabel>
              </div>
            </div>
            <div>
              <DemoLabel>live section · emerald pulse prefix</DemoLabel>
              <div className="mt-2">
                <MonoSectionLabel live="emerald">Activity</MonoSectionLabel>
              </div>
            </div>
            <div>
              <DemoLabel>kicker with static amber dot</DemoLabel>
              <div className="mt-2">
                <MonoSectionLabel dot="amber">AI digest</MonoSectionLabel>
              </div>
            </div>
          </div>
        </KitSection>

        {/* 06 — StateDot */}
        <KitSection
          id="state-dot"
          n={6}
          name="StateDot"
          canon="§2.6 · §3.3"
          cites="ports variant-e:539–546 · variant-g:288"
          variants={["e", "g"]}
        >
          <DemoLabel>the §3.3 vocabulary — dot + label per Run state (list context)</DemoLabel>
          <ul className="mt-3 space-y-2">
            {RUN_STATES.map((s) => (
              <li key={s} className="flex items-center gap-2.5 text-sm text-stone-500">
                <RunStateDot state={s} context="list" />
                <StateWord state={s} />
              </li>
            ))}
          </ul>
          <DemoLabel>
            <span className="block mt-6">size scale — 1 · 1.5 · 2 · 2.5 (+ringed presence)</span>
          </DemoLabel>
          <div className="mt-3 flex items-center gap-6">
            <StateDot tone="emerald" size="1" />
            <StateDot tone="emerald" size="1.5" />
            <StateDot tone="emerald" size="2" />
            <StateDot tone="emerald" size="2.5" />
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-900">
              <StateDot tone="emerald" size="2" ring />
            </span>
          </div>
        </KitSection>

        {/* 07 — LivePulse */}
        <KitSection
          id="live-pulse"
          n={7}
          name="LivePulse"
          canon="§2.7"
          cites="ports variant-e:144–147 · variant-rr:107–110"
          variants={["e", "rr"]}
        >
          <DemoLabel>pulse only what is genuinely live</DemoLabel>
          <div className="mt-3 space-y-3 font-mono text-[10px] uppercase tracking-widest">
            <div className="flex items-center gap-2 text-stone-500">
              <LivePulse color="emerald" />
              <span>3 collaborators active today</span>
            </div>
            <div className="flex items-center gap-2 text-amber-700">
              <LivePulse color="amber" />
              <span>live · streaming</span>
            </div>
            <div className="flex items-center gap-2 text-rose-700">
              <LivePulse color="rose" />
              <span>major outage · investigating</span>
            </div>
          </div>
        </KitSection>

        {/* 08 — StateMachineTrack */}
        <KitSection
          id="state-machine-track"
          n={8}
          name="StateMachineTrack + GateTrack"
          canon="§2.8"
          cites="ports variant-f:264–318 · variant-k:233–267 · variant-rr:153–188"
          variants={["f", "k", "rr"]}
        >
          <div className="grid grid-cols-2 gap-12">
            <div>
              <DemoLabel>ticket lifecycle · amber current</DemoLabel>
              <div className="mt-4">
                <StateMachineTrack
                  tone="amber"
                  steps={[
                    { key: "triage", label: "Triage", at: "2 days ago", status: "done" },
                    { key: "backlog", label: "Backlog", at: "just now", status: "current" },
                    { key: "active", label: "Active", status: "pending" },
                    { key: "review", label: "Review", status: "pending" },
                    { key: "closed", label: "Closed", status: "pending" },
                  ]}
                />
              </div>
            </div>
            <div>
              <DemoLabel>failed run · rose</DemoLabel>
              <div className="mt-4">
                <StateMachineTrack
                  tone="rose"
                  steps={[
                    { key: "queued", label: "Queued", at: "12m ago", status: "done" },
                    { key: "running", label: "Running", at: "12m ago", status: "done" },
                    { key: "failed", label: "Failed", at: "8m ago", status: "current" },
                  ]}
                />
              </div>
            </div>
          </div>
          <div className="mt-10">
            <DemoLabel>gate-progress form (live Run)</DemoLabel>
            <div className="mt-4">
              <GateTrack
                gates={[
                  { name: "Read brief", state: "done" },
                  { name: "Diff code", state: "done" },
                  { name: "Typecheck", state: "done" },
                  { name: "Lint", state: "done" },
                  { name: "Tests", state: "done" },
                  { name: "Build", state: "active" },
                  { name: "Open PR", state: "pending" },
                ]}
              />
            </div>
          </div>
        </KitSection>

        {/* 09 — PillButton */}
        <KitSection
          id="pill-button"
          n={9}
          name="PillButton"
          canon="§2.9 · §3.4 · E1 · E4"
          cites="ports variant-xx:262 · variant-o:357–361 · variant-jj:133–139 · variant-l:93 · variant-bb:341 · variant-e:443"
          variants={["xx", "o", "jj", "l", "bb"]}
        >
          <DemoLabel>all six kinds</DemoLabel>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <PillButton kind="primary">Generate token →</PillButton>
            <PillButton kind="ship">Ship 2 now</PillButton>
            <PillButton kind="danger-confirm" size="page">
              Delete forever <span className="text-rose-200">✕</span>
            </PillButton>
            <PillButton kind="secondary">Continue with Google</PillButton>
            <PillButton kind="danger-secondary">Delete my account</PillButton>
            <PillButton kind="ghost">all activity →</PillButton>
          </div>
          <DemoLabel>
            <span className="block mt-6">
              w-full dot-in-button rule — amber dispatch · emerald ship (canon §3.4
              overrules variant-e:368&rsquo;s stone-900 ship, ledger E4)
            </span>
          </DemoLabel>
          <div className="mt-3 grid grid-cols-2 gap-4 max-w-xl">
            <PillButton kind="primary" fullWidth dot="amber">
              Dispatch to AI
            </PillButton>
            <PillButton kind="ship" fullWidth>
              Ship 2 now
            </PillButton>
          </div>
          <DemoLabel>
            <span className="block mt-6">small sizes · disabled danger-confirm · ghost danger</span>
          </DemoLabel>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <PillButton kind="ship" size="xs" arrow={false}>
              Ship 2 →
            </PillButton>
            <PillButton kind="primary" size="sm">
              Copy →
            </PillButton>
            <PillButton kind="danger-confirm" size="page" disabled>
              Delete forever
            </PillButton>
            <PillButton kind="ghost" ghostDanger>
              revoke
            </PillButton>
          </div>
        </KitSection>

        {/* 10 — Tooltip */}
        <KitSection
          id="tooltip"
          n={10}
          name="Tooltip"
          canon="§2.10"
          cites="ports variant-e:62–65 (right) · variant-f:294–300 (top)"
          variants={["e", "f"]}
        >
          <DemoLabel>CSS-only group-hover · hover the marks</DemoLabel>
          <div className="mt-4 flex items-center gap-12 py-6">
            <Tooltip label="Triage" meta="3" side="right">
              <span className="text-base font-medium text-stone-400 hover:text-stone-900 cursor-pointer">
                T
              </span>
            </Tooltip>
            <Tooltip label="Backlog" meta="just now" side="top">
              <StateDot tone="amber" size="1.5" />
            </Tooltip>
          </div>
        </KitSection>

        {/* 11 — ModalShell + DeleteConfirm */}
        <KitSection
          id="modal-shell"
          n={11}
          name="ModalShell + DeleteConfirm"
          canon="§2.11 · E8"
          cites="ports variant-jj:43–141 · variant-y:91–92 (UU rounded-3xl folded per E8)"
          variants={["jj", "y"]}
        >
          <DemoLabel>scrim bg-amber-50/60 + blur over a ghosted page · type-to-confirm arms the button</DemoLabel>
          <div className="mt-3 relative h-[720px] overflow-hidden rounded-2xl border border-stone-200/80">
            {/* ghosted page behind the modal (JJ:12–40) */}
            <div className="absolute inset-0 opacity-30 pointer-events-none px-16 pt-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Projects · acme-website
              </div>
              <h3 className="mt-3 text-5xl font-bold tracking-tighter">acme-website.</h3>
            </div>
            <ModalShell size="confirm">
              <DeleteConfirm
                name="acme-website"
                description={
                  <>
                    Atlas will forget this Project, every Ticket filed against it,
                    every Run, every Brief, and every Collaborator relationship.
                    Your code on the Bridge stays where it is.
                  </>
                }
                consequences={[
                  // keyed — element arrays crossing into a client component
                  // are serialized by React Flight, which validates keys.
                  <Fragment key="tickets">
                    <span className="font-mono text-stone-900">47</span> Tickets,
                    including <span className="font-mono text-stone-900">3</span> you
                    have open right now
                  </Fragment>,
                  <Fragment key="runs">
                    <span className="font-mono text-stone-900">62</span> Runs by the
                    Engine
                  </Fragment>,
                  <Fragment key="context">The CONTEXT.md you maintained</Fragment>,
                ]}
                keeps={
                  <>
                    Your{" "}
                    <span className="font-mono text-stone-900">github.com/acme/website</span>{" "}
                    repository — unchanged. Atlas never had it.
                  </>
                }
              />
            </ModalShell>
          </div>
        </KitSection>

        {/* 12 — CommandPalette */}
        <KitSection
          id="command-palette"
          n={12}
          name="CommandPalette"
          canon="§2.12 · §3.5"
          cites="ports variant-uu:79–183 (interior) + variant-y:109, 185–209 (cap + footer)"
          variants={["uu", "y"]}
        >
          <DemoLabel>one palette — UU interior + Y capped scroll, mounted in the §2.11 panel</DemoLabel>
          <div className="mt-3 w-full max-w-2xl rounded-2xl bg-white border border-stone-200 shadow-2xl overflow-hidden">
            <CommandPalette
              autoFocus={false}
              recents={["T-247", "acme-website", "failed runs"]}
              groups={[
                {
                  label: "Tickets",
                  items: [
                    {
                      glyph: "#",
                      label: "Add CSV export to the ticket list",
                      hint: "T-247 · review ready · acme-website",
                      recent: true,
                    },
                    {
                      glyph: "#",
                      label: "Mermaid renders blank on iOS",
                      hint: "T-280 · backlog · atlas-internal",
                    },
                  ],
                },
                {
                  label: "Actions",
                  items: [
                    { glyph: "/", label: "File a Ticket", kbd: "F" },
                    { glyph: "/", label: "Open the Kanban", kbd: "K" },
                  ],
                },
              ]}
            />
          </div>
        </KitSection>

        {/* 13 — UnderlineInput family */}
        <KitSection
          id="underline-input"
          n={13}
          name="UnderlineInput + validation"
          canon="§2.13"
          cites="ports variant-l:49–76 · variant-m:219–229 · variant-jj:117–120 — validation states are canon-invented (first real render)"
          variants={["l", "m", "jj"]}
        >
          <div className="grid grid-cols-2 gap-x-12 gap-y-8 max-w-2xl">
            <UnderlineInput label="Email" placeholder="you@example.com" type="email" />
            <UnderlineInput
              label="Label"
              placeholder="staging-bridge · linode-vm-42"
              mono
              hint="mono value text for machine-ish content"
            />
            <UnderlineInput
              label="Email"
              type="email"
              defaultValue="not-an-email"
              validation="error"
              message="enter a valid email address"
            />
            <UnderlineInput
              label="Bridge token"
              mono
              defaultValue="atb_live_e3f2_…"
              validation="success"
              message="token validated"
            />
            <UnderlineInput
              label="Machine name"
              defaultValue="macbook-pro-2024"
              validation="disabled"
            />
            <UnderlineSelect label="Role" defaultValue="collaborator">
              <option value="owner">Owner</option>
              <option value="collaborator">Collaborator</option>
            </UnderlineSelect>
          </div>
          <div className="mt-8 max-w-2xl">
            <UnderlineTextarea
              label="Welcome note"
              labelMeta="· optional"
              rows={3}
              placeholder="A quick line so they know what they're being invited to."
            />
          </div>
        </KitSection>

        {/* 14 — SegmentedControl */}
        <KitSection
          id="segmented-control"
          n={14}
          name="SegmentedControl + OnOff"
          canon="§2.13"
          cites="ports variant-h:174–184 · variant-g:125–129 · variant-cc:403–459"
          variants={["h", "g", "cc"]}
        >
          <div className="space-y-6">
            <div>
              <DemoLabel>base</DemoLabel>
              <div className="mt-2">
                <SegmentedControl
                  options={[
                    { value: "recent", label: "Recent" },
                    { value: "alpha", label: "Alphabetic" },
                    { value: "pinned", label: "Pinned then activity" },
                  ]}
                  defaultValue="recent"
                />
              </div>
            </div>
            <div>
              <DemoLabel>compact density toggle</DemoLabel>
              <div className="mt-2">
                <SegmentedControl
                  size="compact"
                  options={[
                    { value: "c", label: "C" },
                    { value: "m", label: "M" },
                    { value: "r", label: "R" },
                  ]}
                  defaultValue="m"
                />
              </div>
            </div>
            <div>
              <DemoLabel>On/Off — Atlas has no toggle switches · locked option renders a note</DemoLabel>
              <div className="mt-2 flex items-center gap-8">
                <OnOff value="on" />
                <OnOff value="off" size="micro" />
                <OnOff locked="always on" />
                <OnOff locked="soon" />
              </div>
            </div>
          </div>
        </KitSection>

        {/* 15 — ScopeChip */}
        <KitSection
          id="scope-chip"
          n={15}
          name="ScopeChip / FilterChip"
          canon="§2.13"
          cites="ports variant-xx:386–408 · register T75 (× clear)"
          variants={["xx", "g"]}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <ScopeChip selected>bridge:dispatch</ScopeChip>
            <ScopeChip selected clear>
              bridge:heartbeat
            </ScopeChip>
            <ScopeChip>tickets:read</ScopeChip>
            <ScopeChip>tickets:write</ScopeChip>
            <ScopeChip danger>*</ScopeChip>
          </div>
        </KitSection>

        {/* 16 — OptionCard */}
        <KitSection
          id="option-card"
          n={16}
          name="OptionCard"
          canon="§2.13"
          cites="ports variant-i:210–254"
          variants={["i", "ss"]}
        >
          <div className="grid grid-cols-3 gap-4">
            <OptionCard
              kind="primary"
              kbd="A"
              label="Accept"
              description="moves to Backlog, Engine drafts a Brief"
            />
            <OptionCard
              kind="default"
              kbd="L"
              label="Ask later"
              description="stays in Triage, reporter is told"
            />
            <OptionCard kind="danger" kbd="D" label="Decline" description="closes with a note" />
          </div>
        </KitSection>

        {/* 17 — Kbd */}
        <KitSection
          id="kbd"
          n={17}
          name="Kbd"
          canon="§2.14 · E7"
          cites="ports variant-y:147–152 · variant-i:242–246 — white chips fold to stone-100 (E7)"
          variants={["y", "i"]}
        >
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
              <Kbd>↑↓</Kbd> navigate
            </span>
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
              <Kbd>↵</Kbd> open
            </span>
            <Kbd size="large">esc</Kbd>
            <span className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-4 py-2">
              <Kbd onDark size="large">
                A
              </Kbd>
              <span className="font-mono text-xs uppercase tracking-widest text-stone-50">
                on dark
              </span>
            </span>
          </div>
        </KitSection>

        {/* 18 — PullQuote */}
        <KitSection
          id="pull-quote"
          n={18}
          name="PullQuote"
          canon="§2.15"
          cites="ports variant-f:413–423 (amber) · variant-v:160–178 (emerald)"
          variants={["f", "v", "aa"]}
        >
          <div className="grid grid-cols-2 gap-12 max-w-2xl">
            <PullQuote tone="amber" attribution="AI asks">
              Should export include archived (&gt;90d closed) tickets?
            </PullQuote>
            <PullQuote tone="emerald" attribution="Collaborator summary">
              To check this works: open the ticket list, click Export, and pick
              JSON. You should get a file with every visible ticket.
            </PullQuote>
          </div>
        </KitSection>

        {/* 19 — NumberedSteps */}
        <KitSection
          id="numbered-steps"
          n={19}
          name="NumberedSteps"
          canon="§2.16"
          cites="ports variant-xx:364–384 · variant-gg:94–109"
          variants={["xx", "gg"]}
        >
          <div className="max-w-xl">
            <NumberedSteps
              steps={[
                {
                  title: "Show once, store hashed",
                  body: "You see the full secret the moment it is created and never again.",
                },
                {
                  title: "Scoped to one purpose",
                  body: "Each token has explicit scopes. The Bridge token can't read your Tickets list.",
                },
                {
                  title: "Auto-expire in 90 days",
                  body: "Atlas never issues a permanent token. Rotation is the default.",
                },
              ]}
            />
          </div>
        </KitSection>

        {/* 20 — EmptyState */}
        <KitSection
          id="empty-state"
          n={20}
          name="EmptyState"
          canon="§2.17"
          cites="ports variant-ii:105–239 — one quiet sentence + at most one affordance"
          variants={["ii"]}
        >
          <div className="grid grid-cols-2 gap-8">
            <DocFigure caption="page — brand-new Owner" minHeight>
              <EmptyState
                shape="page"
                dayStamp="Tuesday · May 13"
                title="Today."
                sentence="No Projects yet."
                secondary="Ingest an existing repo, or start something new. Atlas takes about three minutes to read a codebase."
                action={
                  <PillButton kind="primary" size="sm" arrow>
                    Add your first Project
                  </PillButton>
                }
              />
            </DocFigure>
            <DocFigure caption="column — empty kanban column" minHeight>
              <EmptyState shape="column" goodNews="That's a good thing." />
            </DocFigure>
            <DocFigure caption="strip — no pinned Projects">
              <EmptyState shape="strip">
                No pinned Projects. Star a Project from the{" "}
                <EmptyStateLink href="/dev-variants/e">Projects</EmptyStateLink> list to
                surface it here.
              </EmptyState>
            </DocFigure>
            <DocFigure caption="palette — no results">
              <EmptyState
                shape="palette"
                query="foobar"
                suggestion={
                  <>
                    Try a Ticket ID (<span className="font-mono">T-247</span>), a Project
                    name, or a verb like <span className="font-mono">file</span>.
                  </>
                }
              />
            </DocFigure>
          </div>
        </KitSection>

        {/* 21 — InitialMark */}
        <KitSection
          id="initial-mark"
          n={21}
          name="InitialMark"
          canon="§2.18 · E6"
          cites="ports variant-o:396–409 (bare mark) · variant-ww:176–182 (row) · variant-qq:285–289 (profile)"
          variants={["o", "ww", "qq"]}
        >
          <div className="flex items-end gap-10">
            <div>
              <DemoLabel>bare marks + presence</DemoLabel>
              <div className="mt-3 flex items-center gap-4">
                <InitialMark initial="o" presence="emerald" />
                <InitialMark initial="a" presence="emerald" />
                <InitialMark initial="c" />
              </div>
            </div>
            <div>
              <DemoLabel>row monogram</DemoLabel>
              <div className="mt-3">
                <InitialMark initial="A" size="row" presence="emerald" />
              </div>
            </div>
            <div>
              <DemoLabel>profile</DemoLabel>
              <div className="mt-3">
                <InitialMark initial="O" size="profile" presence="emerald" />
              </div>
            </div>
          </div>
        </KitSection>

        {/* 22 — Sparkline family */}
        <KitSection
          id="sparkline"
          n={22}
          name="Sparkline / WeekBars / UptimeStrip"
          canon="§2.19"
          cites="ports variant-e:222–237, 324–350 · variant-mm:153–184 · variant-oo:143–171"
          variants={["e", "mm", "oo"]}
        >
          <div className="grid grid-cols-3 gap-10 items-end">
            <div className="group">
              <DemoLabel>7-day sparkline</DemoLabel>
              <div className="mt-3">
                <Sparkline data={[2, 5, 1, 3, 7, 4, 6]} />
              </div>
            </div>
            <div>
              <DemoLabel>week bars · current amber + rose negatives</DemoLabel>
              <div className="mt-3">
                <WeekBars
                  currentIndex={4}
                  bars={[
                    { label: "M", value: 1 },
                    { label: "T", value: 3 },
                    { label: "W", value: 0 },
                    { label: "T", value: 2, negative: 1 },
                    { label: "F", value: 4 },
                    { label: "S", value: 5, negative: 1 },
                    { label: "S", value: 0 },
                  ]}
                />
              </div>
            </div>
            <div>
              <DemoLabel>90-day uptime strip</DemoLabel>
              <div className="mt-3">
                <UptimeStrip
                  days={Array.from({ length: 90 }, (_, i): "ok" | "degraded" | "down" =>
                    i === 84 ? "down" : i === 89 ? "degraded" : "ok",
                  )}
                  startLabel="90 days ago"
                  endLabel="today"
                />
              </div>
            </div>
          </div>
        </KitSection>

        {/* 23 — TerminalBlock */}
        <KitSection
          id="terminal-block"
          n={23}
          name="TerminalBlock + SecretBlock"
          canon="§2.20 · §4-M10"
          cites="ports variant-rr:207–237 (+kind maps :39–67) · variant-xx:118–125"
          variants={["rr", "xx"]}
        >
          <TerminalBlock
            path="~/work/atlas-internal · claude --resume run-142"
            meta="6 lines"
            cursor
            cursorAt="09:42:38"
            lines={[
              { t: "09:42:01", kind: "info", text: "Engine spawned · pid 8472" },
              {
                t: "09:42:03",
                kind: "claude",
                text: "I'll read CONTEXT.md and the brief before touching code.",
              },
              { t: "09:42:04", kind: "tool", text: "Read CONTEXT.md" },
              { t: "09:42:23", kind: "ok", text: "✓ pnpm typecheck — 0 errors" },
              {
                t: "09:42:38",
                kind: "active",
                text: "› compiling .next/server… 18% (62/342 modules)",
              },
            ]}
          />
          <div className="mt-6">
            <DemoLabel>show-once secret block · the one amber-filled button (§4-M10)</DemoLabel>
            <div className="mt-2">
              <SecretBlock secret="atb_live_e3f2c481d09fbe5a87412c9f4e1bd8a36e2f714c8d" />
            </div>
          </div>
        </KitSection>

        {/* 24 — KanbanCard */}
        <KitSection
          id="kanban-card"
          n={24}
          name="KanbanCard + ShipGroupCluster"
          canon="§4-M8 · E2 · §3.3"
          cites="ports variant-g:232–319 — board context is calm; G:237 inset shadow dropped per §1.3"
          variants={["g"]}
        >
          <div className="grid grid-cols-2 gap-5 max-w-xl items-start">
            <div className="space-y-3">
              <KanbanCard
                id="T-275"
                title="T70 sidebar prototype"
                kind="enhancement"
                state="running"
                reporter="you"
                age="1h"
                hint={{ kind: "parallel-safe-with", ticket: "T-247" }}
              />
              <KanbanCard
                id="T-280"
                title="Mermaid renders blank on iOS"
                kind="bug"
                state="queued"
                reporter="you"
                age="3d"
                hint={{ kind: "blocked-by", ticket: "T-279" }}
              />
              <KanbanCard
                id="T-149"
                title="Engine timeout on large repos"
                kind="bug"
                state="needs-input"
                reporter="you"
                age="12h"
              />
            </div>
            <ShipGroupCluster count={2}>
              <KanbanCard
                id="T-247"
                title="Add export to CSV button"
                kind="enhancement"
                state="review-ready"
                reporter="ada"
                age="12h"
              />
              <KanbanCard
                id="T-249"
                title="Add JSON export endpoint"
                kind="enhancement"
                state="review-ready"
                reporter="carmen"
                age="1d"
              />
            </ShipGroupCluster>
          </div>
        </KitSection>

        {/* 25 — TimelineRail */}
        <KitSection
          id="timeline-rail"
          n={25}
          name="TimelineRail"
          canon="§3.3 · §4-M14"
          cites="ports variant-e:389–441 · variant-nn:131–154"
          variants={["e", "nn"]}
        >
          <div className="grid grid-cols-2 gap-12">
            <div>
              <DemoLabel>activity rail · pulse on the newest only</DemoLabel>
              <div className="mt-4 max-w-xs">
                <TimelineRail
                  events={[
                    { who: "ada", what: "is editing T-247", at: "2m ago", tone: "amber" },
                    { who: "Engine", what: "completed T-201", at: "1h ago", tone: "emerald" },
                    { who: "Engine", what: "failed T-149", at: "12m ago", tone: "rose" },
                    { who: "carmen", what: "dispatched T-149", at: "15m ago", tone: "stone" },
                  ]}
                />
              </div>
            </div>
            <div>
              <DemoLabel>date-gutter form (changelog)</DemoLabel>
              <div className="mt-4">
                <DateGutterTimeline
                  entries={[
                    {
                      anchor: "v1.4.0",
                      date: "May 12",
                      current: true,
                      children: (
                        <h3 className="text-3xl font-bold tracking-tighter leading-tight">
                          Ship Groups land together.
                        </h3>
                      ),
                    },
                    {
                      anchor: "v1.3.2",
                      date: "May 2",
                      children: (
                        <h3 className="text-3xl font-bold tracking-tighter leading-tight">
                          Quieter mornings.
                        </h3>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </KitSection>

        {/* 26 — AmberPanel */}
        <KitSection
          id="amber-panel"
          n={26}
          name="AmberPanel"
          canon="§3.3 · §2.4(7)"
          cites="ports variant-xx:104–143 — multi-Run = ONE panel, one pulse on the kicker only (2026-06-11 amendment)"
          variants={["xx"]}
        >
          <div className="space-y-8">
            <div>
              <DemoLabel>show-once form</DemoLabel>
              <div className="mt-2">
                <AmberPanel kicker="Token just created · copy it now">
                  <p className="mt-3 text-base text-stone-800 leading-relaxed">
                    This is the only time we&rsquo;ll show the full secret. After you
                    leave this page,{" "}
                    <span className="font-semibold">we can&rsquo;t retrieve it</span>
                    &nbsp;— we only store its hash.
                  </p>
                  <div className="mt-5">
                    <SecretBlock secret="atb_live_e3f2c481d09fbe5a87412c9f4e1bd8a36e2f714c8d" />
                  </div>
                </AmberPanel>
              </div>
            </div>
            <div>
              <DemoLabel>multi-Run needs-input form — kicker counts, rows never pulse</DemoLabel>
              <div className="mt-2">
                <AmberPanel
                  kicker="2 runs need your input"
                  rows={
                    <>
                      {[
                        {
                          id: "#142",
                          title: "Fix the timezone fallback",
                          q: "Should the fallback be UTC or the Owner's locale?",
                        },
                        {
                          id: "#144",
                          title: "CSV export edge cases",
                          q: "Include archived (>90d closed) tickets?",
                        },
                      ].map((r) => (
                        <li key={r.id} className="py-4 first:pt-2 last:pb-0">
                          <div className="flex items-baseline justify-between gap-6">
                            <div className="text-base tracking-tight text-stone-900">
                              {r.title}
                            </div>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500 whitespace-nowrap">
                              Run {r.id}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-stone-700 italic">{r.q}</div>
                          <div className="mt-2">
                            <PillButton kind="ghost">answer →</PillButton>
                          </div>
                        </li>
                      ))}
                    </>
                  }
                />
              </div>
            </div>
          </div>
        </KitSection>

        {/* 27 — RecentChip */}
        <KitSection
          id="recent-chip"
          n={27}
          name="RecentChip"
          canon="§2.12"
          cites="ports variant-uu:105–112"
          variants={["uu"]}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
              recent
            </span>
            <RecentChip>T-247</RecentChip>
            <RecentChip>acme-website</RecentChip>
            <RecentChip>failed runs</RecentChip>
          </div>
        </KitSection>

        {/* 28 — EmailShell */}
        <KitSection
          id="email-shell"
          n={28}
          name="EmailShell + EmailStat"
          canon="§4-M13"
          cites="ports variant-aa:29–56 · variant-yy:195–232 — stone-100 canvas is the email surface's job"
          variants={["aa", "yy"]}
        >
          {/* §4.9 — the amber wash is absent only in emails; this stone-100
              canvas is the email-client preview backdrop, not page chrome. */}
          <div className="rounded-2xl bg-stone-100 p-10 flex justify-center">
            <EmailShell
              from="Atlas"
              fromAddress="ship@atlas.com"
              to="carmen@acme.io"
              subject="Your Add JSON export is shipped"
              footerLeft="atlas.com · @atlas-internal"
              footerRight={
                <>
                  <a className="hover:text-stone-700 cursor-pointer">unsubscribe</a>
                  <span className="text-stone-300">·</span>
                  <a className="hover:text-stone-700 cursor-pointer">preferences</a>
                </>
              }
            >
              <p className="text-base text-stone-700 leading-relaxed">
                Hi <span className="font-medium text-stone-900">Carmen</span>,
              </p>
              <p className="mt-6 text-2xl tracking-tight leading-tight text-stone-900">
                The <span className="font-semibold">JSON export</span> you asked for is
                live on <span className="font-semibold">acme-website</span>.
              </p>
              <div className="mt-10">
                <PullQuote tone="emerald" attribution="how to verify">
                  Open the ticket list, click Export, and pick JSON. You should get a
                  file with every visible ticket.
                </PullQuote>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-3">
                <EmailStat n="5" label="shipped" />
                <EmailStat n="2" label="in review" />
                <EmailStat n="~14h" label="engine time" />
              </div>
            </EmailShell>
          </div>
        </KitSection>

        {/* closing footnote — §3.8 editorial voice */}
        <p className="mt-20 border-t border-stone-200 pt-5 text-sm italic text-stone-500 leading-relaxed">
          28 of 28 primitives, each citing its source lines. Where a render
          differs from its variant, the difference is a canon overrule and the
          file says which section.
        </p>
      </div>
    </main>
  );
}

/** maps mock-data feed states onto the v2 §3.3 vocabulary for the demo. */
function feedToRunState(s: (typeof MOCK_FEED)[number]["state"]): RunState {
  switch (s) {
    case "shipped":
      return "shipped";
    case "failed":
      return "failed";
    case "review-ready":
      return "review-ready";
    case "in-progress":
      return "running";
    default:
      return "queued";
  }
}
