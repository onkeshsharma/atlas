"use client";
/**
 * M10 — page-scoped heartbeat liveness, mounted on /settings/bridges
 * ONLY. Heartbeats deliberately never write the outbox (M9A decision 8:
 * chrome, not history), so ADR-0001's one live seam cannot carry "the
 * daemon's beat just landed" — and this page's entire subject IS the
 * beat (presence, busy runs, the daemon-confirmed cap). A slow
 * router.refresh poll re-reads the bridge rows; LiveRefresh still
 * rides beside it for the outbox rows (pairing, doctor verdicts).
 * Recorded in HANDOFF-M10 as a sanctioned page-scoped exception — any
 * second use needs the same argument.
 */
import { useEffect } from "react";

import { useRouter } from "next/navigation";

export function HeartbeatPoll({ intervalMs = 10_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);
  return null;
}
