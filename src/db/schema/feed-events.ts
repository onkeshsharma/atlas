/**
 * M6 — feed_events: the append-only activity record AND the live outbox.
 *
 * One table serves three surfaces (inbox Z, Today's activity rail
 * E:389–441, the presence/digest aggregates) and the Live-protocol seam:
 * the bigserial id is a monotonic cursor the SSE broker polls
 * (docs/adr/0001-live-transport.md). Run transitions append here in the
 * SAME statement that flips the run row (transactional outbox —
 * src/domain/run/transitions.ts), so a delivered cursor can never have
 * missed an event.
 *
 * Kind vocabulary lives in src/domain/feed/kinds.ts with its verb map.
 */
import {
  bigserial,
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { projects } from "./projects";
import { runs } from "./runs";
import { tickets } from "./tickets";

export const feedEventKind = pgEnum("feed_event_kind", [
  "filed", //        a Ticket was filed
  "replied", //      someone replied on a Ticket
  "moved", //        a Ticket moved state (triage → backlog etc.)
  "joined", //       a Collaborator joined
  "dispatched", //   a Run was created (queued)
  "started", //      a Run began executing
  "needs-input", //  a Run blocked on a question (§3.3 — outranks everything)
  "answered", //     the Owner answered; Run resumed
  "review-ready", // a Run finished and awaits review
  "shipped", //      code landed
  "failed", //       a Run failed
  "cancelled", //    a Run was cancelled
  // M7 — Project-curation kinds (appended; pg enums only ADD VALUE at
  // the end). Every Project mutation appends one of these so open
  // cockpits stay live (the outbox rule — see src/domain/project/).
  "project-created", // a Project was added (R's flow)
  "project-pinned", //   the Owner pinned a Project (PRD #32)
  "project-unpinned", // the Owner unpinned a Project
  "context-edited", //   a Context term was added/dismissed (PRD #31)
  // M8 — appended after M7's values (integration order: 0002 then 0003).
  "linked", //       M8: a blocks/blocked-by edge was declared (PRD #16)
  // M9 — Helper-Run deliverables (appended in 0004). Each lands in the
  // SAME single statement as its durable write (THE OUTBOX RULE):
  "enriched", //      tickets.enrichment written (PRD #17)
  "brief-drafted", // a Brief row landed for a Ticket (PRD #19)
  "ingested", //      projects.ingest_summary written, status → ready (PRD #29)
  // M9 Session B — appended in 0005. The Owner's approve-and-ship click
  // (KK's emerald CTA, PRD #25). The row IS the daemon's `run-ship`
  // command (ADR-0002 §2); `shipped`/`failed` land when the merge does.
  "ship-requested",
  // M10 — appended in 0006. Bridge governance (PRD #33–#34). Heartbeats
  // stay OUT of the outbox (M9A decision 8 — chrome, not history);
  // pairing, revocation and the doctor round-trip are Owner actions and
  // honest history. The `doctor-requested` row doubles as the daemon's
  // `bridge-doctor` command (the ship-requested idiom; payload carries
  // the target bridge id + preflight inputs).
  "bridge-paired", //     a Bridge was paired / its token rotated
  "bridge-revoked", //    the Owner revoked a Bridge's token
  "doctor-requested", //  the Owner asked a Bridge to run preflight
  "doctor-completed", //  the daemon posted its doctor verdict
  // M11 — appended in 0008. People & access (PRD #37–#39): every
  // invite / membership / roster / profile mutation lands its feed row
  // in the SAME statement as the durable write (THE OUTBOX RULE), so
  // open cockpits stay live and the audit log (TT) reads a real record.
  // `joined` (M6) remains the acceptance kind; these cover the rest:
  "invited", //          the Owner issued an invite (PRD #37)
  "invite-revoked", //   the Owner withdrew a pending invite
  "invite-declined", //  the invitee said "no thanks" (U:156)
  "member-added", //     a roster row landed — project access granted (PRD #38)
  "member-removed", //   access removed (payload.scope: project | instance)
  "profile-changed", //  an identity field changed (M10's closing note)
]);

export const feedEvents = pgTable("feed_events", {
  /** monotonic cursor for the live seam — never reuse, never reorder. */
  id: bigserial("id", { mode: "number" }).primaryKey(),
  kind: feedEventKind("kind").notNull(),
  /** display actor — "Engine", "ada", "you". */
  actor: text("actor").notNull(),
  /** the post-verb phrase — "T-249 — Add JSON export endpoint". */
  summary: text("summary").notNull(),
  /** optional italic quote line (Z:264–269). */
  preview: text("preview"),
  projectId: uuid("project_id").references(() => projects.id),
  ticketId: uuid("ticket_id").references(() => tickets.id),
  runId: uuid("run_id").references(() => runs.id),
  /** display ref — "T-249" (Z meta line) without a join. */
  ticketRef: text("ticket_ref"),
  /** structured event payload — run transitions store { from, to, question?, answer? }. */
  payload: jsonb("payload"),
  /**
   * inbox read-marker. Instance-level (not per-user): exactly one Owner
   * per Atlas; per-user read state is a Collaborator-inbox concern (M13).
   */
  readAt: timestamp("read_at", { withTimezone: true }),
  seeded: boolean("seeded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FeedEvent = typeof feedEvents.$inferSelect;
export type FeedEventKind = FeedEvent["kind"];
