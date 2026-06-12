/**
 * M12 — the /search rail's "Recent searches" section (LL:217–247), made
 * real over localStorage (charter hard wall: recents are client-side,
 * no schema). LL's mocked rows are replaced by the visitor's own last
 * five queries; the section renders nothing until one exists.
 *
 * localStorage reads ride useSyncExternalStore (the React-sanctioned
 * external-system subscription — no setState-in-effect); recording the
 * current query is a pure external write.
 */
"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";

const KEY = "atlas.search.recents";
const MAX = 5;

export type RecentSearch = { q: string; at: number };

const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function snapshot(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parse(raw: string): RecentSearch[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is RecentSearch =>
        typeof r === "object" && r !== null &&
        typeof (r as RecentSearch).q === "string" && typeof (r as RecentSearch).at === "number",
    );
  } catch {
    return [];
  }
}

function record(q: string): void {
  const next = [{ q, at: Date.now() }, ...parse(snapshot()).filter((r) => r.q !== q)].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return; // private mode — recents just don't persist
  }
  for (const cb of listeners) cb();
}

/** quiet relative stamp — "yesterday", "2d ago" (LL:226's register). */
function stamp(at: number, now = Date.now()): string {
  const mins = Math.floor((now - at) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function RecentSearches({ currentQuery }: { currentQuery: string }) {
  // record AFTER render — a pure external-system write.
  useEffect(() => {
    const q = currentQuery.trim();
    if (q) record(q);
  }, [currentQuery]);

  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const recents = useMemo(() => parse(raw), [raw]);
  if (!recents.length) return null;

  return (
    <section>
      <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
        Recent searches
      </div>
      <ul className="mt-5 space-y-3 text-sm">
        {recents.map((r) => (
          <li key={r.q}>
            <Link
              href={`/search?q=${encodeURIComponent(r.q)}`}
              className="flex items-baseline justify-between group cursor-pointer"
            >
              <span className="font-mono text-stone-700 group-hover:text-stone-900">{r.q}</span>
              <span className="font-mono text-[10px] text-stone-400">{stamp(r.at)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
