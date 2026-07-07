"use client";
/**
 * Phase 2 — attention-pull. Turns "Atlas noticed" into "Atlas told me".
 *
 *  - Title-badge: the browser tab shows "(N) Atlas" when N items need you, so a
 *    backgrounded tab signals at a glance. It prefixes whatever the page title
 *    is and clears when you're caught up.
 *  - Desktop notification: when the needs-you count RISES while the tab is
 *    hidden, one OS notification fires, linking to the Inbox. Routine ship-done
 *    stays SILENT for free — it never raises the needs-you count (which is only
 *    Questions + Reviews), so it can't trip this.
 *
 * The count is server-driven (the same value the Podium shows); this component
 * re-renders with it whenever the shell re-reads on a live event, so no second
 * SSE stream is opened. Owner-only. Degrades gracefully: the title-badge always
 * works; notifications need the browser's permission.
 */
import { useEffect, useRef } from "react";

const BADGE_PREFIX = /^\(\d+\)\s+/;

export function AttentionSignal({ needsYou }: { needsYou: number }) {
  const prev = useRef<number | null>(null);

  // Title-badge — strip any prior "(n) " and re-apply for the current count.
  useEffect(() => {
    const base = document.title.replace(BADGE_PREFIX, "");
    document.title = needsYou > 0 ? `(${needsYou}) ${base}` : base;
  }, [needsYou]);

  // Desktop notification on a rise (never on first render, never when focused).
  useEffect(() => {
    const before = prev.current;
    prev.current = needsYou;
    if (before === null || needsYou <= before) return;
    if (typeof Notification === "undefined") return;

    const fire = () => {
      if (!document.hidden) return; // they're looking — the badge is enough
      try {
        const n = new Notification("Atlas needs you", {
          body: `${needsYou} item${needsYou === 1 ? "" : "s"} waiting — a question or a review.`,
          tag: "atlas-needs-you", // collapse repeats into one
        });
        n.onclick = () => {
          window.focus();
          window.location.href = "/inbox";
        };
      } catch {
        // non-fatal
      }
    };

    if (Notification.permission === "granted") fire();
    else if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") fire();
      });
    }
  }, [needsYou]);

  return null;
}
