/**
 * Kit — TerminalBlock + SecretBlock.
 *
 * TerminalBlock ported from design/variants/variant-rr-enginerun.tsx:207–237
 * (+kind maps :39–67). SecretBlock ported from variant-xx-tokens.tsx:118–125.
 * Governing canon: §2.20 — LIGHT terminal; the stone-900-filled block is
 * reserved for the show-once secret. Copy pill on the secret block is the
 * §4-M10 sanctioned amber exception.
 */

export type StreamKind = "info" | "claude" | "tool" | "ok" | "active";

export type StreamLine = {
  /** timestamp for the 55px gutter — "09:42:01". */
  t: string;
  kind: StreamKind;
  text: string;
};

const STREAM_COLOR: Record<StreamKind, string> = {
  info: "text-stone-500",
  claude: "text-amber-700",
  tool: "text-stone-700",
  ok: "text-emerald-700",
  active: "text-stone-900 font-medium",
};

const STREAM_PREFIX: Record<StreamKind, string> = {
  info: "·",
  claude: "◆",
  tool: "›",
  ok: "✓",
  active: "▶",
};

export function TerminalBlock({
  path,
  meta,
  lines,
  cursor = false,
  cursorAt,
}: {
  /** mono path in the title bar — "~/work/atlas-internal · claude --resume…". */
  path: string;
  /** right-aligned title-bar meta — "120 lines". */
  meta?: string;
  lines: StreamLine[];
  /** live blocks end on a `▍` cursor row (RR:232–236). */
  cursor?: boolean;
  cursorAt?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/80 border border-stone-200 overflow-hidden">
      {/* Title bar — three traffic dots + mono path */}
      <div className="px-5 py-3 border-b border-stone-200/80 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-500 bg-stone-50/60">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        <span>{path}</span>
        {meta && <span className="ml-auto text-stone-400">{meta}</span>}
      </div>
      <ol className="px-5 py-4 font-mono text-[12px] leading-[1.7] divide-y divide-stone-100">
        {lines.map((line, i) => (
          <li key={i} className="py-1.5 grid grid-cols-[55px_18px_1fr] gap-3 items-baseline">
            <span className="text-stone-400">{line.t}</span>
            <span className={`${STREAM_COLOR[line.kind]} shrink-0`}>
              {STREAM_PREFIX[line.kind]}
            </span>
            <span className={STREAM_COLOR[line.kind]}>{line.text}</span>
          </li>
        ))}
        {cursor && (
          <li className="py-1.5 grid grid-cols-[55px_18px_1fr] gap-3 items-baseline">
            <span className="text-stone-400">{cursorAt}</span>
            <span className="text-stone-900">▍</span>
            <span className="text-stone-400 italic">cursor</span>
          </li>
        )}
      </ol>
    </div>
  );
}

/**
 * §2.20 / §4-M10 — the show-once secret block: stone-900 fill + select-all
 * secret + amber Copy pill (XX:118–125). The ONE amber-filled button in
 * the register, sanctioned by §4-M10.
 */
export function SecretBlock({
  secret,
  copyLabel = "Copy →",
  onCopy,
}: {
  secret: string;
  copyLabel?: string;
  onCopy?: () => void;
}) {
  return (
    <div className="rounded-xl bg-stone-900 text-stone-50 px-5 py-4 font-mono text-sm flex items-center justify-between gap-4 break-all">
      <span className="select-all">{secret}</span>
      <button
        type="button"
        onClick={onCopy}
        className="font-mono text-[10px] uppercase tracking-widest text-stone-50 bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded-full whitespace-nowrap"
      >
        {copyLabel}
      </button>
    </div>
  );
}
