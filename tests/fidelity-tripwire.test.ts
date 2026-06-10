// M3 — unit coverage for the canon §1 tripwire rules.
import { describe, expect, it } from "vitest";

// Plain .mjs module — intentionally untyped (script, not app code).
import { checkClassString, checkSource } from "../scripts/fidelity-tripwire.mjs";

type Hit = { rule: string; canon: string; message: string };
const rulesHit = (cls: string) =>
  (checkClassString(cls) as Hit[]).map((h) => h.rule);

describe("canon §1 invariants", () => {
  it("passes canonical recipes untouched", () => {
    // §2.1 sidebar, §2.4 FeaturedCard, §2.9 primary pill, §2.6 dot, §3.2 underline
    const canonical = [
      "w-[56px] shrink-0 sticky top-0 h-screen border-r border-stone-200/60",
      "rounded-2xl bg-white/70 border border-stone-200/80 p-5",
      "rounded-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-2",
      "h-1.5 w-1.5 rounded-full bg-emerald-500",
      "absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-3 bg-amber-500",
      "grid grid-cols-[1fr_360px] gap-16",
      "grid-cols-[200px_1fr_360px]",
      "rounded-2xl bg-white border border-stone-200 shadow-2xl overflow-hidden",
    ];
    for (const cls of canonical) {
      expect(checkClassString(cls), cls).toEqual([]);
    }
  });

  it("flags off-scale rail widths", () => {
    expect(rulesHit("w-[300px] shrink-0")).toContain("rail-width");
    expect(rulesHit("grid grid-cols-[1fr_300px]")).toContain("rail-width");
    expect(rulesHit("w-[320px]")).toEqual([]);
    // sanctioned small gutters are not rails (§2.3 / §2.16 / §4-M14)
    expect(rulesHit("grid grid-cols-[40px_1fr] gap-6")).toEqual([]);
    expect(rulesHit("grid grid-cols-[120px_1fr]")).toEqual([]);
  });

  it("flags rounded-3xl and arbitrary radii (ledger E8)", () => {
    expect(rulesHit("rounded-3xl bg-white p-6")).toContain("radius-scale");
    expect(rulesHit("rounded-[20px]")).toContain("radius-scale");
  });

  it("flags off-scale shadows and shadows on kanban-weight cards", () => {
    expect(rulesHit("shadow-xl rounded-2xl")).toContain("shadow-scale");
    expect(rulesHit("rounded-lg border border-stone-200 shadow-sm")).toContain(
      "shadow-scale",
    );
  });

  it("flags off-family underline bars", () => {
    expect(rulesHit("h-[2px] w-6 bg-stone-400")).toContain(
      "underline-geometry",
    );
    expect(rulesHit("h-[3px] bg-amber-500")).toEqual([]);
    expect(rulesHit("h-[2px] w-8 bg-rose-500")).toEqual([]);
  });

  it("flags off-scale dots", () => {
    expect(rulesHit("h-3 w-3 rounded-full bg-amber-500")).toContain(
      "dot-size",
    );
    expect(rulesHit("h-2.5 w-2.5 rounded-full bg-emerald-500")).toEqual([]);
    // avatars/profile marks are not dots
    expect(rulesHit("h-28 w-28 rounded-full bg-stone-900")).toEqual([]);
  });

  it("flags off-palette color families", () => {
    for (const cls of [
      "text-slate-500",
      "bg-gray-100",
      "border-zinc-200",
      "text-blue-600",
      "divide-neutral-200",
    ]) {
      expect(rulesHit(cls), cls).toContain("off-palette");
    }
    expect(rulesHit("text-stone-500 bg-amber-50/30 border-sky-500")).toEqual(
      [],
    );
  });

  it("flags non-mono filled pill buttons (ledger E1)", () => {
    expect(
      rulesHit("rounded-full bg-stone-900 text-stone-50 px-4 py-2 text-xs"),
    ).toContain("mono-buttons");
    expect(
      rulesHit(
        "rounded-full font-mono bg-emerald-600 hover:bg-emerald-700 text-stone-50 px-4 py-2",
      ),
    ).toEqual([]);
  });

  it("reports file + line via checkSource", () => {
    const src = `export function Bad() {\n  return <div className="rounded-3xl text-slate-500" />;\n}\n`;
    const hits = checkSource(src, "app/bad.tsx") as Array<
      Hit & { file: string; line: number }
    >;
    expect(hits).toHaveLength(2);
    expect(hits[0]).toMatchObject({ file: "app/bad.tsx", line: 2 });
  });
});
