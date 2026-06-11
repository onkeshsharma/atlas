/**
 * M9 Session B — the PURE stream-line vocabulary (no DB imports: the
 * browser's streaming TerminalBlock classifies lines with the same map
 * the server tails use, and a client bundle must never pull
 * src/db/client). Server read models live in ./stdout.ts.
 */

export type StdoutLine = {
  /** chunk arrival stamp — "09:42:01" (RR's 55px gutter). */
  t: string;
  text: string;
};

export function stampOf(date: Date): string {
  return date.toTimeString().slice(0, 8);
}

/**
 * Real-content classifier for RR's kind-colored prefixes (§2.20). The
 * fake Engine speaks plain lines; the heuristics map the vocabulary the
 * adapters actually emit. Unknown lines read as quiet info — never loud.
 */
export type StreamKindName = "info" | "claude" | "tool" | "ok" | "active";

export function classifyStdoutLine(text: string): StreamKindName {
  const trimmed = text.trim();
  if (trimmed.startsWith("✓") || /^answered:/.test(trimmed)) return "ok";
  if (trimmed.startsWith("›") || trimmed.startsWith("$") || /^wrote /.test(trimmed)) {
    return "tool";
  }
  if (trimmed.startsWith("◆")) return "claude";
  if (trimmed.startsWith("⨯") || /^error/i.test(trimmed)) return "active";
  if (/^(engine|helper) session start/.test(trimmed)) return "info";
  if (/[.…]$/.test(trimmed)) return "info";
  return "tool";
}
