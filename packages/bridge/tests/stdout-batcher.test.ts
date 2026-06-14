/**
 * M9 — stdout batcher: monotonic seqs, size cuts, retry re-queue
 * (idempotent ingest makes resends safe — ADR-0002 §4).
 */
import { describe, expect, it } from "vitest";

import { StdoutBatcher } from "../src/stdout-batcher.ts";
import type { StdoutChunk } from "../src/protocol.ts";

describe("StdoutBatcher", () => {
  it("flushes buffered text as numbered chunks, in order", async () => {
    const sent: StdoutChunk[][] = [];
    const batcher = new StdoutBatcher({ flushMs: 60_000, send: (c) => void sent.push(c) });
    batcher.push("hello ");
    batcher.push("world\n");
    await batcher.flush();
    batcher.push("second\n");
    await batcher.flush();
    await batcher.stop();
    expect(sent).toEqual([
      [{ seq: 1, content: "hello world\n" }],
      [{ seq: 2, content: "second\n" }],
    ]);
  });

  it("cuts a chunk when the buffer crosses maxChars", async () => {
    const sent: StdoutChunk[][] = [];
    const batcher = new StdoutBatcher({
      flushMs: 60_000,
      maxChars: 10,
      send: (c) => void sent.push(c),
    });
    batcher.push("0123456789ABC"); // crosses the cap → cut immediately
    batcher.push("tail");
    await batcher.stop(); // final flush picks up the tail as its own chunk
    expect(sent.flat().map((c) => c.seq)).toEqual([1, 2]);
    expect(sent.flat().map((c) => c.content).join("")).toBe("0123456789ABCtail");
  });

  it("M18 — startSeq offsets numbering so it never collides with clone-progress chunks", async () => {
    // the runner posts clone progress as seq 1,2 directly; the batcher
    // takes over with startSeq:2 so the first engine chunk is seq 3 (a
    // seq-1 collision would be a silent no-op at the idempotent ingest).
    const sent: StdoutChunk[][] = [];
    const batcher = new StdoutBatcher({
      flushMs: 60_000,
      startSeq: 2,
      send: (c) => void sent.push(c),
    });
    batcher.push("engine line one\n");
    await batcher.flush();
    batcher.push("engine line two\n");
    await batcher.stop();
    expect(sent.flat().map((c) => c.seq)).toEqual([3, 4]);
  });

  it("re-queues failed sends ahead of newer chunks (order preserved)", async () => {
    const sent: StdoutChunk[][] = [];
    let failNext = true;
    const batcher = new StdoutBatcher({
      flushMs: 60_000,
      send: async (chunks) => {
        if (failNext) {
          failNext = false;
          throw new Error("network blip");
        }
        sent.push(chunks);
      },
    });
    batcher.push("first\n");
    await batcher.flush(); // fails — chunk 1 re-queued
    batcher.push("second\n");
    await batcher.flush(); // sends 1 then 2 in one batch
    await batcher.stop();
    expect(sent.flat()).toEqual([
      { seq: 1, content: "first\n" },
      { seq: 2, content: "second\n" },
    ]);
  });
});
