/**
 * M8 — integration against the REAL Neon m8-dev DB (PRD testing
 * decisions): the ticket mutations' single-statement write+outbox
 * atomicity (THE OUTBOX RULE) and the work-surface read models.
 * Self-cleaning: every row is created here and deleted in afterAll
 * (marker prefix "IT-M8").
 */
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/src/db/client";
import { feedEvents, projects, ticketLinks, tickets } from "@/src/db/schema";
import {
  addTicketLink,
  applyTicketTransition,
  fileTicket,
} from "@/src/domain/ticket/mutations";
import { relatedTickets, ticketActivity, ticketByRef } from "@/src/domain/ticket/queries";

const MARK = `IT-M8-${Date.now()}`;
let projectId: string;
const createdTicketIds: string[] = [];

beforeAll(async () => {
  const [p] = await db
    .insert(projects)
    // M7 — slug became required when Projects went first-class (integration).
    .values({ name: `${MARK}-project`, slug: MARK.toLowerCase(), pinned: false, seeded: false })
    .returning({ id: projects.id });
  projectId = p.id;
});

afterAll(async () => {
  if (createdTicketIds.length) {
    await db
      .delete(ticketLinks)
      .where(inArray(ticketLinks.blockerId, createdTicketIds));
    await db
      .delete(ticketLinks)
      .where(inArray(ticketLinks.blockedId, createdTicketIds));
    await db
      .delete(feedEvents)
      .where(inArray(feedEvents.ticketId, createdTicketIds));
    await db.delete(tickets).where(inArray(tickets.id, createdTicketIds));
  }
  await db.delete(projects).where(eq(projects.id, projectId));
});

describe("fileTicket — INSERT + `filed` outbox in one statement", () => {
  it("rejects an empty title before touching the DB", async () => {
    const result = await fileTicket({
      projectId,
      title: "   ",
      body: "",
      kind: null,
      priority: "whenever",
      reporter: "it-suite",
    });
    expect(result).toEqual({ ok: false, reason: "empty-title" });
  });

  it("creates the ticket, draws a T-ref from the sequence, and appends `filed`", async () => {
    const result = await fileTicket({
      projectId,
      title: `${MARK} filed ticket`,
      body: "First paragraph.\n\nSecond paragraph.",
      kind: "bug",
      priority: "soon",
      reporter: "it-suite",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    createdTicketIds.push(result.id);
    expect(result.ref).toMatch(/^T-\d+$/);

    const row = await ticketByRef(result.ref);
    expect(row).not.toBeNull();
    expect(row!.state).toBe("triage");
    expect(row!.kind).toBe("bug");
    expect(row!.priority).toBe("soon");
    expect(row!.enrichment).toBeNull(); // honest pending until M9

    const events = await ticketActivity(result.id);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("filed");
    expect(events[0].summary).toBe(`${result.ref} — ${MARK} filed ticket`);
    expect(events[0].ticketRef).toBe(result.ref);
  });
});

describe("applyTicketTransition — conditional claim + `moved` outbox", () => {
  let ticketId: string;
  let ref: string;

  beforeAll(async () => {
    const result = await fileTicket({
      projectId,
      title: `${MARK} transition ticket`,
      body: "",
      kind: null,
      priority: "whenever",
      reporter: "it-suite",
    });
    if (!result.ok) throw new Error("setup filing failed");
    ticketId = result.id;
    ref = result.ref;
    createdTicketIds.push(ticketId);
  });

  it("rejects an illegal transition before touching the DB", async () => {
    const result = await applyTicketTransition({
      ticketId,
      from: "triage",
      to: "shipped",
      actor: "it-suite",
    });
    expect(result).toEqual({ ok: false, reason: "illegal-transition" });
  });

  it("loses cleanly when the claimed `from` state is stale", async () => {
    const result = await applyTicketTransition({
      ticketId,
      from: "backlog", // actually in triage
      to: "approved",
      actor: "it-suite",
    });
    expect(result).toEqual({ ok: false, reason: "not-claimed" });
    // and no stray outbox row was written
    const events = await ticketActivity(ticketId);
    expect(events.filter((e) => e.kind === "moved")).toHaveLength(0);
  });

  it("flips state AND appends `moved` (with the note as preview) atomically", async () => {
    const result = await applyTicketTransition({
      ticketId,
      from: "triage",
      to: "needs-info",
      actor: "it-suite",
      note: "Which screens exactly?",
    });
    expect(result.ok).toBe(true);

    const row = await ticketByRef(ref);
    expect(row!.state).toBe("needs-info");

    const events = await ticketActivity(ticketId);
    const moved = events.filter((e) => e.kind === "moved");
    expect(moved).toHaveLength(1);
    expect(moved[0].preview).toBe("Which screens exactly?");
    expect(moved[0].payload).toMatchObject({
      from: "triage",
      to: "needs-info",
      note: "Which screens exactly?",
    });
    if (result.ok) expect(moved[0].id).toBe(result.feedEventId);
  });

  it("a lost race leaves exactly one winner (double-fire same claim)", async () => {
    // ticket is in needs-info; both racers claim needs-info → approved.
    const [a, b] = await Promise.all([
      applyTicketTransition({ ticketId, from: "needs-info", to: "approved", actor: "a" }),
      applyTicketTransition({ ticketId, from: "needs-info", to: "approved", actor: "b" }),
    ]);
    const oks = [a, b].filter((r) => r.ok);
    expect(oks).toHaveLength(1);
    const row = await ticketByRef(ref);
    expect(row!.state).toBe("approved");
  });
});

describe("addTicketLink — edge + `linked` outbox; related reads", () => {
  let blockerId: string;
  let blockedId: string;
  let blockerRef: string;
  let blockedRef: string;

  beforeAll(async () => {
    const blocker = await fileTicket({
      projectId,
      title: `${MARK} blocker ticket`,
      body: "",
      kind: null,
      priority: "whenever",
      reporter: "it-suite",
    });
    const blocked = await fileTicket({
      projectId,
      title: `${MARK} blocked ticket`,
      body: "",
      kind: null,
      priority: "whenever",
      reporter: "it-suite",
    });
    if (!blocker.ok || !blocked.ok) throw new Error("setup filing failed");
    blockerId = blocker.id;
    blockedId = blocked.id;
    blockerRef = blocker.ref;
    blockedRef = blocked.ref;
    createdTicketIds.push(blockerId, blockedId);
  });

  it("unknown ref / self link are rejected without rows", async () => {
    expect(
      await addTicketLink({
        ticketId: blockedId,
        otherRef: "T-999999",
        direction: "blocked-by",
        actor: "it-suite",
      }),
    ).toEqual({ ok: false, reason: "unknown-ref" });
    expect(
      await addTicketLink({
        ticketId: blockedId,
        otherRef: blockedRef,
        direction: "blocked-by",
        actor: "it-suite",
      }),
    ).toEqual({ ok: false, reason: "self-link" });
  });

  it("declares the edge + appends `linked`; duplicates are idempotent", async () => {
    const first = await addTicketLink({
      ticketId: blockedId,
      otherRef: blockerRef,
      direction: "blocked-by",
      actor: "it-suite",
    });
    expect(first.ok).toBe(true);

    // duplicate (same edge, declared from the other side) writes nothing
    const dup = await addTicketLink({
      ticketId: blockerId,
      otherRef: blockedRef,
      direction: "blocks",
      actor: "it-suite",
    });
    expect(dup).toEqual({ ok: false, reason: "duplicate" });

    const linkedEvents = (await ticketActivity(blockedId)).filter(
      (e) => e.kind === "linked",
    );
    expect(linkedEvents).toHaveLength(1);
    expect(linkedEvents[0].payload).toMatchObject({
      direction: "blocked-by",
      otherRef: blockerRef,
    });
  });

  it("relatedTickets reads the edge from both sides with the right relation", async () => {
    const fromBlocked = await relatedTickets(blockedId);
    expect(fromBlocked).toHaveLength(1);
    expect(fromBlocked[0].ref).toBe(blockerRef);
    expect(fromBlocked[0].relation).toBe("blocks"); // the other ticket blocks this page

    const fromBlocker = await relatedTickets(blockerId);
    expect(fromBlocker).toHaveLength(1);
    expect(fromBlocker[0].ref).toBe(blockedRef);
    expect(fromBlocker[0].relation).toBe("blocked-by"); // the other is blocked by this page
  });
});
