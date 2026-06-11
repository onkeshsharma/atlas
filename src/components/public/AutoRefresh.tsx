"use client";
/**
 * M14 — timer-driven router.refresh for the public status page, so
 * MM:106's "auto-refreshes every 30s" line is TRUE (the M6 LiveRefresh
 * idiom, on a clock instead of the SSE seam — the status page is public
 * and must not open the authed live stream).
 */
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
