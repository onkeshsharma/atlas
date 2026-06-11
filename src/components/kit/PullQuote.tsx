/**
 * Kit — PullQuote: oversized quote ornament + italic body + mono attribution.
 *
 * Ported from design/variants/variant-f-ticket-detail.tsx:413–423 (amber
 * "AI asks") and variant-v-shipped.tsx:160–178 (emerald verify summary;
 * AA:74–90 email form). Governing canon: §2.15 — amber default, emerald
 * in shipped/diff contexts; body text-sm italic text-stone-800.
 */

const ORNAMENT: Record<"amber" | "emerald", string> = {
  amber: "text-amber-400/80",
  emerald: "text-emerald-400/80",
};

export function PullQuote({
  tone = "amber",
  scale = "sm",
  attribution,
  children,
}: {
  tone?: "amber" | "emerald";
  /** canon §2.15/E13: "sm" rail/annotation quotes; "lg" narrative centerpiece (U:56). */
  scale?: "sm" | "lg";
  /** mono-micro attribution below — "AI asks", "Collaborator summary". */
  attribution: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative pl-6">
      <span
        className={`absolute -left-1 -top-2 font-bold text-4xl leading-none select-none ${ORNAMENT[tone]}`}
      >
        &ldquo;
      </span>
      <p
        className={`${scale === "lg" ? "text-lg" : "text-sm"} italic text-stone-800 leading-relaxed`}
      >
        {children}
      </p>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
        {attribution}
      </div>
    </div>
  );
}
