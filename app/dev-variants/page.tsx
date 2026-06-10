// M3 — /dev-variants index. Dev-only design-lab surface (not a product
// page); clean rewrite of the v1.3 pattern (read: atlas/app/dev-variants/
// page.tsx, T120). Gated via ATLAS_DEV_VARIANTS_ENABLED=1.
import Link from "next/link";
import { notFound } from "next/navigation";

import { devVariantsEnabled, VARIANTS } from "./_registry";

export const dynamic = "force-dynamic";

export default function DevVariantsIndex() {
  if (!devVariantsEnabled()) {
    notFound();
  }
  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
        Atlas · design lab
      </div>
      <h1 className="mt-2 text-5xl font-bold tracking-tighter">
        Variants<span className="text-amber-500">.</span>
      </h1>
      <p className="mt-8 max-w-2xl text-xl text-stone-700 leading-relaxed">
        The {VARIANTS.length} vendored prototypes — the design source of
        truth, rendered live for side-by-side fidelity work.
      </p>

      <section className="mt-16 max-w-2xl">
        <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
          <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
            All variants
          </h2>
          <span className="font-mono text-xs text-stone-400">
            {VARIANTS.length}
          </span>
        </div>
        <ul className="divide-y divide-stone-200">
          {VARIANTS.map((v) => (
            <li key={v.key}>
              <Link
                href={`/dev-variants/${v.key}`}
                className="group grid grid-cols-[40px_1fr_auto] items-baseline gap-4 py-5"
              >
                <span className="font-mono text-xs uppercase tracking-widest text-stone-400">
                  {v.key}
                </span>
                <span className="text-lg tracking-tight text-stone-900">
                  {v.name}
                </span>
                <span className="font-mono text-xs text-stone-400 group-hover:text-stone-900 transition">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-12 border-t border-stone-200 pt-5 text-sm italic text-stone-500">
          Vendored byte-identical from the prototype gallery — the canon
          cites these files by line. Never edit them.
        </p>
      </section>
    </main>
  );
}
