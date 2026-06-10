// THROWAWAY — design-register prototype data only.
// Delete this folder when v1.3 design register is locked.
// See ./NOTES.md for the question, variants, and cleanup plan.

export type Signals = {
  triage: number;
  shipReady: number;
  failed: number;
  inFlight: number;
  review: number;
};

export type ProjectRow = {
  id: string;
  name: string;
  role: "owner" | "collaborator";
  pinned: boolean;
  openCount: number;
  lastActivity: string;
  bridgeOnline: boolean;
};

export type FeedEntry = {
  id: string;
  title: string;
  project: string;
  state: "shipped" | "failed" | "review-ready" | "backlog" | "in-progress" | "triage";
  at: string;
  reporter: string;
};

export const MOCK_SIGNALS: Signals = {
  triage: 3,
  shipReady: 2,
  failed: 1,
  inFlight: 4,
  review: 2,
};

export const MOCK_PROJECTS: ProjectRow[] = [
  { id: "p1", name: "acme-website", role: "owner", pinned: true, openCount: 7, lastActivity: "12m ago", bridgeOnline: true },
  { id: "p2", name: "atlas-internal", role: "owner", pinned: false, openCount: 2, lastActivity: "2h ago", bridgeOnline: true },
  { id: "p3", name: "side-experiment", role: "collaborator", pinned: false, openCount: 0, lastActivity: "yesterday", bridgeOnline: false },
];

export const MOCK_FEED: FeedEntry[] = [
  { id: "f1", title: "Add export to CSV", project: "acme-website", state: "shipped", at: "2h ago", reporter: "ada@acme.io" },
  { id: "f2", title: "Mermaid renders blank on iOS", project: "atlas-internal", state: "failed", at: "12m ago", reporter: "you" },
  { id: "f3", title: "Onboarding copy refresh", project: "acme-website", state: "review-ready", at: "yesterday", reporter: "carmen@acme.io" },
  { id: "f4", title: "Empty-state illustrations", project: "atlas-internal", state: "backlog", at: "yesterday", reporter: "you" },
  { id: "f5", title: "T70 sidebar prototype", project: "atlas-internal", state: "in-progress", at: "just now", reporter: "you" },
  { id: "f6", title: "Parallel-safe Ship Group", project: "atlas-internal", state: "review-ready", at: "1h ago", reporter: "you" },
];

export type NavItem = {
  key: string;
  label: string;
  short: string;
  glyph: string;
  active?: boolean;
  badge?: number;
};

export const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", short: "DSH", glyph: "⌂", active: true },
  { key: "triage", label: "Triage", short: "TRG", glyph: "◑", badge: 3 },
  { key: "review", label: "Review", short: "RVW", glyph: "✓", badge: 2 },
  { key: "projects", label: "Projects", short: "PRJ", glyph: "▣" },
  { key: "settings", label: "Settings", short: "STG", glyph: "⚙" },
];
