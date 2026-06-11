/**
 * Kit — CommandPalette: ONE palette, composed per canon §2.12.
 *
 * Interior ported from design/variants/variant-uu-cmdk.tsx:79–183 (kicker
 * row, hero input, recent chips, active row with amber left bar) + capped
 * scroll with fade mask and kbd-hint footer from variant-y-palette.tsx:109,
 * 185–209. Governing canon: §2.12, §3.5 (max-h-[60vh], 30px fade — the
 * palette is one of exactly two sanctioned capped live regions).
 * Mount inside ModalShell size="palette" (the §2.11 shell provides scrim
 * + panel chrome).
 *
 * M12 axes (cited per kit law): keyboard ↑↓/⏎ drives the UU:130–138
 * active row for real (Y:186–199's footer hints stop being decoration);
 * `onRecentSelect` wires the UU:101–113 chips.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "./EmptyState";
import { Kbd } from "./Kbd";
import { RecentChip } from "./RecentChip";

export type PaletteItem = {
  /** mono glyph column — §3.6 vocabulary (→ ↗ # / ⌂ …). */
  glyph?: string;
  label: string;
  /** mono-meta hint line under the label (UU:160–164). */
  hint?: string;
  /** right-aligned shortcut chip instead of the ↵ affordance. */
  kbd?: string;
  /** amber "recent" tag (UU:154–158). */
  recent?: boolean;
  onSelect?: () => void;
};

export type PaletteGroup = {
  label: string;
  items: PaletteItem[];
};

export function CommandPalette({
  groups,
  recents = [],
  onRecentSelect,
  placeholder = "Jump to anything — type a project, a Ticket #, or just say what you want…",
  query: controlledQuery,
  onQueryChange,
  tip = "tip — start with a slash for actions, # for Tickets",
  autoFocus = true,
}: {
  groups: PaletteGroup[];
  recents?: string[];
  /** M12 — chip click recall (UU:101–113 made real). */
  onRecentSelect?: (label: string) => void;
  placeholder?: string;
  query?: string;
  onQueryChange?: (q: string) => void;
  tip?: React.ReactNode;
  /** the palette autofocuses in product (UU:91); galleries pass false. */
  autoFocus?: boolean;
}) {
  const [internalQuery, setInternalQuery] = useState("");
  const query = controlledQuery ?? internalQuery;
  const resultCount = useMemo(
    () => groups.reduce((n, g) => n + g.items.length, 0),
    [groups],
  );

  // M12 — keyboard-first nav over the flattened rows (↑↓ move, ⏎ opens).
  const [activeIdx, setActiveIdx] = useState(0);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  // new results reset the cursor — the during-render adjustment pattern
  // (react.dev "you might not need an effect"; lint react-hooks law).
  const [prevGroups, setPrevGroups] = useState(groups);
  if (prevGroups !== groups) {
    setPrevGroups(groups);
    setActiveIdx(0);
  }
  const activeRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, groups]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flat[activeIdx]?.onSelect?.();
    }
  };

  return (
    <div>
      {/* Top — kicker + hero input (UU:79–98) */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-stone-400">
          <span className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-amber-500" />
            Command palette
          </span>
          <span>esc to close</span>
        </div>
        <div className="mt-3 flex items-baseline gap-4">
          <span className="font-mono text-stone-400 text-2xl">⌕</span>
          <input
            type="text"
            autoFocus={autoFocus}
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setInternalQuery(e.target.value);
              onQueryChange?.(e.target.value);
            }}
            onKeyDown={onKeyDown}
            aria-label="Command palette"
            className="flex-1 bg-transparent text-2xl tracking-tight text-stone-900 placeholder:text-stone-300 focus:outline-none"
          />
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
            {resultCount} results
          </span>
        </div>

        {/* Recent chips (UU:101–113) */}
        {recents.length > 0 && (
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
              recent
            </span>
            {recents.map((r) => (
              <RecentChip key={r} onClick={onRecentSelect ? () => onRecentSelect(r) : undefined}>
                {r}
              </RecentChip>
            ))}
          </div>
        )}
      </div>

      {/* Results — Y's capped scroll + fade mask (§3.5) over UU's rows */}
      <div className="max-h-[60vh] overflow-y-auto border-t border-stone-200/60 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,black_calc(100%-30px),transparent_100%)]">
        {resultCount === 0 ? (
          <div className="px-6 py-8">
            <EmptyState
              shape="palette"
              query={query}
              suggestion={
                <>
                  Try a Ticket ID (<span className="font-mono">T-247</span>), a Project
                  name, or a verb like <span className="font-mono">file</span>.
                </>
              }
            />
          </div>
        ) : (
          (() => {
            let globalIdx = -1;
            return groups.map((group) => (
              <section key={group.label} className="py-3">
                <div className="px-6 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500 flex items-baseline justify-between">
                  <span>{group.label}</span>
                  <span className="text-stone-300">{group.items.length}</span>
                </div>
                <ul>
                  {group.items.map((item, ii) => {
                    globalIdx += 1;
                    const active = globalIdx === activeIdx;
                    return (
                      <li key={`${item.label}-${ii}`} ref={active ? activeRef : undefined}>
                        <button
                          type="button"
                          onClick={item.onSelect}
                          data-palette-active={active || undefined}
                          className={`w-full text-left px-6 py-2.5 grid grid-cols-[24px_1fr_auto] items-baseline gap-4 cursor-pointer transition ${
                            active
                              ? "bg-amber-50 border-l-2 border-amber-500"
                              : "hover:bg-stone-50 border-l-2 border-transparent"
                          }`}
                        >
                          <span
                            className={`font-mono text-base ${
                              active ? "text-amber-700" : "text-stone-400"
                            }`}
                          >
                            {item.glyph}
                          </span>
                          <span>
                            <span className="flex items-baseline gap-2">
                              <span
                                className={`text-base text-stone-900${active ? " font-medium" : ""}`}
                              >
                                {item.label}
                              </span>
                              {item.recent && (
                                <span className="font-mono text-[9px] uppercase tracking-widest text-amber-700">
                                  recent
                                </span>
                              )}
                            </span>
                            {item.hint && (
                              <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-widest text-stone-400">
                                {item.hint}
                              </span>
                            )}
                          </span>
                          <span>
                            {item.kbd ? (
                              <Kbd>{item.kbd}</Kbd>
                            ) : active ? (
                              <span className="font-mono text-[10px] uppercase tracking-widest text-amber-700">
                                ↵ to open
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ));
          })()
        )}
      </div>

      {/* Footer — kbd hints (Y:185–209) */}
      <div className="px-6 py-3 border-t border-stone-200/60 bg-stone-50/40 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-stone-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <Kbd>↑↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-2">
            <Kbd>↵</Kbd> open
          </span>
          <span className="flex items-center gap-2">
            <Kbd>⌘K</Kbd> toggle
          </span>
        </div>
        <span className="italic font-sans tracking-normal text-stone-400 text-xs normal-case">
          {tip}
        </span>
      </div>
    </div>
  );
}
