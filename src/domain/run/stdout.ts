/**
 * M9 Session B — stdout read models + the stream-line presentation map.
 *
 * Chunks live in run_stdout_chunks (their own cursor — never
 * feed_events). The run pages need two server reads (RR's initial
 * render, K/V's tail) and ONE shared classifier so the browser stream
 * and the server tails color lines identically (RR:39–67's kind maps,
 * driven by real content instead of mock kinds).
 */
import { asc, eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import { runStdoutChunks } from "@/src/db/schema";

export type StdoutLine = {
  /** chunk arrival stamp — "09:42:01" (RR's 55px gutter). */
  t: string;
  text: string;
};

export function stampOf(date: Date): string {
  return date.toTimeString().slice(0, 8);
}

/**
 * Split persisted chunks into display lines. A line is stamped with the
 * chunk it STARTED in (chunks may cut mid-line — the batcher flushes on
 * a clock, not on newlines).
 */
function chunksToLines(rows: Array<{ content: string; createdAt: Date }>): StdoutLine[] {
  const lines: StdoutLine[] = [];
  let carry: StdoutLine | null = null;
  for (const row of rows) {
    const stamp = stampOf(row.createdAt);
    const parts = row.content.split("\n");
    for (let i = 0; i < parts.length; i++) {
      const isLastPart = i === parts.length - 1;
      if (carry) {
        carry.text += parts[i];
        if (!isLastPart) {
          lines.push(carry);
          carry = null;
        }
      } else if (!isLastPart) {
        lines.push({ t: stamp, text: parts[i] });
      } else if (parts[i] !== "") {
        carry = { t: stamp, text: parts[i] };
      }
    }
  }
  if (carry) lines.push(carry);
  return lines;
}

/** every persisted line, in order (RR's initial render). */
export async function stdoutLines(runId: string): Promise<{ lines: StdoutLine[]; lastSeq: number }> {
  const rows = await db
    .select({
      seq: runStdoutChunks.seq,
      content: runStdoutChunks.content,
      createdAt: runStdoutChunks.createdAt,
    })
    .from(runStdoutChunks)
    .where(eq(runStdoutChunks.runId, runId))
    .orderBy(asc(runStdoutChunks.seq));
  return {
    lines: chunksToLines(rows),
    lastSeq: rows.length ? rows[rows.length - 1].seq : 0,
  };
}

/** the last N lines (K:185 "stdout · last 14 lines", V's tail). */
export async function stdoutTail(
  runId: string,
  maxLines: number,
): Promise<{ lines: StdoutLine[]; total: number }> {
  const { lines } = await stdoutLines(runId);
  return { lines: lines.slice(-maxLines), total: lines.length };
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
