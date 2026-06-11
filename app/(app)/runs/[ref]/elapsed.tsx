"use client";
/**
 * M9 Session B — RR:289–303's big elapsed timer, ticking for real.
 * Client-only because elapsed time IS client time; everything else on
 * the page stays server-rendered.
 */
import { useEffect, useState } from "react";

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function ElapsedTimer({ sinceIso, running }: { sinceIso: string; running: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [running]);
  return (
    <div className="font-mono text-5xl font-bold tracking-tighter text-stone-900 leading-none">
      {fmt(now - new Date(sinceIso).getTime())}
    </div>
  );
}
