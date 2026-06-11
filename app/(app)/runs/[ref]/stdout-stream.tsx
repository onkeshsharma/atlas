"use client";
/**
 * M9 Session B — RR's Engine stream: the kit TerminalBlock fed by the
 * per-run stdout SSE (`GET /api/runs/:id/stdout` — ADR-0002 §4, the
 * chunk table's own cursor; PRD #5).
 *
 * Connection discipline copies LiveRefresh (the worked example — M9A
 * decision 11): ONE stable EventSource for the life of the mount, the
 * cursor advancing from each frame's `id:`, a last-activity watchdog
 * listening to the route's `ping` events, reopen-from-cursor on
 * silence. At-least-once + the seq cursor make reconnects lossless.
 *
 * Header affordances (RR:197–205): copy + download act on the REAL
 * accumulated text. RR:199's `↗` glyphs stay — both genuinely leave
 * Atlas (clipboard / a .log file), §3.6.
 */
import { useEffect, useMemo, useRef, useState } from "react";

import { TerminalBlock, type StreamLine } from "@/src/components/kit";
import { classifyStdoutLine } from "@/src/domain/run/stdout";

const WATCHDOG_TICK_MS = 5_000;
const WATCHDOG_SILENT_MS = 40_000;
/** the variant renders a tail, not a scrollback (RR:198 "tail"). */
const MAX_LINES = 400;

export type InitialLine = { t: string; text: string };

function stamp(date: Date): string {
  return date.toTimeString().slice(0, 8);
}

export function RunStdoutTerminal({
  runId,
  path,
  active,
  initialLines,
  sinceSeq,
}: {
  runId: string;
  /** title-bar mono path — "~/worktrees/<run> · engine". */
  path: string;
  /** stream + cursor row render only while the run is alive. */
  active: boolean;
  initialLines: InitialLine[];
  sinceSeq: number;
}) {
  const [liveLines, setLiveLines] = useState<InitialLine[]>([]);
  // a chunk can end mid-line (the batcher cuts on a clock) — carry it.
  const carry = useRef<string>("");

  useEffect(() => {
    if (!active) return;
    let source: EventSource | null = null;
    let lastActivity = Date.now();
    let cursor = sinceSeq;

    const onStdout = (e: Event) => {
      lastActivity = Date.now();
      const me = e as MessageEvent;
      const id = Number(me.lastEventId);
      if (Number.isFinite(id) && id > cursor) cursor = id;
      let chunks: Array<{ seq: number; content: string }> = [];
      try {
        chunks = (JSON.parse(me.data as string) as { chunks: typeof chunks }).chunks ?? [];
      } catch {
        return;
      }
      const now = stamp(new Date());
      const appended: InitialLine[] = [];
      const text = carry.current + chunks.map((c) => c.content).join("");
      const parts = text.split("\n");
      carry.current = parts.pop() ?? "";
      for (const line of parts) appended.push({ t: now, text: line });
      if (appended.length) {
        setLiveLines((prev) => [...prev, ...appended].slice(-MAX_LINES));
      }
    };

    const connect = () => {
      source?.close();
      source = new EventSource(`/api/runs/${runId}/stdout?since=${cursor}`);
      source.onopen = () => {
        lastActivity = Date.now();
      };
      source.addEventListener("ping", () => {
        lastActivity = Date.now();
      });
      source.addEventListener("stdout", onStdout);
    };

    connect();
    const watchdog = setInterval(() => {
      if (Date.now() - lastActivity > WATCHDOG_SILENT_MS) {
        lastActivity = Date.now();
        connect();
      }
    }, WATCHDOG_TICK_MS);

    return () => {
      clearInterval(watchdog);
      source?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, active]);

  const lines: StreamLine[] = useMemo(() => {
    const all = [...initialLines, ...liveLines].slice(-MAX_LINES);
    return all.map((l) => ({ t: l.t, kind: classifyStdoutLine(l.text), text: l.text }));
  }, [initialLines, liveLines]);

  const fullText = () =>
    [...initialLines, ...liveLines].map((l) => l.text).join("\n") +
    (carry.current ? `\n${carry.current}` : "");

  const copyLog = () => {
    void navigator.clipboard?.writeText(fullText());
  };
  const downloadLog = () => {
    const blob = new Blob([fullText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${runId}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
        <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
          Engine stream
        </h2>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          <span>tail</span>
          <button
            type="button"
            onClick={copyLog}
            className="text-stone-700 hover:text-amber-600 cursor-pointer font-mono text-[10px] uppercase tracking-widest"
          >
            copy ↗
          </button>
          <button
            type="button"
            onClick={downloadLog}
            className="text-stone-700 hover:text-amber-600 cursor-pointer font-mono text-[10px] uppercase tracking-widest"
          >
            download .log ↗
          </button>
        </div>
      </div>
      <div className="mt-3">
        <TerminalBlock
          path={path}
          meta={`${lines.length} lines`}
          lines={lines}
          cursor={active}
          cursorAt={lines.length ? lines[lines.length - 1].t : stamp(new Date())}
        />
      </div>
    </>
  );
}
