/**
 * M12 — the global Cmd-K mount (PRD #50; charter item 2): one palette
 * for the whole authed app, mounted once in app/(app)/layout.tsx.
 *
 * Composition per canon §2.12: kit ModalShell size="palette" (§2.11
 * scrim + panel) around the kit CommandPalette (UU interior + Y cap/
 * footer). Data: GET /api/search (debounced); navigation is real
 * router.push to the result's route. Recents are client-side
 * localStorage (charter hard wall — no schema), rendered as UU:101–113
 * chips and as "recent" tags on matching rows.
 *
 * No variant draws a sidebar search affordance (C/D/E audited — none
 * exists), so the palette IS the entry point and /search is reached
 * from the palette's "See all results" row (charter item 3's recorded
 * call; LL is "the full page after pressing ⏎ on a query").
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CommandPalette, ModalShell, type PaletteGroup } from "@/src/components/kit";
import type { SearchResponse } from "@/src/domain/search/types";

const RECENTS_KEY = "atlas.palette.recents";
const MAX_RECENTS = 4;

type Recent = { label: string; href: string };

function readRecents(): Recent[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is Recent =>
        typeof r === "object" && r !== null &&
        typeof (r as Recent).label === "string" && typeof (r as Recent).href === "string",
    );
  } catch {
    return [];
  }
}

function pushRecent(recent: Recent): Recent[] {
  const next = [recent, ...readRecents().filter((r) => r.href !== recent.href)].slice(
    0,
    MAX_RECENTS,
  );
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode) — recents just don't persist.
  }
  return next;
}

export function PaletteMount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [recents, setRecents] = useState<Recent[]>([]);
  const seq = useRef(0);

  // global ⌘K / Ctrl-K toggle (UU's reason to exist; Y:202 "⌘K toggle").
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setRecents(readRecents()); // refresh recall in the same gesture
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // (re)load results — debounced while typing, immediate on open.
  useEffect(() => {
    if (!open) return;
    const mySeq = ++seq.current;
    const run = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) return;
        const data = (await res.json()) as SearchResponse;
        if (seq.current === mySeq) setResponse(data);
      } catch {
        // transient fetch blip — the previous result set stays rendered.
      }
    };
    const timer = setTimeout(() => void run(), query ? 150 : 0);
    return () => clearTimeout(timer);
  }, [open, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const navigate = useCallback(
    (label: string, href: string) => {
      setRecents(pushRecent({ label, href }));
      close();
      router.push(href);
    },
    [close, router],
  );

  if (!open) return null;

  const recentHrefs = new Set(recents.map((r) => r.href));
  const groups: PaletteGroup[] = (response?.groups ?? []).map((g) => ({
    label: g.label,
    items: g.items.map((item) => ({
      glyph: item.glyph,
      label: item.title,
      hint: item.meta,
      recent: recentHrefs.has(item.href),
      onSelect: () => navigate(item.title, item.href),
    })),
  }));
  // /search is reached from here (recorded call — see file header).
  if (query.trim() && (response?.total ?? 0) > 0) {
    groups.push({
      label: "Everything",
      items: [
        {
          glyph: "⌕",
          label: `See all results for "${query.trim()}"`,
          hint: "full-page search",
          onSelect: () => navigate(`Search: ${query.trim()}`, `/search?q=${encodeURIComponent(query.trim())}`),
        },
      ],
    });
  }

  return (
    <div className="fixed inset-0 z-50" data-testid="command-palette">
      <ModalShell size="palette" onClose={close}>
        <CommandPalette
          groups={groups}
          query={query}
          onQueryChange={setQuery}
          recents={recents.map((r) => r.label)}
          onRecentSelect={(label) => {
            const hit = recents.find((r) => r.label === label);
            if (hit) navigate(hit.label, hit.href);
          }}
        />
      </ModalShell>
    </div>
  );
}
