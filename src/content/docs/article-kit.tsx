/**
 * M14 — building blocks shared by every doc-article body. The recipes are
 * variant HH's article anatomy (fidelity protocol §5):
 *  - DocSection — HH:83–103 (anchored section: mono-section h2 over
 *    `mt-5 space-y-4 text-base text-stone-700 leading-relaxed` prose)
 *  - Term — HH:142–145 (`font-semibold text-stone-900` glossary word)
 *  - PathBox / PathArrow — HH:374–391 (the dispatch-path figure boxes)
 * Surface-level shared markup (the M9 `src/components/run/` precedent),
 * not kit primitives.
 */

export function DocSection({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-16">
      <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">{label}</h2>
      <div className="mt-5 space-y-4 text-base text-stone-700 leading-relaxed">{children}</div>
    </section>
  );
}

/** a defined glossary word, HH:142-style. */
export function Term({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-stone-900">{children}</span>;
}

export function PathBox({
  label,
  sub,
  active,
}: {
  label: string;
  sub: string;
  active?: boolean;
}) {
  return (
    <div
      className={`px-3 py-2 border rounded-md min-w-[110px] text-center ${
        active ? "border-amber-400 bg-amber-50" : "border-stone-300"
      }`}
    >
      <div className="text-sm font-semibold text-stone-900">{label}</div>
      <div className="mt-0.5 font-mono text-[9px] text-stone-500">{sub}</div>
    </div>
  );
}

export function PathArrow() {
  return <span className="font-mono text-stone-400">→</span>;
}
