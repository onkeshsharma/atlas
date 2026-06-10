// THROWAWAY — Editorial Project Context viewer prototype.
// Long-form Markdown read view of a Project's CONTEXT.md.
// Body uses `prose` typography; rail has TOC + edit/refresh affordances.

import { NAV } from "./mock-data";

const TOC = [
  { id: "language", label: "Language" },
  { id: "relationships", label: "Relationships" },
  { id: "conventions", label: "Conventions" },
  { id: "decisions", label: "Decisions" },
  { id: "smells", label: "Known smells" },
  { id: "ai-suggestions", label: "AI suggestions" },
];

export function VariantPContext() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          {/* SIDEBAR — P active */}
          <aside className="w-[56px] shrink-0 sticky top-0 h-screen self-start flex flex-col items-center justify-between py-8 border-r border-stone-200/60 z-10">
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none">a</div>
            </div>
            <nav className="flex flex-col items-center gap-5">
              {NAV.map((n) => {
                const initial = n.short.charAt(0);
                const isActive = n.key === "projects";
                return (
                  <a
                    key={n.key}
                    className={`relative h-7 w-7 flex items-center justify-center cursor-pointer transition group ${
                      isActive ? "text-stone-900" : "text-stone-400 hover:text-stone-900"
                    }`}
                  >
                    <span className={`text-base ${isActive ? "font-semibold" : "font-medium"}`}>
                      {initial}
                    </span>
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-3 bg-amber-500" />
                    )}
                    {n.badge !== undefined && (
                      <span className="absolute -top-1 -right-1 font-mono text-[9px] leading-none text-stone-600 bg-amber-50 px-0.5">
                        {n.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
            <div className="relative group">
              <div className="relative h-6 w-6 flex items-center justify-center cursor-pointer">
                <div className="text-xl font-bold tracking-tighter leading-none text-stone-900 group-hover:text-amber-600 transition">
                  o
                </div>
                <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </aside>

          {/* MAIN */}
          <main className="flex-1 px-16 pt-8 pb-24">
            {/* Top breadcrumb + quick edit */}
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Projects · acme-website · Context
              </div>
              <button className="font-mono text-xs uppercase tracking-widest text-stone-700 border border-stone-200 hover:border-stone-300 bg-white px-4 py-2 rounded-full">
                Edit ↗
              </button>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_360px] gap-16">
              {/* MAIN COL — long-form Markdown */}
              <div className="max-w-2xl">
                {/* Document header — quiet provenance */}
                <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
                  Last edited by <span className="italic normal-case tracking-normal font-sans">you</span>{" "}
                  · 3 days ago
                </div>
                <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
                  ACME website.
                </h1>
                <p className="mt-4 text-lg text-stone-700 leading-relaxed italic">
                  The way I think about this codebase — written by hand, read by the
                  Engine before every Job.
                </p>

                {/* Section: Overview */}
                <section className="mt-16">
                  <p className="text-base text-stone-700 leading-relaxed">
                    The{" "}
                    <span className="font-mono text-sm text-stone-600">
                      acme-website
                    </span>{" "}
                    project is the e-commerce storefront for ACME. Atlas&rsquo;s job
                    is to keep it shipping features and bug fixes faster than the
                    small dev team could alone — without the team ever opening a
                    terminal.
                  </p>
                </section>

                {/* Section: Language */}
                <section id="language" className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      Language
                    </h2>
                    <span className="font-mono text-xs text-stone-400">
                      8 terms
                    </span>
                  </div>
                  <dl className="divide-y divide-stone-200">
                    <ContextTerm
                      term="Storefront"
                      desc="The marketing + product-listing pages. Server-rendered with Next.js 15 + Tailwind v4. Caching via Vercel."
                    />
                    <ContextTerm
                      term="Cart"
                      desc="Session-backed shopping cart state. Optimistic UI patterns; server-action mutations."
                    />
                    <ContextTerm
                      term="Fulfillment"
                      desc="Stripe Checkout → DB order persistence → Resend email confirmations. The riskiest area; least test coverage."
                    />
                    <ContextTerm
                      term="Catalog"
                      desc="Product, variant, and inventory tables. Source of truth for what's for sale."
                    />
                    <ContextTerm
                      term="Avoid"
                      avoid
                      desc="`User` (ambiguous — we have Customers and Admins). Use the specific term."
                    />
                  </dl>
                </section>

                {/* Section: Conventions */}
                <section id="conventions" className="mt-16">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Conventions
                  </h2>
                  <ul className="mt-5 space-y-3 text-base text-stone-700 leading-relaxed list-none">
                    <li className="grid grid-cols-[10px_1fr] gap-3 items-baseline">
                      <span className="text-stone-400">·</span>
                      <span>
                        Server actions live in{" "}
                        <span className="font-mono text-sm text-stone-600">
                          src/lib/*-actions.ts
                        </span>
                      </span>
                    </li>
                    <li className="grid grid-cols-[10px_1fr] gap-3 items-baseline">
                      <span className="text-stone-400">·</span>
                      <span>
                        Route components stay in{" "}
                        <span className="font-mono text-sm text-stone-600">
                          app/(shop)/&lt;handle&gt;/page.tsx
                        </span>
                      </span>
                    </li>
                    <li className="grid grid-cols-[10px_1fr] gap-3 items-baseline">
                      <span className="text-stone-400">·</span>
                      <span>
                        Shared components in{" "}
                        <span className="font-mono text-sm text-stone-600">
                          src/components/
                        </span>
                      </span>
                    </li>
                    <li className="grid grid-cols-[10px_1fr] gap-3 items-baseline">
                      <span className="text-stone-400">·</span>
                      <span>
                        DB types via Prisma generate;{" "}
                        <span className="font-mono text-sm text-stone-600">
                          src/db/schema.prisma
                        </span>{" "}
                        is the source of truth.
                      </span>
                    </li>
                  </ul>
                </section>

                {/* Section: Decisions */}
                <section id="decisions" className="mt-16">
                  <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Decisions
                  </h2>
                  <div className="mt-5 space-y-6 text-base text-stone-700 leading-relaxed">
                    <p>
                      <span className="font-semibold text-stone-900">
                        Prisma over Drizzle.
                      </span>{" "}
                      Legacy choice from 2023; predates Drizzle&rsquo;s production
                      maturity. Migration cost outweighs benefit for this codebase.
                    </p>
                    <p>
                      <span className="font-semibold text-stone-900">
                        Stripe Checkout, not Elements.
                      </span>{" "}
                      Simpler integration; we don&rsquo;t need the custom payment-form
                      UX. Saves ~3 weeks of compliance work.
                    </p>
                    <p>
                      <span className="font-semibold text-stone-900">Resend for email.</span>{" "}
                      Transactional only. Sendgrid not justified at our volume.
                    </p>
                  </div>
                </section>

                {/* Section: AI noticed missing terms — the only "system voice" allowed in this doc */}
                <section id="ai-suggestions" className="mt-16">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Words the Engine noticed
                  </div>
                  <p className="mt-5 text-base text-stone-700 leading-relaxed italic">
                    The Engine found these terms in the code but couldn&rsquo;t find
                    them here. Add the ones that matter; dismiss the rest.
                  </p>
                  <ul className="mt-5 divide-y divide-stone-200">
                    {[
                      { term: "Webhook", uses: 23 },
                      { term: "Invoice", uses: 41 },
                      { term: "Refund", uses: 18 },
                    ].map((s) => (
                      <li
                        key={s.term}
                        className="py-3 flex items-baseline justify-between group cursor-pointer"
                      >
                        <span className="flex items-baseline gap-3">
                          <span className="font-mono text-base text-stone-900">
                            {s.term}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                            {s.uses} uses
                          </span>
                        </span>
                        <span className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition">
                          <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                            add →
                          </a>
                          <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-rose-600 cursor-pointer">
                            dismiss ✕
                          </a>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    enriched 4h ago · these are suggestions, not edits
                  </div>
                </section>

                {/* Quiet outro — Owner's signing-off line */}
                <p className="mt-20 text-base italic text-stone-500 leading-relaxed">
                  For everything else — the codebase&rsquo;s actual shape, smells,
                  test coverage, and recent commits —{" "}
                  <a className="text-amber-600 hover:underline cursor-pointer">
                    see the Ingest summary
                  </a>
                  . That one Atlas writes for you; this one you write for Atlas.
                </p>
              </div>

              {/* RIGHT RAIL — slim, this is a reading page not a stat page */}
              <aside className="space-y-14">
                {/* Table of contents — the rail's primary purpose */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Contents
                  </div>
                  <ol className="mt-5 space-y-2.5">
                    {TOC.filter((t) => t.id !== "smells").map((item, i) => (
                      <li key={item.id}>
                        <a className="group flex items-baseline gap-3 text-sm cursor-pointer">
                          <span className="font-mono text-[10px] text-stone-400 w-5">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="text-stone-700 group-hover:text-stone-900">
                            {item.label}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </section>

                {/* Edit card — featured action */}
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Edit
                  </div>
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                    Edit this in your browser, or pull it from the repo where it
                    lives next to the code.
                  </p>
                  <button className="mt-5 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3 rounded-full inline-flex items-center justify-center gap-2 shadow-sm transition">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Open editor
                    <span className="text-stone-400">↗</span>
                  </button>
                  <a className="mt-3 block text-center font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:underline cursor-pointer">
                    Pull from repo ↻
                  </a>
                </section>

                {/* Linked — cross-refs to sibling pages */}
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Linked
                  </div>
                  <ul className="mt-4 space-y-3">
                    <li className="group cursor-pointer">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-stone-700 group-hover:text-stone-900">
                          Ingest summary
                        </span>
                        <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                          →
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                        the codebase&rsquo;s actual shape
                      </div>
                    </li>
                    <li className="group cursor-pointer">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-stone-700 group-hover:text-stone-900">
                          Repository
                        </span>
                        <span className="font-mono text-[10px] text-stone-400 group-hover:text-amber-600 transition">
                          ↗
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                        where this file lives
                      </div>
                    </li>
                  </ul>
                </section>

                {/* Quiet footer — what this is */}
                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    The Engine reads this verbatim before every Job. The closer it
                    is to how you actually think about your project, the better the
                    Engine&rsquo;s output.
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant P · editorial context
        </div>
      </div>
    </>
  );
}

function ContextTerm({
  term,
  desc,
  avoid,
}: {
  term: string;
  desc: string;
  avoid?: boolean;
}) {
  return (
    <div className="py-5 grid grid-cols-[110px_1fr] items-baseline gap-6">
      <dt className="font-mono text-sm font-medium text-stone-900">
        {term}
        {avoid && (
          <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-rose-700">
            avoid
          </span>
        )}
      </dt>
      <dd className="text-base text-stone-700 leading-relaxed">{desc}</dd>
    </div>
  );
}
