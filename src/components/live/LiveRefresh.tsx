"use client";
/**
 * M6 — browser end of the Live seam (docs/adr/0001-live-transport.md).
 *
 * Opens the typed SSE stream and re-renders the server tree
 * (router.refresh, throttled) whenever any LiveEvent lands — so every
 * number, dot, and row on the page is re-read from the DB without a
 * manual refresh (PRD #6). Renders nothing; mount once per live page.
 *
 * EventSource reconnects automatically and resumes from Last-Event-ID
 * (the frames' id: field is the outbox cursor) — no events are lost
 * across drops.
 */
import { useEffect, useRef } from "react";

import { useRouter } from "next/navigation";

import { LIVE_EVENT_TYPES } from "@/src/domain/live/events";

const REFRESH_THROTTLE_MS = 800;

export function LiveRefresh({ since }: { since: number }) {
  const router = useRouter();
  const lastRefresh = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const source = new EventSource(`/api/live?since=${since}`);

    const refresh = () => {
      const now = Date.now();
      const elapsed = now - lastRefresh.current;
      if (elapsed >= REFRESH_THROTTLE_MS) {
        lastRefresh.current = now;
        router.refresh();
      } else if (!pending.current) {
        pending.current = setTimeout(() => {
          pending.current = null;
          lastRefresh.current = Date.now();
          router.refresh();
        }, REFRESH_THROTTLE_MS - elapsed);
      }
    };

    for (const type of LIVE_EVENT_TYPES) {
      source.addEventListener(type, refresh);
    }

    return () => {
      if (pending.current) clearTimeout(pending.current);
      source.close();
    };
  }, [router, since]);

  return null;
}
