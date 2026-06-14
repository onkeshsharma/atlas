import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

// M5 — specs seed/clean real-Neon rows and read ATLAS_OWNER_CODE; the
// config module loads before any spec import, beating ESM hoisting.
config({ path: ".env.local", quiet: true });

// M7+M8 integration — Onkesh claimed the one-Owner slot on main, so the
// owner-bootstrap specs run against the dedicated `e2e` Neon branch
// (M5 flag: "give e2e its own Neon branch"). Mutating process.env HERE
// covers both the spec workers (src/db/client + domain imports resolve
// after this config) and the webServer (explicit env below). Auth is
// branch-scoped, so the base URL must switch with the DB.
if (process.env.ATLAS_E2E_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.ATLAS_E2E_DATABASE_URL;
}
if (process.env.ATLAS_E2E_NEON_AUTH_BASE_URL) {
  process.env.NEON_AUTH_BASE_URL = process.env.ATLAS_E2E_NEON_AUTH_BASE_URL;
}

// Parallel module worktrees (M7/M8) each run their own e2e server —
// ATLAS_E2E_PORT keeps them off each other's (and the default) port.
const E2E_PORT = Number(process.env.ATLAS_E2E_PORT ?? 3100);

// M13 — the notifier cron route is CRON_SECRET-authed; give the suite a
// deterministic secret (spec + webServer share it) unless one is set.
process.env.CRON_SECRET ??= "e2e-cron-secret";

// 1440 is the canonical design viewport (master plan §5).
export default defineConfig({
  // M16 consecutive-run fix: sweep accumulated neon_auth rows for E2E
  // addresses before every suite run (see e2e/global-setup.ts).
  globalSetup: "./e2e/global-setup.ts",
  testDir: "e2e",
  timeout: 120_000,
  // M6 — specs share ONE real Neon DB and the one-Owner invariant
  // (memberships_one_owner): pre-auth + m6-cockpit both bootstrap an
  // E2E Owner and self-clean, so spec files must never interleave.
  workers: 1,
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    // ATLAS_E2E_DISTDIR sandboxes the dev build output so this second
    // dev server doesn't trip Next 16's per-distDir lock when the
    // Owner's `pnpm dev` is already running on :3000 (see next.config.ts).
    command: `pnpm dev --port ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Explicit DATABASE_URL/NEON_AUTH_BASE_URL so the e2e-branch override
    // above reaches the dev server even though `next dev` also loads
    // .env.local (real env vars beat Next's dotenv loader).
    env: {
      // Integration round 2 (2026-06-12): Next 16's dev worker checks heap
      // AFTER EVERY REQUEST and process.exit()s for a self-restart when
      // used heap crosses 80% of the V8 limit
      // (next/dist/server/lib/start-server.js — UNCONDITIONAL in dev;
      // __NEXT_DISABLE_MEMORY_WATCHER only gates the config-file watcher).
      // The navigation in flight at that moment is orphaned, so page.goto
      // hangs at "load" until the test timeout. Next defaults the worker
      // to 50% of RAM (next-dev.js) unless NODE_OPTIONS already carries
      // max-old-space-size; the 68-spec suite's dev heap grows past that
      // default's 80% line late in the run (reproduced: m7 ingest ×2,
      // m8 /board, m10 /settings/bridges — whichever goto is in flight;
      // a 6144 trial lowered the limit and tripped EARLIER, confirming the
      // mechanism). 12288 puts the threshold at ~9.8GB, ~3GB above the
      // observed peak, and keeps the watcher as a genuine-OOM backstop.
      // M-SHIP: the durable fix is a prod-build e2e server or a split
      // suite — this dial only buys headroom as the route graph grows.
      NODE_OPTIONS: "--max-old-space-size=12288",
      // Overridable like ATLAS_E2E_PORT — two concurrent suite runs need
      // disjoint distDirs (Next 16 per-distDir dev lock) as well as ports.
      ATLAS_E2E_DISTDIR: process.env.ATLAS_E2E_DISTDIR ?? ".next-e2e",
      CRON_SECRET: process.env.CRON_SECRET,
      // ADR-0006 §4 — Athena's LLM seam is faked in e2e (deterministic,
      // never spends real tokens — the engine's fake-only wall extends to
      // the delegate). The AFK sweep then auto-answers via the stub.
      ATLAS_ATHENA_FAKE: "1",
      ...(process.env.DATABASE_URL
        ? { DATABASE_URL: process.env.DATABASE_URL }
        : {}),
      ...(process.env.NEON_AUTH_BASE_URL
        ? { NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL }
        : {}),
    },
  },
});
