"use client";
/**
 * M6 — browser end of the Live seam (docs/adr/0001-live-transport.md).
 *
 * Opens the typed SSE stream and re-renders the server tree
 * (router.refresh, throttled) whenever any LiveEvent lands — so every
 * number, dot, and row on the page is re-read from the DB without a
 * manual refresh (PRD #6). Renders nothing; mount once per live page.
 *
 * The connection is STABLE for the life of the mount (M9 root cause):
 * `since` is latched at first render and the cursor advances from each
 * frame's `id:` — it must NOT key the effect, because router.refresh()
 * re-renders the server tree with a fresh cursor, and cycling the
 * EventSource on every refresh opens a window where the replacement
 * request hangs in CONNECTING forever under dev-server load (no error
 * event fires, so EventSource never retries — a quietly stale tab).
 *
 * Half-dead streams are the second exposure (M9A decision 11): Next dev
 * under load can hold a stream open while delivering nothing, and the
 * WHATWG EventSource auto-reconnects only when a stream ENDS. The route
 * sends a browser-visible `ping` event every 25 s; a watchdog reopens
 * the stream from the tracked cursor when nothing — open, ping, or
 * event — has been heard for WATCHDOG_SILENT_MS. At-least-once delivery
 * holds across reconnects via the cursor (no events are lost).
 */
import { useEffect, useRef } from "react";

import { useRouter } from "next/navigation";

import { LIVE_EVENT_TYPES } from "@/src/domain/live/events";

const REFRESH_THROTTLE_MS = 800;
const WATCHDOG_TICK_MS = 5_000;
/** route pings every 25 s — silence beyond this means a dead stream. */
const WATCHDOG_SILENT_MS = 40_000;

export function LiveRefresh({ since }: { since: number }) {
  const router = useRouter();
  // latched at mount; advances with every frame's id (the outbox cursor).
  const cursor = useRef(since);

  useEffect(() => {
    let source: EventSource | null = null;
    let lastActivity = Date.now();
    let lastRefresh = 0;
    let pending: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      const now = Date.now();
      const elapsed = now - lastRefresh;
      if (elapsed >= REFRESH_THROTTLE_MS) {
        lastRefresh = now;
        router.refresh();
      } else if (!pending) {
        pending = setTimeout(() => {
          pending = null;
          lastRefresh = Date.now();
          router.refresh();
        }, REFRESH_THROTTLE_MS - elapsed);
      }
    };

    const onLiveEvent = (e: Event) => {
      lastActivity = Date.now();
      const id = Number((e as MessageEvent).lastEventId);
      if (Number.isFinite(id) && id > cursor.current) cursor.current = id;
      refresh();
    };

    const connect = () => {
      source?.close();
      source = new EventSource(`/api/live?since=${cursor.current}`);
      source.onopen = () => {
        lastActivity = Date.now();
      };
      source.addEventListener("ping", () => {
        lastActivity = Date.now();
      });
      for (const type of LIVE_EVENT_TYPES) {
        source.addEventListener(type, onLiveEvent);
      }
    };

    connect();
    const watchdog = setInterval(() => {
      if (Date.now() - lastActivity > WATCHDOG_SILENT_MS) {
        // grant the replacement a full window before the next strike.
        lastActivity = Date.now();
        connect();
      }
    }, WATCHDOG_TICK_MS);

    return () => {
      clearInterval(watchdog);
      if (pending) clearTimeout(pending);
      source?.close();
    };
  }, [router]);

  return null;
}
