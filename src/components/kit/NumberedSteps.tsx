/**
 * Kit — NumberedSteps: mono-indexed editorial step list.
 *
 * Ported from design/variants/variant-xx-tokens.tsx:364–384 (Note rows;
 * usage :204–227) and variant-gg-welcome.tsx:94–109. Narrow checklist
 * form per Q:132 / S:190. Governing canon: §2.16.
 */

export type NumberedStep = {
  title: React.ReactNode;
  body?: React.ReactNode;
};

export function NumberedSteps({
  steps,
  narrow = false,
  start = 1,
}: {
  steps: NumberedStep[];
  /** §2.16 — narrow `[24px_1fr]` form for checklists. */
  narrow?: boolean;
  /** first index — onboarding flows sometimes start mid-sequence (GG:96). */
  start?: number;
}) {
  return (
    <ol className="space-y-5 text-base text-stone-700 leading-relaxed">
      {steps.map((s, i) => (
        <li
          key={i}
          className={`grid ${narrow ? "grid-cols-[24px_1fr]" : "grid-cols-[40px_1fr]"} gap-6 items-baseline`}
        >
          <span className="font-mono text-xs text-stone-400">
            {String(start + i).padStart(2, "0")}
          </span>
          <div>
            <div className="text-base font-semibold text-stone-900">{s.title}</div>
            {s.body && <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">{s.body}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
