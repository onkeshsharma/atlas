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
- Husky pre-commit: `typecheck` + `lint` + tripwire on staged `.tsx`
  under `app/` + `src/`. Never `--no-verify` without Onkesh's say-so.
- Evidence + handoffs live OUTSIDE the repo in `../notes/` (M-doc
  convention: `M<N>-manual-test.md`, `HANDOFF-M<N>.md`).
