# Atlas v2 — agent boot (pointer page)

Per master plan §7.1 this file duplicates **nothing** — process law, scope,
glossary, and design law each live in exactly one place. Read in order on
any BUILD/design session:

1. `../ATLAS-V2-MASTER-PLAN.md` — process law (§4 fresh-loop protocol,
   §5 fidelity protocol, §7 no-redundancy rules)
2. `../charters/<your-module>.md` — your charter
3. `../notes/HANDOFF-<previous-module>.md` — latest: `HANDOFF-M3.md`
4. `../intake-atlas-v2/DESIGN-CANON.md` — **design law** (§1 in full)
5. `../intake-atlas-v2/PRD.md` + `../intake-atlas-v2/CONTEXT.md` — scope +
   glossary (it is **Run**, never Job; **Today.**, never dashboard)

Repo-local facts (recorded nowhere else):

- pnpm · Next.js 16 (App Router) · Tailwind v4 · TypeScript strict.
  `AGENTS.md` + `node_modules/next/dist/docs/` cover Next 16 API changes.
- Commands: `pnpm dev` · `typecheck` · `lint` · `test` (Vitest) ·
  `test:e2e` (Playwright) · `tripwire` (canon §1 drift check).
- `design/variants/` holds the 52 vendored prototypes + `mock-data.ts`,
  **byte-identical** to `../atlas-design-gallery/src/_prototype/` — the
  canon cites them by file:line. Never edit, reformat, or lint-fix them
  (excluded from ESLint via config). Live render: `/dev-variants/<key>`,
  index at `/dev-variants/`, dev-only via `ATLAS_DEV_VARIANTS_ENABLED=1`
  in `.env.development` (never set in prod).
- `src/components/kit/` (M4) holds the 28 canon §5 primitives — barrel
  `index.ts`; gallery at `/dev-kit` (same dev-only gate). Surfaces
  compose from the kit; never define local variants of its primitives
  (master plan §7.3).
- Playwright's webServer (port 3100) builds into `.next-e2e` via
  `ATLAS_E2E_DISTDIR` so it can run beside a normal `pnpm dev` on :3000
  (Next 16 per-distDir dev lock).
- Husky pre-commit: `typecheck` + `lint` + tripwire on staged `.tsx`
  under `app/` + `src/`. Never `--no-verify` without Onkesh's say-so.
- Auth + DB (M5): `requireUser/requireOwner/requireCollaborator` from
  `src/domain/auth/guard.ts` guard every authed surface; `db` from
  `src/db/client.ts` (neon-http — NO interactive transactions; write
  multi-step mutations as conditional UPDATEs + idempotent INSERTs).
  proxy.ts guards GET/HEAD only — @neondatabase/auth 0.4.2-beta's
  middleware proxies get-session upstream with the original method, so
  action POSTs would bounce; actions must call domain guards themselves.
- Turbopack JSX drops the leading space of a multi-line text chunk that
  follows an inline `{expression}` — use the variants' `{" "}` idiom
  around inline names (diagnosed M5, 2026-06-11).
- If a running dev server throws "Parsing CSS source code failed" on
  `globals.css` with `�` chars while files on disk are clean UTF-8:
  Tailwind's watcher scanned a file mid-write (happens when a module
  agent writes while the Owner's server is hot) and cached the truncated
  candidate. Cure: stop the server, delete `.next`, restart.
  (Diagnosed 2026-06-11 post-M4.)
- Live data (M6): the cockpit is live through ONE seam —
  `src/domain/live/` + `GET /api/live` (SSE over the `feed_events`
  bigserial cursor; ADR `docs/adr/0001-live-transport.md`). **Outbox
  rule:** any Run mutation goes through `applyRunTransition`
  (`src/domain/run/transitions.ts`) or another single-statement
  update+`feed_events` writer — a state flip that skips the outbox is
  invisible to every open browser. Pages mount
  `<LiveRefresh since={await latestCursor()} />` to stay live.
- `pnpm db:seed` reseeds the demo rows (idempotent; all marked
  `seeded=true` — honest data and demo data stay distinguishable).
- e2e (M6): `workers: 1` is required — specs share one real Neon DB and
  the one-Owner unique index, so spec files must not interleave. Never
  `waitUntil: "networkidle"` on authed pages (the SSE stream never
  settles). Next 16's `<nextjs-portal>` dev indicator intercepts
  pointer events bottom-left — hide it before hovering the sidebar
  user mark (see `hideDevOverlay`, `e2e/m6-cockpit.spec.ts`).
- Evidence + handoffs live OUTSIDE the repo in `../notes/` (M-doc
  convention: `M<N>-manual-test.md`, `HANDOFF-M<N>.md`).
