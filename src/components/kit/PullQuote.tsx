/**
 * Kit — PullQuote: oversized quote ornament + italic body + mono attribution.
 *
 * Ported from design/variants/variant-f-ticket-detail.tsx:413–423 (amber
 * "AI asks") and variant-v-shipped.tsx:160–178 (emerald verify summary;
 * AA:74–90 email form). Governing canon: §2.15 — amber default, emerald
 * in shipped/diff contexts; body text-sm italic text-stone-800.
 *
 * M14 axes (cited, no fork): the public tier's two larger quote scales —
 * "article" = the doc-article centerpiece (HH:125–133: pl-7, text-5xl
 * ornament, text-2xl leading-tight tracking-tight body), "hero" = the
 * landing's privacy quote (FF:156–176: pl-8, text-7xl ornament, text-3xl
 * body, mt-5 attribution row). Attribution widens to ReactNode (FF:169–174
 * carries a link) and becomes optional (HH's article quote has none).
 */

const ORNAMENT: Record<"amber" | "emerald", string> = {
  amber: "text-amber-400/80",
  emerald: "text-emerald-400/80",
};

type QuoteScale = "sm" | "lg" | "article" | "hero";

const SCALE: Record<
  QuoteScale,
  { pad: string; ornament: string; body: string; attrGap: string }
> = {
  // §2.15 default + E13 narrative form (U:56)
  sm: { pad: "pl-6", ornament: "-left-1 -top-2 text-4xl", body: "text-sm leading-relaxed", attrGap: "mt-2" },
  lg: { pad: "pl-6", ornament: "-left-1 -top-2 text-4xl", body: "text-lg leading-relaxed", attrGap: "mt-2" },
  // HH:125–133 — doc-article centerpiece
  article: {
    pad: "pl-7",
    ornament: "-left-2 -top-3 text-5xl",
    body: "text-2xl leading-tight tracking-tight",
    attrGap: "mt-3",
  },
  // FF:156–176 — landing privacy quote
  hero: {
    pad: "pl-8",
    ornament: "-left-2 -top-4 text-7xl",
    body: "text-3xl leading-tight tracking-tight",
    attrGap: "mt-5",
  },
};

export function PullQuote({
  tone = "amber",
  scale = "sm",
  attribution,
  children,
}: {
  tone?: "amber" | "emerald";
  /** canon §2.15/E13 + M14 axes: "sm" rail/annotation · "lg" narrative
   * centerpiece (U:56) · "article" doc centerpiece (HH:126) · "hero"
   * landing quote (FF:158). */
  scale?: QuoteScale;
  /** mono-micro attribution below — "AI asks", "Collaborator summary". */
  attribution?: React.ReactNode;
  children: React.ReactNode;
}) {
  const s = SCALE[scale];
  return (
    <div className={`relative ${s.pad}`}>
      <span
        className={`absolute font-bold leading-none select-none ${s.ornament} ${ORNAMENT[tone]}`}
      >
        &ldquo;
      </span>
      <p className={`${s.body} italic text-stone-800`}>{children}</p>
      {attribution !== undefined && (
        <div
          className={`${s.attrGap} font-mono text-[10px] uppercase tracking-widest text-stone-400`}
        >
          {attribution}
        </div>
      )}
    </div>
  );
}
