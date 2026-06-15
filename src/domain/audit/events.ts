/**
 * M11 — audit-log composition (PRD #39; charter item 5). Pure: every
 * function here is table-driven testable; the DB touches live in
 * ./queries.ts.
 *
 * THE RECORD (the honesty bar — no fake rows, absences named):
 *   1. feed_events — the instance's append-only outbox, ALL kinds. Every
 *      mutation that follows THE OUTBOX RULE is in here; nothing else is.
 *   2. Neon Auth sessions — sign-ins, read from the live session record
 *      (neon_auth.session: real ip + user-agent; rows age out with their
 *      sessions — the page says so).
 *   3. api_tokens timestamps — token CRUD derived from the governance
 *      rows (created_at doubles as rotated-at by M10's rotate design;
 *      the derived event says "created or last rotated" because the row
 *      genuinely cannot distinguish them). RECORDED CALL (charter item
 *      5): derive, do NOT add token feed kinds — M10 decision 5 ruled
 *      token CRUD page-local and named this audit as its home; deriving
 *      covers pre-M11 history that feed kinds never could.
 *
 * Visual vocabulary: the dot+text kind mapping ports TT:155–180 (the
 * canon §4-M11 row cites it as this surface's law). Where TT's mock
 * kinds and v2's real kinds differ, each real kind is folded into the
 * nearest TT family below — `shipped` sits in TT's violet "merge"
 * family per §1.1's state-merge boundary (a PR-merged AUDIT row is
 * bookkeeping about a landing).
 */
import type { FeedEventKind } from "@/src/db/schema";

// ── families (TT's EventKind census, kept verbatim) ────────────────────

export const AUDIT_FAMILIES = [
  "sign-in",
  "ticket",
  "brief",
  "dispatch",
  "result",
  "merge",
  "invite",
  "settings",
  "auth",
  "bridge",
  "danger",
] as const;

export type AuditFamily = (typeof AUDIT_FAMILIES)[number];

/** TT:155–180 kindStyle, ported byte-faithful. */
export const FAMILY_STYLE: Record<AuditFamily, { dot: string; text: string }> = {
  "sign-in": { dot: "bg-stone-400", text: "text-stone-600" },
  ticket: { dot: "bg-emerald-500", text: "text-emerald-700" },
  brief: { dot: "bg-amber-500", text: "text-amber-700" },
  dispatch: { dot: "bg-amber-500", text: "text-amber-700" },
  result: { dot: "bg-stone-700", text: "text-stone-800" },
  merge: { dot: "bg-violet-500", text: "text-violet-700" },
  invite: { dot: "bg-sky-500", text: "text-sky-700" },
  settings: { dot: "bg-stone-400", text: "text-stone-600" },
  auth: { dot: "bg-stone-700", text: "text-stone-800" },
  bridge: { dot: "bg-stone-400", text: "text-stone-600" },
  danger: { dot: "bg-rose-500", text: "text-rose-700" },
};

/**
 * Every real feed kind folded into its TT family (exhaustive — a new
 * kind fails typecheck until someone decides its family here).
 */
export const KIND_FAMILY: Record<FeedEventKind, AuditFamily> = {
  filed: "ticket",
  replied: "ticket",
  moved: "ticket",
  linked: "ticket",
  joined: "invite",
  dispatched: "dispatch",
  "ship-requested": "dispatch",
  started: "result",
  "needs-input": "result",
  answered: "result",
  "consult-requested": "result", // ADR-0007 Phase 2 — Athena consult command
  "athena-escalated": "result", // ADR-0007 §6 — Athena handed the decision back
  "review-ready": "result",
  failed: "result",
  cancelled: "result",
  ingested: "result",
  shipped: "merge", // §1.1 state-merge: the audit row is ABOUT the landing
  enriched: "brief",
  "brief-drafted": "brief",
  "project-created": "settings",
  "project-pinned": "settings",
  "project-unpinned": "settings",
  "context-edited": "settings",
  "profile-changed": "settings",
  "bridge-paired": "bridge",
  "doctor-requested": "bridge",
  "doctor-completed": "bridge",
  "bridge-revoked": "danger",
  invited: "invite",
  "invite-revoked": "invite",
  "invite-declined": "invite",
  "member-added": "invite",
  "member-removed": "danger", // TT:144's "Removed Sam from marketing-site"
  "project-linked": "settings", // M18 — clone resolved; bookkeeping → settings family
};

// ── the composed event ─────────────────────────────────────────────────

export type AuditEvent = {
  /** stable cross-source key — "feed-812", "session-<uuid>", "token-<id>-revoked". */
  id: string;
  at: Date;
  family: AuditFamily;
  /** the mono chip — "MEMBER REMOVED", "SIGN IN" (TT:151's kindLabel). */
  kindLabel: string;
  actor: string;
  title: string;
  detail?: string;
  meta?: string;
};

/** newest first; ties broken by id so the order is stable. */
export function sortAuditEvents(events: AuditEvent[]): AuditEvent[] {
  return [...events].sort((a, b) => b.at.getTime() - a.at.getTime() || (a.id < b.id ? 1 : -1));
}

// ── per-source composers (pure — queries.ts feeds them rows) ───────────

export function kindChipLabel(kind: string): string {
  return kind.replace(/-/g, " ").toUpperCase();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export type AuditFeedRow = {
  id: number;
  kind: FeedEventKind;
  actor: string;
  summary: string;
  preview: string | null;
  ticketRef: string | null;
  projectName: string | null;
  createdAt: Date;
};

/**
 * Feed row → audit event. The title leads with the verb (TT:66
 * "Dispatched Job #142" form): capitalized kind word + connector +
 * summary — the same sentence vocabulary the inbox composes from.
 */
export function feedRowToAudit(
  row: AuditFeedRow,
  word: string,
  connector: string | undefined,
): AuditEvent {
  const meta = [row.projectName, row.ticketRef].filter(Boolean).join(" · ");
  return {
    id: `feed-${row.id}`,
    at: row.createdAt,
    family: KIND_FAMILY[row.kind],
    kindLabel: kindChipLabel(row.kind),
    actor: row.actor,
    title: `${capitalize(word)} ${connector ? `${connector} ` : ""}${row.summary}`,
    detail: row.preview ?? undefined,
    meta: meta || undefined,
  };
}

export type AuditSessionRow = {
  id: string;
  createdAt: Date;
  ipAddress: string | null;
  /** already humanized — describeUserAgent() runs in queries.ts. */
  client: string;
  actor: string;
};

export function sessionRowToAudit(row: AuditSessionRow): AuditEvent {
  return {
    id: `session-${row.id}`,
    at: row.createdAt,
    family: "sign-in",
    kindLabel: "SIGN IN",
    actor: row.actor,
    title: `Signed in from ${row.client}`,
    meta: row.ipAddress ?? undefined,
  };
}

export type AuditTokenRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: Date;
  revokedAt: Date | null;
};

/**
 * Token row → derived events. created_at doubles as rotated-at (M10's
 * rotate reuses the row), so the derived title says exactly what the
 * record can prove — "created or last rotated", never a fictional
 * separate rotation history.
 */
export function tokenToAuditEvents(row: AuditTokenRow): AuditEvent[] {
  const meta = `${row.prefix} · scope ${row.scopes.join(" · ")}`;
  const events: AuditEvent[] = [
    {
      id: `token-${row.id}-created`,
      at: row.createdAt,
      family: "auth",
      kindLabel: "TOKEN",
      actor: "you",
      title: `API token "${row.name}" created or last rotated`,
      meta,
    },
  ];
  if (row.revokedAt) {
    events.push({
      id: `token-${row.id}-revoked`,
      at: row.revokedAt,
      family: "danger",
      kindLabel: "TOKEN REVOKED",
      actor: "you",
      title: `API token "${row.name}" revoked`,
      meta,
    });
  }
  return events;
}

// ── filters (TT:182–188 made real) ─────────────────────────────────────

export const AUDIT_FILTERS = ["everything", "security", "work", "settings", "danger"] as const;
export type AuditFilter = (typeof AUDIT_FILTERS)[number];

/** TT's chip copy, vocabulary corrected to v2 (Run, never Job/PR-only). */
export const AUDIT_FILTER_LABEL: Record<AuditFilter, string> = {
  everything: "Everything",
  security: "Just security",
  work: "Just Tickets & Runs",
  settings: "Just settings",
  danger: "Just danger",
};

const FILTER_FAMILIES: Record<Exclude<AuditFilter, "everything">, ReadonlySet<AuditFamily>> = {
  security: new Set(["sign-in", "auth", "invite", "bridge", "danger"]),
  work: new Set(["ticket", "brief", "dispatch", "result", "merge"]),
  settings: new Set(["settings"]),
  danger: new Set(["danger"]),
};

export function matchesFilter(event: AuditEvent, filter: AuditFilter): boolean {
  if (filter === "everything") return true;
  return FILTER_FAMILIES[filter].has(event.family);
}

export function parseAuditFilter(raw: string | undefined): AuditFilter {
  return (AUDIT_FILTERS as readonly string[]).includes(raw ?? "")
    ? (raw as AuditFilter)
    : "everything";
}

// ── search (TT:282 "actor, kind, free-text…") ──────────────────────────

export function matchesQuery(event: AuditEvent, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [event.actor, event.kindLabel, event.title, event.detail, event.meta]
    .filter(Boolean)
    .join("   ")
    .toLowerCase();
  // every space-separated term must hit somewhere ("Priya dispatch may 12")
  return needle.split(/\s+/).every((term) => haystack.includes(term));
}

// ── date ranges (TT:379–385's rail) ────────────────────────────────────

export const AUDIT_RANGES = ["today", "7d", "30d", "90d", "all"] as const;
export type AuditRange = (typeof AUDIT_RANGES)[number];

export const AUDIT_RANGE_LABEL: Record<AuditRange, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

export function rangeStart(range: AuditRange, now: Date): Date | null {
  if (range === "all") return null;
  const d = new Date(now);
  if (range === "today") {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(now.getTime() - days * 86_400_000);
}

export function inRange(event: AuditEvent, range: AuditRange, now: Date): boolean {
  const start = rangeStart(range, now);
  return start === null || event.at >= start;
}

export function parseAuditRange(raw: string | undefined): AuditRange {
  return (AUDIT_RANGES as readonly string[]).includes(raw ?? "") ? (raw as AuditRange) : "30d";
}

// ── day grouping (TT:37's "Today · Tue May 13" headers) ────────────────

export function dayGroupLabel(at: Date, now: Date): string {
  // composed by hand so the stamp matches TT:37's "Tue May 13" (no comma)
  const stamp = `${at.toLocaleDateString("en-US", { weekday: "short" })} ${at.toLocaleDateString(
    "en-US",
    { month: "short" },
  )} ${at.getDate()}`;
  const day = new Date(at);
  day.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diffDays === 0) return `Today · ${stamp}`;
  if (diffDays === 1) return `Yesterday · ${stamp}`;
  return stamp;
}

export type AuditDayGroup = { label: string; events: AuditEvent[] };

/** events must already be sorted newest-first. */
export function groupByDay(events: AuditEvent[], now: Date): AuditDayGroup[] {
  const groups: AuditDayGroup[] = [];
  for (const event of events) {
    const label = dayGroupLabel(event.at, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.events.push(event);
    else groups.push({ label, events: [event] });
  }
  return groups;
}
