// M4 — render-level assertions for the kit's logic-bearing components:
// the §3.3 pulse rules as they land in real markup (kanban-calm on
// KanbanCard, needs-input monopoly in ListRow) and §2.17 EmptyState
// shape selection. Server-rendered via react-dom/server (the variants
// proved everything server-renderable).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DividedList, ListRow } from "../src/components/kit/DividedList";
import { EmptyState } from "../src/components/kit/EmptyState";
import { KanbanCard } from "../src/components/kit/KanbanCard";
import { RunStateDot } from "../src/components/kit/StateDot";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("KanbanCard — §3.3 kanban-calm rule", () => {
  const base = {
    id: "T-275",
    title: "T70 sidebar prototype",
    kind: "enhancement" as const,
    reporter: "you",
    age: "1h",
  };

  it("a running card never pulses on the board", () => {
    const out = html(createElement(KanbanCard, { ...base, state: "running" }));
    expect(out).not.toContain("animate-ping");
    expect(out).toContain("bg-stone-700"); // running stays stone, not amber
  });

  it("needs-input keeps its motion monopoly on the board", () => {
    const out = html(createElement(KanbanCard, { ...base, state: "needs-input" }));
    expect(out).toContain("animate-ping");
    expect(out).toContain("bg-amber-500");
  });

  it("card chrome is the lightened E2 form — rounded-lg, no shadow", () => {
    const out = html(createElement(KanbanCard, { ...base, state: "queued" }));
    expect(out).toContain("rounded-lg");
    expect(out).not.toContain("shadow");
  });
});

describe("ListRow — §3.3 in list context", () => {
  it("running renders static stone-700 in lists (E10)", () => {
    const out = html(
      createElement(
        DividedList,
        null,
        createElement(ListRow, { title: "row", state: "running" }),
      ),
    );
    expect(out).not.toContain("animate-ping");
    expect(out).toContain("bg-stone-700");
  });

  it("needs-input is the only amber pulse in any list", () => {
    const out = html(
      createElement(
        DividedList,
        null,
        createElement(ListRow, { title: "row", state: "needs-input" }),
      ),
    );
    expect(out).toContain("animate-ping");
  });

  it("capped form carries the §3.5 fade-mask recipe", () => {
    const out = html(createElement(DividedList, { capped: true }));
    expect(out).toContain("max-h-[440px]");
    expect(out).toContain("mask-image");
  });
});

describe("RunStateDot — live context", () => {
  it("running pulses on live surfaces", () => {
    const out = html(createElement(RunStateDot, { state: "running", context: "live" }));
    expect(out).toContain("animate-ping");
  });
});

describe("EmptyState — §2.17 shape selection", () => {
  it("page shape keeps day-stamp + title + sentence", () => {
    const out = html(
      createElement(EmptyState, {
        shape: "page",
        dayStamp: "Tuesday · May 13",
        title: "Today.",
        sentence: "No Projects yet.",
      }),
    );
    expect(out).toContain("Tuesday · May 13");
    expect(out).toContain("Today.");
    expect(out).toContain("text-3xl");
  });

  it("column shape is the centered mono note + italic good news", () => {
    const out = html(
      createElement(EmptyState, {
        shape: "column",
        goodNews: "That's a good thing.",
      }),
    );
    expect(out).toContain("Nothing here.");
    expect(out).toContain("italic");
    expect(out).toContain("text-center");
  });

  it("strip shape is one italic sentence", () => {
    const out = html(
      createElement(EmptyState, { shape: "strip" }, "No pinned Projects."),
    );
    expect(out).toContain("italic");
    expect(out).toContain("No pinned Projects.");
  });

  it("palette shape quotes the query in a stone-100 chip", () => {
    const out = html(createElement(EmptyState, { shape: "palette", query: "foobar" }));
    expect(out).toContain("Nothing matches");
    expect(out).toContain("foobar");
    expect(out).toContain("bg-stone-100");
  });

  it("no exclamation marks in any default copy (II:261)", () => {
    const out = html(createElement(EmptyState, { shape: "column" }));
    expect(out).not.toContain("!");
  });
});
