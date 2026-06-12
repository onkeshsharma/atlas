/**
 * M12 — search query module against the REAL Neon m12-dev DB (charter
 * item 1: "real-Neon integration for the query paths"). Self-cleaning:
 * every row is created here with the IT-M12 marker and deleted in
 * afterAll.
 */
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/src/db/client";
import { contextTerms, projects, runs, tickets } from "@/src/db/schema";
import { searchContent, searchPalette } from "@/src/domain/search/query";

const MARK = `IT-M12-${Date.now()}`;
let projectId: string;
let ticketAId: string;
const cleanup = { tickets: [] as string[], runs: [] as string[], terms: [] as string[] };

beforeAll(async () => {
  const [p] = await db
    .insert(projects)
    .values({
      name: `${MARK}-glasswing`,
      slug: MARK.toLowerCase(),
      description: "A search-corpus fixture about glasswing butterflies.",
      pinned: false,
      seeded: false,
    })
    .returning({ id: projects.id });
  projectId = p.id;

  const ticketRows = await db
    .insert(tickets)
    .values([
      {
        ref: `${MARK}-T1`,
        projectId,
        title: "Glasswing export endpoint",
        body: "The glasswing catalogue should export as CSV with wing-span metadata.",
        state: "review-ready",
        reporter: "it-suite",
        updatedAt: new Date(),
      },
      {
        ref: `${MARK}-T2`,
        projectId,
        // same match tier as T1 (title prefix) so recency is the tiebreak.
        title: "Glasswing fixtures cleanup",
        body: "Remove the deprecated glasswing fixtures.",
        state: "backlog",
        reporter: "it-suite",
        updatedAt: new Date(Date.now() - 86_400_000),
      },
    ])
    .returning({ id: tickets.id });
  cleanup.tickets = ticketRows.map((t) => t.id);
  ticketAId = ticketRows[0].id;

  const [run] = await db
    .insert(runs)
    .values({
      ref: `${MARK}-R1`,
      projectId,
      ticketId: ticketAId,
      title: "Glasswing export endpoint",
      state: "review-ready",
      seeded: false,
    })
    .returning({ id: runs.id });
  cleanup.runs = [run.id];

  const [term] = await db
    .insert(contextTerms)
    .values({
      projectId,
      term: `${MARK}-Glasswing`,
      meaning: "The translucent-winged butterfly the fixture project is named for.",
      status: "confirmed",
      provenance: "owner",
      seeded: false,
    })
    .returning({ id: contextTerms.id });
  cleanup.terms = [term.id];
});

afterAll(async () => {
  await db.delete(contextTerms).where(inArray(contextTerms.id, cleanup.terms));
  await db.delete(runs).where(inArray(runs.id, cleanup.runs));
  await db.delete(tickets).where(inArray(tickets.id, cleanup.tickets));
  await db.delete(projects).where(eq(projects.id, projectId));
});

describe("searchContent — the /search corpora over real rows", () => {
  it("finds tickets, runs, the project, and the context term for one query", async () => {
    const res = await searchContent("glasswing");
    const types = res.groups.map((g) => g.type);
    expect(types).toContain("ticket");
    expect(types).toContain("run");
    expect(types).toContain("project");
    expect(types).toContain("context-term");

    const ticketGroup = res.groups.find((g) => g.type === "ticket")!;
    expect(ticketGroup.items.some((i) => i.title === "Glasswing export endpoint")).toBe(true);
    const runGroup = res.groups.find((g) => g.type === "run")!;
    expect(runGroup.items[0].href).toBe(`/runs/${MARK}-R1`);
  });

  it("an exact ref query puts THAT ticket first overall", async () => {
    const res = await searchContent(`${MARK}-T2`);
    expect(res.groups[0].type).toBe("ticket");
    expect(res.groups[0].items[0].href).toBe(`/tickets/${MARK}-T2`);
  });

  it("recency orders same-tier ticket hits (newer first)", async () => {
    const res = await searchContent("glasswing");
    const ticketGroup = res.groups.find((g) => g.type === "ticket")!;
    const mine = ticketGroup.items.filter((i) => i.href.includes(MARK));
    expect(mine.map((i) => i.title)).toEqual([
      "Glasswing export endpoint",
      "Glasswing fixtures cleanup",
    ]);
  });

  it("body matches carry an LL snippet around the hit", async () => {
    const res = await searchContent("wing-span");
    const ticketGroup = res.groups.find((g) => g.type === "ticket")!;
    const hit = ticketGroup.items.find((i) => i.href === `/tickets/${MARK}-T1`)!;
    expect(hit.snippet).toBeDefined();
    expect(hit.snippet!).toContain("wing-span");
  });

  it("scope narrows to one corpus (the §2.13 chips' contract)", async () => {
    const res = await searchContent("glasswing", { scope: "project" });
    expect(res.groups).toHaveLength(1);
    expect(res.groups[0].type).toBe("project");
    expect(res.groups[0].items[0].meta).toMatch(/^\d+ open tickets?/);
  });

  it("ILIKE wildcards in the query stay literal (no accidental match-all)", async () => {
    const res = await searchContent("%");
    // no fixture row contains a literal "%" — only unrelated rows could.
    for (const g of res.groups) {
      for (const i of g.items) {
        expect(`${i.title} ${i.snippet ?? ""}`).toContain("%");
      }
    }
  });

  it("empty query answers honestly empty", async () => {
    const res = await searchContent("   ");
    expect(res.groups).toEqual([]);
    expect(res.total).toBe(0);
  });

  it("docs ride the same response (static registry corpus)", async () => {
    const res = await searchContent("bridge");
    const docGroup = res.groups.find((g) => g.type === "doc");
    expect(docGroup).toBeDefined();
    expect(docGroup!.items.some((i) => i.href === "/docs/the-bridge-and-the-engine")).toBe(true);
  });
});

describe("searchPalette — the ⌘K read", () => {
  it("empty query returns the UU default sections", async () => {
    const res = await searchPalette("");
    const labels = res.groups.map((g) => g.label);
    expect(labels).toContain("Projects");
    expect(labels).toContain("Actions");
    expect(labels).toContain("Pages");
    expect(labels).toContain("Recent Tickets");
    // every Pages row is a real route
    const pages = res.groups.find((g) => g.label === "Pages")!;
    expect(pages.items.map((i) => i.href)).toContain("/today");
  });

  it("a typed query folds content + actions + pages, capped per group", async () => {
    const res = await searchPalette("glasswing");
    for (const g of res.groups) expect(g.items.length).toBeLessThanOrEqual(5);
    expect(res.groups.some((g) => g.type === "ticket")).toBe(true);
  });

  it("page navigation matches by name ('settings' finds /settings)", async () => {
    const res = await searchPalette("settings");
    const pages = res.groups.find((g) => g.label === "Pages");
    expect(pages?.items.some((i) => i.href === "/settings")).toBe(true);
  });
});
