/**
 * AFK active indicator (ADR-0007 §6) — a persistent, level-aware chip in the
 * shell so the Owner never forgets a delegate is answering. Calm amber for
 * standard AFK; loud rose for Ultra. Links to the Athena activity view.
 */
import Link from "next/link";

export function AfkChip({ level, count }: { level: "on" | "ultra"; count: number }) {
  const ultra = level === "ultra";
  return (
    <Link
      href="/settings/athena"
      className={`fixed right-6 top-5 z-40 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest shadow-sm transition-colors ${
        ultra
          ? "bg-rose-600 text-rose-50 hover:bg-rose-700"
          : "bg-amber-100 text-amber-800 ring-1 ring-amber-300 hover:bg-amber-200"
      }`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
            ultra ? "bg-rose-300" : "bg-amber-400"
          }`}
        />
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            ultra ? "bg-rose-200" : "bg-amber-500"
          }`}
        />
      </span>
      {ultra ? "Ultra Athena" : "AFK · Athena"}
      {count > 0 && <span className="opacity-70">· {count}</span>}
    </Link>
  );
}
