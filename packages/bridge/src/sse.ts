/**
 * SSE consumer — long-lived fetch with line parsing (rewrite of v1
 * lib/sse-client.ts: same buffer/flush shape, plus `id:` tracking so the
 * daemon can resume via Last-Event-ID; reconnect POLICY moved to the
 * daemon's connection loop, which re-syncs before every subscribe —
 * ADR-0002 §2 snapshot-then-subscribe).
 */

export type SseFrame = { id: string | null; event: string; data: string };

/**
 * Open one SSE connection and consume frames until the stream drops or
 * `signal` aborts. Throws TokenRejected-shaped errors upward; returns
 * normally on clean end-of-stream.
 */
export async function consumeSse(opts: {
  url: string;
  token: string;
  lastEventId?: string;
  signal: AbortSignal;
  onFrame: (frame: SseFrame) => void;
  onConnected?: () => void;
  fetchFn?: typeof fetch;
}): Promise<void> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(opts.url, {
    headers: {
      Authorization: `Bearer ${opts.token}`,
      Accept: "text/event-stream",
      ...(opts.lastEventId ? { "Last-Event-ID": opts.lastEventId } : {}),
    },
    signal: opts.signal,
  });
  if (res.status === 401) throw new Error("sse-unauthorized");
  if (!res.ok || !res.body) throw new Error(`sse-status-${res.status}`);
  opts.onConnected?.();

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let id: string | null = null;
  let event = "message";
  let data = "";

  const flush = () => {
    if (data) opts.onFrame({ id, event, data });
    event = "message";
    data = "";
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      flush();
      return;
    }
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).replace(/\r$/, "");
      buf = buf.slice(nl + 1);
      if (line === "") {
        flush();
      } else if (line.startsWith("id:")) {
        id = line.slice(3).trim();
      } else if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        data += line.slice(5).trim();
      }
      // comments / unknown fields ignored
    }
  }
}
