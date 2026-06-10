/**
 * Atlas v2 component kit — the 28 canon primitives (DESIGN-CANON.md §5).
 *
 * A component exists in this kit or it doesn't exist — surfaces never
 * define local variants of these (master plan §7.3). Every file cites
 * its variant source lines + governing canon sections at the top.
 */

// §5.1 — Sidebar
export { Sidebar, type SidebarItem, type BridgeStatus } from "./Sidebar";
// §5.2 — PageHeader
export { PageHeader, PageTitle, SubnavLink } from "./PageHeader";
// §5.3 — DividedList + ListRow
export { DividedList, ListRow } from "./DividedList";
// §5.4 — FeaturedCard
export { FeaturedCard, DocFigure } from "./FeaturedCard";
// §5.5 — MonoSectionLabel
export { MonoSectionLabel } from "./MonoSectionLabel";
// §5.6 — StateDot
export { StateDot, RunStateDot, StateWord, type DotSize } from "./StateDot";
// §5.7 — LivePulse
export { LivePulse, type PulseColor } from "./LivePulse";
// §5.8 — StateMachineTrack + GateTrack
export {
  StateMachineTrack,
  GateTrack,
  type TrackStep,
  type TrackTone,
  type Gate,
} from "./StateMachineTrack";
// §5.9 — PillButton
export { PillButton, type PillKind } from "./PillButton";
// §5.10 — Tooltip
export { Tooltip } from "./Tooltip";
// §5.11 — ModalShell + DeleteConfirm
export { ModalShell, ModalPanel, DeleteConfirm, type ModalSize } from "./ModalShell";
// §5.12 — CommandPalette
export {
  CommandPalette,
  type PaletteGroup,
  type PaletteItem,
} from "./CommandPalette";
// §5.13 — UnderlineInput family + validation
export {
  UnderlineInput,
  UnderlineTextarea,
  UnderlineSelect,
  type ValidationState,
} from "./UnderlineInput";
// §5.14 — SegmentedControl + OnOff
export { SegmentedControl, OnOff, type Segment } from "./SegmentedControl";
// §5.15 — ScopeChip / FilterChip
export { ScopeChip } from "./ScopeChip";
// §5.16 — OptionCard
export { OptionCard } from "./OptionCard";
// §5.17 — Kbd
export { Kbd } from "./Kbd";
// §5.18 — PullQuote
export { PullQuote } from "./PullQuote";
// §5.19 — NumberedSteps
export { NumberedSteps, type NumberedStep } from "./NumberedSteps";
// §5.20 — EmptyState
export { EmptyState, EmptyStateLink, type EmptyStateProps } from "./EmptyState";
// §5.21 — InitialMark / Avatar + presence
export { InitialMark } from "./InitialMark";
// §5.22 — Sparkline / WeekBars / UptimeStrip
export {
  Sparkline,
  WeekBars,
  UptimeStrip,
  type WeekBar,
  type UptimeDay,
} from "./Sparkline";
// §5.23 — TerminalBlock + SecretBlock
export {
  TerminalBlock,
  SecretBlock,
  type StreamLine,
  type StreamKind,
} from "./TerminalBlock";
// §5.24 — KanbanCard + ShipGroupCluster
export { KanbanCard, ShipGroupCluster, type SequenceHint } from "./KanbanCard";
// §5.25 — TimelineRail
export {
  TimelineRail,
  DateGutterTimeline,
  type TimelineEvent,
  type DateGutterEntry,
} from "./TimelineRail";
// §5.26 — AmberPanel
export { AmberPanel } from "./AmberPanel";
// §5.27 — RecentChip
export { RecentChip } from "./RecentChip";
// §5.28 — EmailShell + EmailStat
export { EmailShell, EmailStat } from "./EmailShell";

// §3.3 / §1.1 — the Run-state vocabulary (logic; tested in Vitest)
export {
  DOT_TONE_CLASS,
  runStateDotTone,
  runStateLabelClass,
  runStateLabelText,
  runStatePulses,
  type DotTone,
  type RunState,
  type StateContext,
} from "./run-state";
