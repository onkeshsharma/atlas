#!/usr/bin/env node
/**
 * Atlas v2 — design-fidelity tripwire (M3).
 *
 * Greps the DESIGN-CANON.md §1 invariants that are mechanically checkable
 * in Tailwind class strings. It is a TRIPWIRE, not the primary defense —
 * v2 is built canon → components → surfaces, so this only catches the
 * stray hand-typed drift (master plan §3).
 *
 * Clean v2 rewrite. The IDEA (class-string extraction + per-token rules,
 * exit 1 on error) is ported from the v1.3 checker
 * (atlas/scripts/design-fidelity-check.mjs); no code is copied and the
 * rule set is the M3 charter's §1 list, not v1.2 anti-patterns.
 *
 * Usage:
 *   node scripts/fidelity-tripwire.mjs <file...>   check specific files
 *   node scripts/fidelity-tripwire.mjs --staged    check staged .tsx under app/ + src/
 *   node scripts/fidelity-tripwire.mjs --sweep     check all .tsx under app/ + src/
 *
 * Vendored variants (design/variants/) are NEVER checked — they are the
 * spec, byte-identical, cited by the canon by file:line.
 *
 * Exit codes: 0 clean · 1 drift found · 2 usage error.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

// ── Canon §1 invariants ────────────────────────────────────────────────

/** §3.1 / §1.4 — the six locked pixel widths (rails, sidebar, subnav). */
const LOCKED_PX_WIDTHS = new Set([360, 320, 280, 200, 56, 260]);

/** §1.1 — the locked palette. Everything else is off-register. */
const LOCKED_COLOR_FAMILIES = new Set([
  "stone",
  "amber",
  "emerald",
  "rose",
  "violet",
  "sky",
  "white",
  "black",
  "transparent",
  "current",
  "inherit",
]);

const COLOR_UTILITY_PREFIXES =
  "text|bg|border|divide|ring|outline|decoration|placeholder|caret|accent|fill|stroke|from|via|to|shadow";

/** §2.6 — the four sanctioned dot sizes (h-N w-N rounded-full). */
const LOCKED_DOT_SIZES = new Set(["1", "1.5", "2", "2.5"]);

/** §1.3 — sanctioned shadow steps (floating things only; xl/inner never). */
const OFFSCALE_SHADOW = /^shadow-(xl|inner|\[.+\])$/;

/**
 * Each rule sees the tokens of ONE class string (plus the raw string)
 * and returns hit descriptions. A token is one whitespace-separated
 * Tailwind class with any `hover:`-style prefixes stripped.
 */
export const RULES = [
  {
    id: "rail-width",
    canon: "§3.1 / §1.4",
    check: (tokens) => {
      const hits = [];
      for (const t of tokens) {
        const m = /^w-\[(\d+)px\]$/.exec(t);
        if (m && !LOCKED_PX_WIDTHS.has(Number(m[1]))) {
          hits.push(
            `\`${t}\` — pixel widths are locked to 360/320/280/200/56/260 (canon §3.1)`,
          );
        }
        const g = /^grid-cols-\[(.+)\]$/.exec(t);
        if (g) {
          for (const pm of g[1].matchAll(/(\d+)px/g)) {
            const px = Number(pm[1]);
            // Small gutter tracks (40px index column §2.3, 24px checklist
            // §2.16, 120px date gutter §4-M14) are sanctioned; the locked
            // set governs rail-scale tracks.
            if (px >= 200 && !LOCKED_PX_WIDTHS.has(px)) {
              hits.push(
                `\`${t}\` — grid track ${px}px is rail-scale but not a locked width (canon §3.1)`,
              );
            }
          }
        }
      }
      return hits;
    },
  },
  {
    id: "radius-scale",
    canon: "§1.3",
    check: (tokens) =>
      tokens
        .filter((t) => t === "rounded-3xl" || /^rounded(-[trbl]?[a-z]*)?-\[.+\]$/.test(t))
        .map(
          (t) =>
            `\`${t}\` — radius scale is rounded/md/lg/xl/2xl/full; rounded-3xl is ruled drift (canon §1.3, ledger E8)`,
        ),
  },
  {
    id: "shadow-scale",
    canon: "§1.3",
    check: (tokens) => {
      const hits = tokens
        .filter((t) => OFFSCALE_SHADOW.test(t))
        .map(
          (t) =>
            `\`${t}\` — shadow scale is sm/md/lg/2xl, floating things only (canon §1.3)`,
        );
      // Kanban cards (the only rounded-lg cards) carry NO shadow — G:283.
      if (
        tokens.includes("rounded-lg") &&
        tokens.some((t) => /^shadow(-\w+)?$/.test(t))
      ) {
        hits.push(
          "`rounded-lg` + shadow — kanban-weight cards never carry shadows (canon §1.3, §4-M8)",
        );
      }
      return hits;
    },
  },
  {
    id: "underline-geometry",
    canon: "§3.2",
    check: (tokens) => {
      if (!tokens.some((t) => t === "h-[2px]" || t === "h-[3px]")) return [];
      const offFamily = tokens.filter(
        (t) =>
          /^bg-/.test(t) && !/^bg-(amber|rose|emerald)-/.test(t),
      );
      return offFamily.map(
        (t) =>
          `\`${t}\` with h-[2px]/h-[3px] — underline bars take the amber family (semantic rose/emerald allowed) (canon §3.2, §3.1)`,
      );
    },
  },
  {
    id: "dot-size",
    canon: "§2.6",
    check: (tokens) => {
      if (!tokens.includes("rounded-full")) return [];
      const hits = [];
      for (const t of tokens) {
        const m = /^h-(\d+(?:\.\d+)?)$/.exec(t);
        if (!m) continue;
        const n = m[1];
        if (Number(n) > 6) continue; // avatars/profile marks, not dots
        if (tokens.includes(`w-${n}`) && !LOCKED_DOT_SIZES.has(n)) {
          hits.push(
            `\`h-${n} w-${n} rounded-full\` — dot sizes are 1 / 1.5 / 2 / 2.5 only (canon §2.6)`,
          );
        }
      }
      return hits;
    },
  },
  {
    id: "off-palette",
    canon: "§1.1",
    check: (tokens) => {
      const re = new RegExp(`^(?:${COLOR_UTILITY_PREFIXES})-([a-z]+)-\\d`);
      // side/axis segments of width utilities (border-t-2, border-x-4)
      // are not color families — skip them (M5 false-positive fix).
      const SIDE_SEGMENTS = new Set(["t", "r", "b", "l", "x", "y", "s", "e"]);
      const hits = [];
      for (const t of tokens) {
        const m = re.exec(t);
        if (m && SIDE_SEGMENTS.has(m[1])) continue;
        if (m && !LOCKED_COLOR_FAMILIES.has(m[1])) {
          hits.push(
            `\`${t}\` — palette is locked to stone/amber/emerald/rose/violet/sky (canon §1.1)`,
          );
        }
      }
      return hits;
    },
  },
  {
    id: "mono-buttons",
    canon: "§2.9",
    check: (tokens) => {
      const isPrimaryFill = tokens.some((t) =>
        /^bg-(stone-900|emerald-600|rose-600)$/.test(t),
      );
      // px- padding distinguishes pill BUTTONS from round avatars/marks
      // (§2.18 oversized profile mark is rounded-full bg-stone-900, no px).
      const hasPadding = tokens.some((t) => /^px-/.test(t));
      if (
        tokens.includes("rounded-full") &&
        isPrimaryFill &&
        hasPadding &&
        !tokens.includes("font-mono")
      ) {
        return [
          "filled pill button without `font-mono` — all button labels are mono uppercase (canon §2.9, ledger E1)",
        ];
      }
      return [];
    },
  },
];

// ── Class-string extraction ────────────────────────────────────────────

/**
 * Pull every className value out of a TSX source: className="…",
 * className={'…'}, className={`…`} (interpolations stripped). Returns
 * { value, line } pairs.
 */
export function extractClassStrings(source) {
  const found = [];
  const re =
    /className=(?:"([^"]*)"|\{\s*"([^"]*)"\s*\}|\{\s*'([^']*)'\s*\}|\{\s*`([^`]*)`\s*\})/g;
  for (const m of source.matchAll(re)) {
    const raw = m[1] ?? m[2] ?? m[3] ?? m[4] ?? "";
    const value = raw.replace(/\$\{[^}]*\}/g, " ");
    const line = source.slice(0, m.index).split("\n").length;
    found.push({ value, line });
  }
  return found;
}

/** Strip variant prefixes (`hover:`, `md:`, …) so rules see base tokens. */
function baseTokens(classString) {
  return classString
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.slice(t.lastIndexOf(":") + 1));
}

/** Run all rules over one class string → array of { rule, canon, message }. */
export function checkClassString(classString) {
  const tokens = baseTokens(classString);
  const hits = [];
  for (const rule of RULES) {
    for (const message of rule.check(tokens, classString)) {
      hits.push({ rule: rule.id, canon: rule.canon, message });
    }
  }
  return hits;
}

/** Check one file's source → array of { file, line, rule, canon, message }. */
export function checkSource(source, file) {
  return extractClassStrings(source).flatMap(({ value, line }) =>
    checkClassString(value).map((h) => ({ file, line, ...h })),
  );
}

// ── File discovery ─────────────────────────────────────────────────────

const CHECKED_ROOTS = ["app", "src"];

function isCheckable(relPath) {
  const p = relPath.split(sep).join("/");
  return (
    p.endsWith(".tsx") &&
    CHECKED_ROOTS.some((r) => p === r || p.startsWith(`${r}/`))
  );
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      out.push(...walk(full));
    } else if (name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

function stagedFiles() {
  const out = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
    { cwd: ROOT, encoding: "utf8" },
  );
  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((p) => isCheckable(p))
    .map((p) => resolve(ROOT, p));
}

// ── Main ───────────────────────────────────────────────────────────────

function main(argv) {
  let files;
  if (argv[0] === "--staged") {
    files = stagedFiles();
  } else if (argv[0] === "--sweep") {
    files = CHECKED_ROOTS.flatMap((r) => walk(resolve(ROOT, r)));
  } else if (argv.length > 0) {
    files = argv.map((f) => resolve(ROOT, f));
  } else {
    console.error(
      "Usage: fidelity-tripwire.mjs <file...> | --staged | --sweep",
    );
    return 2;
  }

  let total = 0;
  for (const file of files) {
    if (!existsSync(file)) {
      console.error(`✘ file not found: ${file}`);
      return 2;
    }
    const rel = relative(ROOT, file);
    const hits = checkSource(readFileSync(file, "utf8"), rel);
    for (const h of hits) {
      console.log(`✘ ${h.file}:${h.line}  [${h.rule}] ${h.message}`);
    }
    total += hits.length;
  }

  console.log(
    `tripwire: ${files.length} file(s) checked — ${total === 0 ? "clean" : `${total} drift hit(s)`}`,
  );
  return total === 0 ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
