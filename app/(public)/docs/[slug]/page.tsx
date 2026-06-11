// M14 — doc-article template. Ported from
// design/variants/variant-hh-docpage.tsx:55–363 (fidelity protocol §5):
// breadcrumb top row, mono article header, text-5xl title + text-xl lede,
// anchored sections (the body), "Where to go next" divided rows, italic
// feedback footer, 280 TOC rail (canon §3.1 docs rail; HH:66) with
// On-this-page / Meta / Related / Source sections.
//
// Honest composition (recorded in M14-manual-test.md):
//  - HH's authed app sidebar does not port (public page — see docs index
//    header note); the breadcrumb gains the public wordmark home link.
//  - HH:61–64 "edit this page ↗" needs a public repo → "all docs →".
//  - HH:248–256 useful/not-really buttons need a feedback pipeline → the
//    italic line keeps a real mailto affordance instead.
//  - Rail "Source" cites the REAL documents each article was written from.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { articleBySlug, DOC_ARTICLES, docMeta } from "@/src/content/docs";

const ASK_A_HUMAN = "mailto:onkesh19@gmail.com?subject=Atlas%20docs";

export function generateStaticParams() {
  return DOC_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) return { title: "Atlas — docs" };
  return { title: `Atlas — ${article.indexTitle}`, description: article.sub };
}

export default async function DocArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) notFound();

  const toc = [...article.toc, { id: "next", label: "Where to go next" }];
  const related = article.related
    .map((rel) => ({ rel, meta: docMeta(rel) }))
    .filter((r) => r.meta !== undefined);

  return (
    <div className="relative flex-1 text-stone-900 font-sans">
      <main className="flex-1 px-16 pt-8 pb-24">
        {/* Top breadcrumb (HH:57–64 + public wordmark home link) */}
        <div className="flex items-baseline justify-between gap-8">
          <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
            <Link href="/" className="hover:text-stone-900 cursor-pointer">
              Atlas
            </Link>{" "}
            ·{" "}
            <Link href="/docs" className="hover:text-stone-900 cursor-pointer">
              Docs
            </Link>{" "}
            · {article.section} · {article.indexTitle}
          </div>
          <Link
            href="/docs"
            className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
          >
            all docs →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-[1fr_280px] gap-16">
          {/* MAIN COL — long-form article (HH:68–80) */}
          <article className="max-w-2xl">
            <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
              {article.section} · ~{article.readMin} min read · updated{" "}
              {article.updated}
            </div>
            <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
              {article.title}
            </h1>
            <p className="mt-5 text-xl text-stone-700 leading-relaxed">{article.lede}</p>

            {article.body}

            {/* Where to go next (HH:205–239) */}
            <section id="next" className="mt-16 pt-12 border-t border-stone-200">
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Where to go next
              </h2>
              <ul className="mt-5 divide-y divide-stone-200">
                {related.map(({ rel, meta }, i) => (
                  <li key={rel}>
                    <Link
                      href={meta!.href}
                      className="py-4 grid grid-cols-[40px_1fr_auto] items-baseline gap-6 group cursor-pointer"
                    >
                      <span className="font-mono text-xs text-stone-400">→</span>
                      <span>
                        <span className="block text-base font-medium text-stone-900">
                          {meta!.indexTitle}
                        </span>
                        <span className="mt-1 block text-sm text-stone-500">{meta!.sub}</span>
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                        {i === 0 ? "next →" : "→"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Feedback footer (HH:242–258, real affordance only) */}
            <section className="mt-16 pt-8 border-t border-stone-200/80">
              <p className="text-sm italic text-stone-500 leading-relaxed">
                Was this page useful? The docs improve only when you{" "}
                <a
                  href={ASK_A_HUMAN}
                  className="text-amber-600 hover:underline cursor-pointer not-italic"
                >
                  tell us
                </a>{" "}
                when they don&rsquo;t land.
              </p>
            </section>
          </article>

          {/* RIGHT RAIL — TOC + meta (HH:262–361) */}
          <aside className="space-y-12">
            <section>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                On this page
              </div>
              <ol className="mt-5 space-y-2.5">
                {toc.map((item, i) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="group flex items-baseline gap-3 text-sm cursor-pointer"
                    >
                      <span className="font-mono text-[10px] text-stone-400 w-5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={
                          i === 0
                            ? "text-stone-900 font-semibold"
                            : "text-stone-700 hover:text-stone-900"
                        }
                      >
                        {item.label}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Meta
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-500">Section</span>
                  <span className="text-stone-700">{article.section}</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-500">Read time</span>
                  <span className="font-mono text-stone-700">~{article.readMin} min</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-500">Updated</span>
                  <span className="font-mono text-stone-700">{article.updated}</span>
                </li>
                <li className="flex items-baseline justify-between">
                  <span className="text-stone-500">Audience</span>
                  <span className="text-stone-700">{article.audience}</span>
                </li>
              </ul>
            </section>

            <section>
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Related
              </div>
              <ul className="mt-5 space-y-3">
                {related.map(({ rel, meta }) => (
                  <li key={rel} className="group cursor-pointer">
                    <Link href={meta!.href} className="block">
                      <div className="text-sm text-stone-700 group-hover:text-stone-900">
                        {meta!.indexTitle}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-stone-400">
                        {meta!.section.toLowerCase()} · {meta!.readMin} min
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="pt-4 border-t border-stone-200/80">
              <p className="text-sm italic text-stone-500 leading-relaxed">
                Source: <span className="not-italic text-stone-700">{article.provenance}</span>
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
