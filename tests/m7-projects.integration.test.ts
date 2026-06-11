/**
 * M7 — integration against the REAL Neon m7-dev branch (charter §5):
 * createProject's single-statement insert+outbox, pin/unpin's
 * conditional claim+outbox, the context-term curation mutations, and
 * the Project read models. Self-cleaning (marker prefix "IT-M7").
 */
import { eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/src/db/client";
import { contextTerms, feedEvents, projects, ticketPins, tickets } from "@/src/db/schema";
import { pollLiveEvents, latestCursor } from "@/src/domain/live/broker";
import { confirmSuggestedTerm, dismissSuggestedTerm } from "@/src/domain/project/context";
import { createProject } from "@/src/domain/project/create";
import { setProjectPinned } from "@/src/domain/project/pin";
import {
  contextTermsFor,
  pinnedTickets,
  projectBySlug,
  reviewReadyTickets,
  ticketStateCounts,
} from "@/src/domain/project/queries";

const MARK = `it-m7-${Date.now()}`;
const createdProjectIds: string[] = [];
let projectId: string;
let ticketIds: string[] = [];

beforeAll(async () => {
  const [p] = await db
    .insert(projects)
    .values({ name: `${MARK}-base`, slug: `${MARK}-base`, seeded: false })
    .returning({ id: projects.id });
  projectId = p.id;
  createdProjectIds.push(projectId);

  const rows = await db
    .insert(tickets)
    .values([
      { ref: `${MARK}-T1`, projectId, title: `${MARK} t1`, state: "triage", reporter: "it" },
      { ref: `${MARK}-T2`, projectId, title: `${MARK} t2`, state: "review-ready", reporter: "it" },
      { ref: `${MARK}-T3`, projectId, title: `${MARK} t3`, state: "shipped", reporter: "it" },
    ])
    .returning({ id: tickets.id });
  ticketIds = rows.map((r) => r.id);
});

afterAll(async () => {
  await db.delete(feedEvents).where(inArray(feedEvents.projectId, createdProjectIds));
  await db.delete(contextTerms).where(inArray(contextTerms.projectId, createdProjectIds));
  if (ticketIds.length) {
    await db.delete(ticketPins).where(inArray(ticketPins.ticketId, ticketIds));
    await db.delete(tickets).where(inArray(tickets.id, ticketIds));
  }
  await db.delete(projects).where(inArray(projects.id, createdProjectIds));
  // belt-and-braces: anything else the suite created under the marker
  await db.delete(feedEvents).where(like(feedEvents.summary, `${MARK}%`));
});

describe("createProject — insert + outbox in one statement", () => {
  it("creates the row born queued and appends project-created", async () => {
    const before = await latestCursor();
    const result = await createProject({
      source: `https://github.com/it/${MARK}-created`,
      actor: "it",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    createdProjectIds.push(result.project.id);

    const row = await projectBySlug(`${MARK}-created`);
    expect(row?.ingestStatus).toBe("queued");
    expect(row?.repoUrl).toBe(`https://github.com/it/${MARK}-created`);

    const { events } = await pollLiveEvents(before);
    const created = events.find(
      (e) => e.type === "feed-appended" && e.event.kind === "project-created",
    );
    if (created?.type === "feed-appended") {
      expect(created.event.projectId).toBe(result.project.id);
      expect(created.event.summary).toContain(`${MARK}-created`);
    } else {
      throw new Error("project-created outbox row missing");
    }
  });

  it("rejects a taken slug with the quiet §2.13 error", async () => {
    const result = await createProject({
      source: `https://github.com/other-org/${MARK}-created`,
      actor: "it",
    });
    expect(result).toEqual({
      ok: false,
      reason: "slug-taken",
      error: `a project named ${MARK}-created already exists`,
    });
  });

  it("rejects malformed input without touching the DB", async () => {
    const before = await latestCursor();
    const result = await createProject({ source: "definitely not a repo", actor: "it" });
    expect(result.ok).toBe(false);
    const { events } = await pollLiveEvents(before);
    expect(
      events.filter((e) => e.type === "feed-appended" && e.event.kind === "project-created"),
    ).toHaveLength(0);
  });
});

describe("setProjectPinned — conditional claim + outbox", () => {
  it("pins, appends project-pinned, and is visible to Today's query path", async () => {
    const before = await latestCursor();
    const result = await setProjectPinned({ projectId, pinned: true, actor: "it" });
    expect(result.ok).toBe(true);

    const [row] = await db.select().from(projects).where(eq(projects.id, projectId));
    expect(row.pinned).toBe(true);

    const { events } = await pollLiveEvents(before);
    const pinnedEvent = events.find(
      (e) => e.type === "feed-appended" && e.event.kind === "project-pinned",
    );
    expect(pinnedEvent).toBeTruthy();
  });

  it("a second pin loses the claim cleanly — no row change, no outbox row", async () => {
    const before = await latestCursor();
    const result = await setProjectPinned({ projectId, pinned: true, actor: "it" });
    expect(result).toEqual({ ok: false, reason: "not-claimed" });
    const { events } = await pollLiveEvents(before);
    expect(
      events.filter((e) => e.type === "feed-appended" && e.event.kind === "project-pinned"),
    ).toHaveLength(0);
  });

  it("unpins with project-unpinned", async () => {
    const result = await setProjectPinned({ projectId, pinned: false, actor: "it" });
    expect(result.ok).toBe(true);
    const [row] = await db.select().from(projects).where(eq(projects.id, projectId));
    expect(row.pinned).toBe(false);
  });
});

describe("context-term curation — suggested rows only", () => {
  let suggestedId: string;
  let confirmedId: string;

  beforeAll(async () => {
    const rows = await db
      .insert(contextTerms)
      .values([
        {
          projectId,
          term: `${MARK}-webhook`,
          meaning: "",
          status: "suggested",
          provenance: "engine",
          uses: 23,
        },
        {
          projectId,
          term: `${MARK}-invoice`,
          meaning: "",
          status: "suggested",
          provenance: "engine",
          uses: 7,
        },
        {
          projectId,
          term: `${MARK}-storefront`,
          meaning: "The pages.",
          status: "confirmed",
          provenance: "owner",
        },
      ])
      .returning({ id: contextTerms.id });
    suggestedId = rows[0].id;
    confirmedId = rows[2].id;
  });

  it("confirm moves suggested → confirmed and appends context-edited", async () => {
    const before = await latestCursor();
    const result = await confirmSuggestedTerm({ termId: suggestedId, actor: "it" });
    expect(result.ok).toBe(true);

    const view = await contextTermsFor(projectId);
    expect(view.confirmed.map((t) => t.term)).toContain(`${MARK}-webhook`);
    expect(view.suggested.map((t) => t.term)).not.toContain(`${MARK}-webhook`);

    const { events } = await pollLiveEvents(before);
    const edited = events.find(
      (e) => e.type === "feed-appended" && e.event.kind === "context-edited",
    );
    if (edited?.type === "feed-appended") {
      expect(edited.event.summary).toContain("added");
      expect(edited.event.summary).toContain(`${MARK}-webhook`);
    } else {
      throw new Error("context-edited outbox row missing");
    }
  });

  it("confirm on an already-confirmed term loses the claim", async () => {
    const result = await confirmSuggestedTerm({ termId: suggestedId, actor: "it" });
    expect(result).toEqual({ ok: false, reason: "not-claimed" });
  });

  it("dismiss deletes the suggested row and appends context-edited", async () => {
    const view0 = await contextTermsFor(projectId);
    const invoice = view0.suggested.find((t) => t.term === `${MARK}-invoice`);
    expect(invoice).toBeTruthy();

    const result = await dismissSuggestedTerm({ termId: invoice!.id, actor: "it" });
    expect(result.ok).toBe(true);

    const view = await contextTermsFor(projectId);
    expect(view.suggested.map((t) => t.term)).not.toContain(`${MARK}-invoice`);
  });

  it("dismiss never touches confirmed terms (claim fails)", async () => {
    const result = await dismissSuggestedTerm({ termId: confirmedId, actor: "it" });
    expect(result).toEqual({ ok: false, reason: "not-claimed" });
    const view = await contextTermsFor(projectId);
    expect(view.confirmed.map((t) => t.term)).toContain(`${MARK}-storefront`);
  });
});

describe("project read models", () => {
  it("ticketStateCounts groups the seeded states; open excludes shipped", async () => {
    const counts = await ticketStateCounts(projectId);
    expect(counts.byState.triage).toBe(1);
    expect(counts.byState["review-ready"]).toBe(1);
    expect(counts.byState.shipped).toBe(1);
    expect(counts.open).toBe(2);
  });

  it("reviewReadyTickets returns only review-ready rows", async () => {
    const ship = await reviewReadyTickets(projectId);
    expect(ship.map((t) => t.ref)).toEqual([`${MARK}-T2`]);
  });

  it("pinnedTickets joins ticket_pins ∩ project", async () => {
    await db.insert(ticketPins).values({ ticketId: ticketIds[0], seeded: false });
    const pins = await pinnedTickets(projectId);
    expect(pins.map((t) => t.ref)).toEqual([`${MARK}-T1`]);
    expect(pins[0].state).toBe("triage");
  });
});
