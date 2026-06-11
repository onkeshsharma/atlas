/**
 * Stdout batcher — rolling flush of Engine output into numbered chunks
 * (ADR-0002 §4; v1 prior art: lib/stdout-tick.ts + lib/stdout-uploader.ts,
 * rewritten: v2 ships numbered CHUNKS to a cursor table instead of
 * whole-tail snapshots, so the browser stream can resume mid-run).
 *
 * `seq` is per-run monotonic; failed flushes re-queue (idempotent ingest
 * makes the resend safe). Flush errors never kill the run — best-effort,
 * the v1 rule.
 */
import type { StdoutChunk } from "./protocol.ts";

export class StdoutBatcher {
  private seq = 0;
  private buffer = "";
  private pending: StdoutChunk[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private readonly flushMs: number;
  private readonly maxChars: number;
  private readonly send: (chunks: StdoutChunk[]) => Promise<void> | void;

  constructor(opts: {
    flushMs: number;
    maxChars?: number;
    send: (chunks: StdoutChunk[]) => Promise<void> | void;
  }) {
    this.flushMs = opts.flushMs;
    this.maxChars = opts.maxChars ?? 8_192;
    this.send = opts.send;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.flush(), this.flushMs);
  }

  push(text: string): void {
    if (!text) return;
    this.buffer += text;
    if (this.buffer.length >= this.maxChars) this.cut();
  }

  private cut(): void {
    if (!this.buffer) return;
    this.seq += 1;
    this.pending.push({ seq: this.seq, content: this.buffer });
    this.buffer = "";
  }

  async flush(): Promise<void> {
    if (this.flushing) return;
    this.cut();
    if (!this.pending.length) return;
    this.flushing = true;
    const batch = this.pending;
    this.pending = [];
    try {
      await this.send(batch);
    } catch {
      // re-queue ahead of anything pushed meanwhile — order preserved,
      // ingest is idempotent on (run_id, seq).
      this.pending = [...batch, ...this.pending];
    } finally {
      this.flushing = false;
    }
  }

  /** final flush + stop the interval. */
  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
}
